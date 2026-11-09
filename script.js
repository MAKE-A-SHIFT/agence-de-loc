/* ==========================================================================
   G&L MOTORS - Interactive Logic & Real Bolt Moto Asunción Earnings Estimator
   ========================================================================== */

const WHATSAPP_NUMBER = "595995620416";

// Currency Configuration (anchored on our official 50.000 Gs/day rate)
const CURRENCIES = {
  PYG: {
    code: "PYG",
    symbol: "₲",
    flag: "🇵🇾",
    name: "Guaraní",
    rateFromPyg: 1,
    symbolPos: "before",
    sep: ".",
    daily: "₲50.000",
    weekly: "₲350.000",
    monthly: "₲1.500.000",
    pygDaily: "50.000 Gs / jour",
    pygWeekly: "~₲50.000/jour",
    pygMonthly: "~₲50.000/jour"
  },
  USD: {
    code: "USD",
    symbol: "$",
    flag: "🇺🇸",
    name: "US Dollar",
    rateFromPyg: 1 / 7150,
    symbolPos: "before",
    sep: ",",
    daily: "$7",
    weekly: "$49",
    monthly: "$210",
    pygDaily: "₲50.000",
    pygWeekly: "₲350.000 (~$7/j)",
    pygMonthly: "₲1.500.000 (~$7/j)"
  },
  EUR: {
    code: "EUR",
    symbol: "€",
    flag: "🇪🇺",
    name: "Euro",
    rateFromPyg: 1 / 7800,
    symbolPos: "after",
    sep: ".",
    daily: "6€",
    weekly: "45€",
    monthly: "190€",
    pygDaily: "₲50.000",
    pygWeekly: "₲350.000 (~6€/j)",
    pygMonthly: "₲1.500.000 (~6€/j)"
  },
  BRL: {
    code: "BRL",
    symbol: "R$",
    flag: "🇧🇷",
    name: "Real",
    rateFromPyg: 1 / 1315,
    symbolPos: "before",
    sep: ".",
    daily: "R$38",
    weekly: "R$265",
    monthly: "R$1.140",
    pygDaily: "₲50.000",
    pygWeekly: "₲350.000 (~R$38/j)",
    pygMonthly: "₲1.500.000 (~R$38/j)"
  },
  ARS: {
    code: "ARS",
    symbol: "$",
    flag: "🇦🇷",
    name: "Peso Argentino",
    rateFromPyg: 190 / 1000,
    symbolPos: "before",
    sep: ".",
    daily: "$9.500",
    weekly: "$66.500",
    monthly: "$285.000",
    pygDaily: "₲50.000",
    pygWeekly: "₲350.000 (~$9.500/j)",
    pygMonthly: "₲1.500.000 (~$9.500/j)"
  }
};

const LANGUAGES = {
  fr: { flag: "🇫🇷", code: "FR", name: "Français" },
  es: { flag: "🇵🇾", code: "ES", name: "Español" },
  castillano: { flag: "🇦🇷", code: "AR", name: "Castellano" },
  guarani: { flag: "🇵🇾", code: "GN", name: "Guaraní" },
  en: { flag: "🇬🇧", code: "EN", name: "English" },
  pt: { flag: "🇧🇷", code: "PT", name: "Português" },
  de: { flag: "🇩🇪", code: "DE", name: "Deutsch" },
  it: { flag: "🇮🇹", code: "IT", name: "Italiano" }
};

const ORIGINAL_REVIEWS = {
  1: "We booked this bike at the very last minute and everything went super smoothly. The team at G&L MOTORS really went out of their way to help us set up Bolt for free and 2 hours later we were already riding.",
  2: "No pensé que fuera tan sencillo alquilar una 150cc en Areguá. A 50.000 Gs por día con mantenimiento incluido en su propio taller G&L MOTORS, es imbatible para moverse sin estrés.",
  3: "Great experience riding between Areguá and Asunción, especially during rush hour. Good Honda CG motorcycle, great mechanical service. Just take it easy and it's super convenient daily.",
  4: "I speak English and Spanish, the staff is very friendly and the motorcycle is in great condition. If you message them on WhatsApp with your arrival time at Cacique Areguá, they are ready on time!"
};

let currentLang = localStorage.getItem("gl_lang") || "fr";
let currentCurrency = localStorage.getItem("gl_currency") || "PYG";
let selectedShareIndex = 0;
const reviewShowingOriginal = { 1: false, 2: false, 3: false, 4: false };

// Bolt Estimator State (Real Asunción Market Data)
let estimatorHours = 8; // default 8h/day
let estimatorDays = 6;  // default 6 days/week
let estimatorMode = "normal"; // 'normal' (32,500 Gs/h gross) or 'peak' (42,000 Gs/h gross)

function formatPygAmount(pygAmount, currencyCode = currentCurrency) {
  const c = CURRENCIES[currencyCode] || CURRENCIES.PYG;
  let val = pygAmount * c.rateFromPyg;
  if (currencyCode === "PYG") {
    val = Math.round(val / 1000) * 1000;
  } else if (currencyCode === "ARS") {
    val = Math.round(val / 500) * 500;
  } else {
    val = Math.round(val);
  }
  const formatted = val.toString().replace(/\B(?=(\d{3})+(?!\d))/g, c.sep);
  return c.symbolPos === "before" ? `${c.symbol} ${formatted}` : `${formatted} ${c.symbol}`;
}

// 1. Language Switching
function setLanguage(lang) {
  if (!translations[lang]) lang = "fr";
  currentLang = lang;
  localStorage.setItem("gl_lang", lang);
  document.documentElement.lang = lang === "castillano" ? "es" : lang === "guarani" ? "gn" : lang;

  const t = translations[lang];

  document.querySelectorAll("[data-i18n]").forEach((el) => {
    const key = el.getAttribute("data-i18n");
    if (t[key]) {
      if (key === "brand_story") {
        el.innerHTML = t[key];
      } else {
        el.textContent = t[key];
      }
    }
  });

  // Update navbar language badge
  const langInfo = LANGUAGES[lang] || LANGUAGES.fr;
  const flagEl = document.getElementById("current-lang-flag");
  const codeEl = document.getElementById("current-lang-code");
  if (flagEl) flagEl.textContent = langInfo.flag;
  if (codeEl) codeEl.textContent = langInfo.code;

  // Highlight active language in dropdown
  document.querySelectorAll("[data-lang-option]").forEach((btn) => {
    const isSelected = btn.getAttribute("data-lang-option") === lang;
    btn.classList.toggle("bg-gray-50", isSelected);
    btn.classList.toggle("font-semibold", isSelected);
  });

  // Reset testimonial original toggles
  [1, 2, 3, 4].forEach((id) => {
    reviewShowingOriginal[id] = false;
    const textEl = document.getElementById(`review-text-${id}`);
    const toggleBtn = document.getElementById(`review-toggle-${id}`);
    if (textEl && t[`review${id}_text`]) {
      textEl.textContent = `"${t[`review${id}_text`]}"`;
    }
    if (toggleBtn) {
      toggleBtn.textContent = t.testimonials_show_original || "Voir l'original";
    }
  });

  updateCurrencyDisplay();
  updateBoltEstimator();
}

// 2. Currency Switching
function setCurrency(code) {
  if (!CURRENCIES[code]) code = "PYG";
  currentCurrency = code;
  localStorage.setItem("gl_currency", code);
  updateCurrencyDisplay();
  updateBoltEstimator();
}

function updateCurrencyDisplay() {
  const c = CURRENCIES[currentCurrency] || CURRENCIES.PYG;
  const t = translations[currentLang] || translations.fr;
  const perDay = t.services_per_day || "/jour";

  // Update navbar currency button
  const currFlag = document.getElementById("current-currency-flag");
  const currCode = document.getElementById("current-currency-code");
  const currSymbol = document.getElementById("current-currency-symbol");
  if (currFlag) currFlag.textContent = c.flag;
  if (currCode) currCode.textContent = c.code;
  if (currSymbol) currSymbol.textContent = `(${c.symbol})`;

  // Highlight active currency in dropdown
  document.querySelectorAll("[data-currency-option]").forEach((btn) => {
    const isSelected = btn.getAttribute("data-currency-option") === currentCurrency;
    btn.classList.toggle("bg-gray-100", isSelected);
    btn.classList.toggle("font-semibold", isSelected);
  });

  // Update Hero price
  document.querySelectorAll('[data-price="hero-daily"]').forEach((el) => {
    el.textContent = `${c.daily}${perDay}`;
  });
  document.querySelectorAll('[data-price-tooltip="hero-daily"]').forEach((el) => {
    el.textContent = c.pygDaily;
  });

  // Update Services Daily / Weekly / Monthly prices & tooltips
  document.querySelectorAll('[data-price="daily"]').forEach((el) => {
    el.textContent = `${c.daily}${perDay}`;
  });
  document.querySelectorAll('[data-price-tooltip="daily"]').forEach((el) => {
    el.textContent = c.pygDaily;
  });

  document.querySelectorAll('[data-price="weekly"]').forEach((el) => {
    el.textContent = c.weekly;
  });
  document.querySelectorAll('[data-price-tooltip="weekly"]').forEach((el) => {
    el.textContent = c.pygWeekly;
  });

  document.querySelectorAll('[data-price="monthly"]').forEach((el) => {
    el.textContent = c.monthly;
  });
  document.querySelectorAll('[data-price-tooltip="monthly"]').forEach((el) => {
    el.textContent = c.pygMonthly;
  });
}

// 3. Real Asunción Bolt Moto Earnings Estimator
function setEstimatorHours(val) {
  estimatorHours = Number(val) || 8;
  const slider = document.getElementById("bolt-hours-slider");
  if (slider && Number(slider.value) !== estimatorHours) {
    slider.value = estimatorHours;
  }
  updateBoltEstimator();
}

function setEstimatorDays(days) {
  estimatorDays = Number(days) || 6;
  document.querySelectorAll("[data-est-days]").forEach((btn) => {
    const active = Number(btn.getAttribute("data-est-days")) === estimatorDays;
    btn.classList.toggle("bg-[#34D186]", active);
    btn.classList.toggle("text-black", active);
    btn.classList.toggle("border-[#34D186]", active);
    btn.classList.toggle("bg-neutral-800", !active);
    btn.classList.toggle("text-neutral-300", !active);
    btn.classList.toggle("border-neutral-700", !active);
  });
  updateBoltEstimator();
}

function setEstimatorMode(mode) {
  estimatorMode = mode === "peak" ? "peak" : "normal";
  document.querySelectorAll("[data-est-mode]").forEach((btn) => {
    const active = btn.getAttribute("data-est-mode") === estimatorMode;
    btn.classList.toggle("bg-[#34D186]", active);
    btn.classList.toggle("text-black", active);
    btn.classList.toggle("border-[#34D186]", active);
    btn.classList.toggle("bg-neutral-800", !active);
    btn.classList.toggle("text-neutral-300", !active);
    btn.classList.toggle("border-neutral-700", !active);
  });
  updateBoltEstimator();
}

function updateBoltEstimator() {
  // Real Asunción Bolt Moto parameters:
  // - Normal hours gross avg: 32,500 Gs/h (midpoint of 25,000 - 40,000 Gs/h)
  // - With peak/dynamic hours gross avg: 42,000 Gs/h (blended with 50,000 - 60,000 Gs/h peak)
  // - Bolt platform fee in Paraguay: ~17% (midpoint of 15% - 20%)
  // - 150cc fuel (nafta) in urban traffic: ~3,000 Gs/hour
  // - G&L MOTORS daily rental: 50,000 Gs/day (maintenance = 0 Gs)
  const grossPerHourPyg = estimatorMode === "peak" ? 42000 : 32500;
  const grossDayPyg = estimatorHours * grossPerHourPyg;
  const boltCommissionPyg = Math.round(grossDayPyg * 0.17);
  const fuelDayPyg = estimatorHours * 3000;
  const rentalDayPyg = 50000;
  const totalDeductionsPyg = boltCommissionPyg + fuelDayPyg + rentalDayPyg;

  const netDayPyg = Math.max(0, grossDayPyg - totalDeductionsPyg);
  const netWeekPyg = netDayPyg * estimatorDays;
  const netMonthPyg = Math.round((netWeekPyg * 4.33) / 5000) * 5000;

  const hoursValEl = document.getElementById("est-hours-value");
  const grossDayEl = document.getElementById("est-gross-day");
  const deductionsDayEl = document.getElementById("est-deductions-day");
  const netDayEl = document.getElementById("est-net-day");
  const netWeekEl = document.getElementById("est-net-week");
  const netMonthEl = document.getElementById("est-net-month");
  const netMonthPygSub = document.getElementById("est-net-month-pyg-sub");

  if (hoursValEl) hoursValEl.textContent = estimatorHours;
  if (grossDayEl) grossDayEl.textContent = formatPygAmount(grossDayPyg);
  if (deductionsDayEl) deductionsDayEl.textContent = `- ${formatPygAmount(totalDeductionsPyg)}`;
  if (netDayEl) netDayEl.textContent = formatPygAmount(netDayPyg);
  if (netWeekEl) netWeekEl.textContent = formatPygAmount(netWeekPyg);
  if (netMonthEl) netMonthEl.textContent = formatPygAmount(netMonthPyg);

  if (netMonthPygSub) {
    if (currentCurrency !== "PYG") {
      netMonthPygSub.textContent = `(${formatPygAmount(netMonthPyg, "PYG")})`;
      netMonthPygSub.classList.remove("hidden");
    } else {
      netMonthPygSub.classList.add("hidden");
    }
  }
}

// 4. Scroll-Aware Navbar & Parallax Animations
function handleScroll() {
  const scrollY = window.scrollY;
  const vh = window.innerHeight;
  const pastHero = scrollY > vh * 0.8;

  const navPills = document.querySelectorAll(".nav-adaptive-pill");
  const navBookBtns = document.querySelectorAll(".nav-adaptive-cta");

  navPills.forEach((pill) => {
    if (pastHero) {
      pill.classList.remove("border-white/40", "text-white", "hover:bg-white/10", "hover:border-white/70");
      pill.classList.add("border-gray-300", "text-gray-900", "bg-white/90", "hover:bg-gray-100", "hover:border-gray-500", "shadow-sm");
    } else {
      pill.classList.add("border-white/40", "text-white", "hover:bg-white/10", "hover:border-white/70");
      pill.classList.remove("border-gray-300", "text-gray-900", "bg-white/90", "hover:bg-gray-100", "hover:border-gray-500", "shadow-sm");
    }
  });

  navBookBtns.forEach((btn) => {
    if (pastHero) {
      btn.classList.remove("bg-white", "text-black", "hover:bg-gray-100");
      btn.classList.add("bg-black", "text-white", "hover:bg-gray-800", "shadow-md");
    } else {
      btn.classList.add("bg-white", "text-black", "hover:bg-gray-100");
      btn.classList.remove("bg-black", "text-white", "hover:bg-gray-800", "shadow-md");
    }
  });

  // Hero Parallax
  const heroBg = document.getElementById("hero-parallax-bg");
  if (heroBg && scrollY < vh * 1.2) {
    heroBg.style.transform = `translate3d(0, ${scrollY * 0.35}px, 0)`;
  }

  // Flying Scooter Animation across viewport on scroll
  const flyingScooter = document.getElementById("flying-scooter");
  if (flyingScooter) {
    const docHeight = Math.max(document.body.scrollHeight - vh, 1);
    const progress = Math.min(Math.max(scrollY / docHeight, 0), 1);
    const xPos = progress * (window.innerWidth + 300);
    const rot = Math.sin(progress * Math.PI * 4) * 5;
    flyingScooter.style.transform = `translate3d(${xPos}px, 0, 0) rotate(${rot}deg)`;
  }

  // Scooter Showcase Subtle Parallax
  document.querySelectorAll("[data-scooter-card]").forEach((card, idx) => {
    const rect = card.getBoundingClientRect();
    if (rect.top < vh && rect.bottom > 0) {
      const centerOffset = (vh / 2 - (rect.top + rect.height / 2)) / vh;
      const dir = idx % 2 === 0 ? 1 : -1;
      const shiftX = centerOffset * 18 * dir;
      const rot = centerOffset * 2.5 * dir;
      card.style.transform = `translate3d(${shiftX}px, 0, 0) rotate(${rot}deg)`;
    }
  });

  // About / Bolt Image Parallax
  const aboutImg = document.getElementById("about-parallax-img");
  if (aboutImg) {
    const rect = aboutImg.getBoundingClientRect();
    if (rect.top < vh && rect.bottom > 0) {
      const offset = ((vh - rect.top) / (vh + rect.height) - 0.5) * 24;
      aboutImg.style.transform = `translate3d(0, ${offset}px, 0)`;
    }
  }
}

// 5. Video Sound Toggle
function toggleVideoSound() {
  const video = document.getElementById("showcase-video");
  const mutedIcon = document.getElementById("video-icon-muted");
  const unmutedIcon = document.getElementById("video-icon-unmuted");
  const label = document.getElementById("video-sound-label");
  if (!video) return;

  video.muted = !video.muted;
  if (video.muted) {
    mutedIcon?.classList.remove("hidden");
    unmutedIcon?.classList.add("hidden");
    label?.classList.remove("hidden");
  } else {
    mutedIcon?.classList.add("hidden");
    unmutedIcon?.classList.remove("hidden");
    label?.classList.add("hidden");
  }
}

// 6. Testimonials Original / Translation Toggle
function toggleReviewOriginal(id) {
  const t = translations[currentLang] || translations.fr;
  const textEl = document.getElementById(`review-text-${id}`);
  const toggleBtn = document.getElementById(`review-toggle-${id}`);
  if (!textEl || !toggleBtn) return;

  reviewShowingOriginal[id] = !reviewShowingOriginal[id];
  if (reviewShowingOriginal[id]) {
    textEl.textContent = `"${ORIGINAL_REVIEWS[id]}"`;
    toggleBtn.textContent = t.testimonials_show_translation || "Voir la traduction";
  } else {
    textEl.textContent = `"${t[`review${id}_text`]}"`;
    toggleBtn.textContent = t.testimonials_show_original || "Voir l'original";
  }
}

// 7. Social Share Actions
function selectShareMessage(index) {
  selectedShareIndex = index;
  document.querySelectorAll("[data-share-option]").forEach((label, idx) => {
    if (idx === index) {
      label.classList.remove("border-gray-200", "bg-white", "text-gray-700");
      label.classList.add("border-black", "bg-black", "text-white");
    } else {
      label.classList.add("border-gray-200", "bg-white", "text-gray-700");
      label.classList.remove("border-black", "bg-black", "text-white");
    }
  });
}

function getSelectedShareText() {
  const t = translations[currentLang] || translations.fr;
  const msgs = [t.social_msg1, t.social_msg2, t.social_msg3];
  const msg = msgs[selectedShareIndex] || msgs[0];
  return `${msg} https://agence-de-loc.vercel.app`;
}

function shareOnWhatsApp() {
  const text = encodeURIComponent(getSelectedShareText());
  window.open(`https://wa.me/?text=${text}`, "_blank", "noopener,noreferrer");
}

async function shareNativeOrCopy() {
  const t = translations[currentLang] || translations.fr;
  const text = getSelectedShareText();
  const btnText = document.getElementById("share-copy-label");

  if (navigator.share) {
    try {
      await navigator.share({
        title: "G&L MOTORS - Location de Motos",
        text: text,
        url: window.location.href
      });
      return;
    } catch (_) {}
  }

  try {
    await navigator.clipboard.writeText(text);
    if (btnText) {
      const original = btnText.textContent;
      btnText.textContent = t.social_copied || "Lien copié !";
      setTimeout(() => {
        btnText.textContent = original;
      }, 2200);
    }
  } catch (_) {}
}

// 8. FAQ Accordion
function toggleFaq(index) {
  const items = document.querySelectorAll(".faq-item");
  items.forEach((item, idx) => {
    const btn = item.querySelector(".faq-trigger");
    if (idx === index) {
      const isOpen = item.classList.toggle("open");
      btn?.setAttribute("aria-expanded", isOpen ? "true" : "false");
    } else {
      item.classList.remove("open");
      btn?.setAttribute("aria-expanded", "false");
    }
  });
}

// 9. Booking Modal
function openBookingModal(defaultBike = "", precheckBolt = false) {
  const modal = document.getElementById("booking-modal");
  const bikeSelect = document.getElementById("booking-bike-select");
  const dateInput = document.getElementById("booking-date-input");
  const boltCheck = document.getElementById("booking-bolt-checkbox");

  if (bikeSelect && defaultBike) {
    bikeSelect.value = defaultBike;
  }
  if (boltCheck && precheckBolt) {
    boltCheck.checked = true;
  }
  if (dateInput && !dateInput.value) {
    const today = new Date().toISOString().split("T")[0];
    dateInput.value = today;
    dateInput.min = today;
  }

  modal?.classList.add("active");
  document.body.style.overflow = "hidden";
}

function closeBookingModal() {
  const modal = document.getElementById("booking-modal");
  modal?.classList.remove("active");
  document.body.style.overflow = "";
}

function submitBookingModal(e) {
  e.preventDefault();
  const bike = document.getElementById("booking-bike-select")?.value || "Honda CG 150";
  const plan = document.getElementById("booking-plan-select")?.value || "Journalier (50.000 Gs/jour)";
  const date = document.getElementById("booking-date-input")?.value || "Aujourd'hui";
  const needBolt = document.getElementById("booking-bolt-checkbox")?.checked;

  let message = `Bonjour G&L MOTORS ! 🏍️\nJe souhaite réserver une moto :\n• Modèle : ${bike}\n• Formule : ${plan}\n• Date de retrait : ${date}`;
  if (needBolt) {
    message += `\n• Option Bolt : Je souhaite obtenir mon compte chauffeur Bolt GRATUITEMENT avec la moto.`;
  }

  const url = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
  window.open(url, "_blank", "noopener,noreferrer");
  closeBookingModal();
}

// 10. Initialization & Event Listeners
document.addEventListener("DOMContentLoaded", () => {
  const currBtn = document.getElementById("currency-menu-btn");
  const currDropdown = document.getElementById("currency-dropdown");
  const langBtn = document.getElementById("lang-menu-btn");
  const langDropdown = document.getElementById("lang-dropdown");
  const mobileMenuBtn = document.getElementById("mobile-menu-btn");
  const mobileMenu = document.getElementById("mobile-menu");

  currBtn?.addEventListener("click", (e) => {
    e.stopPropagation();
    currDropdown?.classList.toggle("hidden");
    langDropdown?.classList.add("hidden");
    mobileMenu?.classList.add("hidden");
  });

  langBtn?.addEventListener("click", (e) => {
    e.stopPropagation();
    langDropdown?.classList.toggle("hidden");
    currDropdown?.classList.add("hidden");
    mobileMenu?.classList.add("hidden");
  });

  mobileMenuBtn?.addEventListener("click", (e) => {
    e.stopPropagation();
    mobileMenu?.classList.toggle("hidden");
    currDropdown?.classList.add("hidden");
    langDropdown?.classList.add("hidden");
  });

  document.addEventListener("click", () => {
    currDropdown?.classList.add("hidden");
    langDropdown?.classList.add("hidden");
    mobileMenu?.classList.add("hidden");
  });

  document.querySelectorAll("#mobile-menu a").forEach((link) => {
    link.addEventListener("click", () => {
      mobileMenu?.classList.add("hidden");
    });
  });

  setLanguage(currentLang);
  setCurrency(currentCurrency);
  updateBoltEstimator();

  window.addEventListener("scroll", handleScroll, { passive: true });
  handleScroll();
});
