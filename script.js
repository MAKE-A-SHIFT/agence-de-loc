/* ==========================================================================
   GORDO TALLER - Interactive Logic (Cloned from andaway.com.py/fr)
   ========================================================================== */

const WHATSAPP_NUMBER = "595995620416";

// Currency Configuration (anchored on our official 50.000 Gs/day rate)
const CURRENCIES = {
  PYG: {
    code: "PYG",
    symbol: "₲",
    flag: "🇵🇾",
    name: "Guaraní",
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
  1: "We booked this bike at the very last minute and everything went super smoothly. The owner at Gordo Taller really went out of his way to help us set up Bolt and 2 hours later we were already riding.",
  2: "No pensé que fuera tan sencillo alquilar una 150cc en Areguá. A 50.000 Gs por día con mantenimiento incluido en su propio taller, es imbatible para moverse sin estrés.",
  3: "Great experience riding between Areguá and Asunción, especially during rush hour. Good Honda CG motorcycle, great mechanical service. Just take it easy and it's super convenient daily.",
  4: "I speak English and Spanish, the staff is very friendly and the motorcycle is in great condition. If you message them on WhatsApp with your arrival time at Cacique Areguá, they are ready on time!"
};

let currentLang = localStorage.getItem("gordo_lang") || "fr";
let currentCurrency = localStorage.getItem("gordo_currency") || "PYG";
let selectedShareIndex = 0;
const reviewShowingOriginal = { 1: false, 2: false, 3: false, 4: false };

// 1. Language Switching
function setLanguage(lang) {
  if (!translations[lang]) lang = "fr";
  currentLang = lang;
  localStorage.setItem("gordo_lang", lang);
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
}

// 2. Currency Switching
function setCurrency(code) {
  if (!CURRENCIES[code]) code = "PYG";
  currentCurrency = code;
  localStorage.setItem("gordo_currency", code);
  updateCurrencyDisplay();
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

// 3. Scroll-Aware Navbar & Parallax Animations
function handleScroll() {
  const scrollY = window.scrollY;
  const vh = window.innerHeight;
  const pastHero = scrollY > vh * 0.8;

  // Update Navbar theme (matches Andaway useScrolledPastHero)
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

  // About Image Parallax
  const aboutImg = document.getElementById("about-parallax-img");
  if (aboutImg) {
    const rect = aboutImg.getBoundingClientRect();
    if (rect.top < vh && rect.bottom > 0) {
      const offset = ((vh - rect.top) / (vh + rect.height) - 0.5) * 36;
      aboutImg.style.transform = `translate3d(0, ${offset}px, 0)`;
    }
  }
}

// 4. Video Sound Toggle
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

// 5. Testimonials Original / Translation Toggle
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

// 6. Social Share Actions
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
        title: "Gordo Taller - Location de Motos",
        text: text,
        url: window.location.href
      });
      return;
    } catch (_) {
      // Fallback to clipboard
    }
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

// 7. FAQ Accordion
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

// 8. Booking Modal
function openBookingModal(defaultBike = "") {
  const modal = document.getElementById("booking-modal");
  const bikeSelect = document.getElementById("booking-bike-select");
  const dateInput = document.getElementById("booking-date-input");

  if (bikeSelect && defaultBike) {
    bikeSelect.value = defaultBike;
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

  let message = `Bonjour Gordo Taller ! 🏍️\nJe souhaite réserver une moto :\n• Modèle : ${bike}\n• Formule : ${plan}\n• Date de retrait : ${date}`;
  if (needBolt) {
    message += `\n• Option : J'aimerais aussi créer mon compte chauffeur Bolt avec vous.`;
  }

  const url = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
  window.open(url, "_blank", "noopener,noreferrer");
  closeBookingModal();
}

// 9. Initialization & Event Listeners
document.addEventListener("DOMContentLoaded", () => {
  // Dropdown toggles (Currency, Language, Mobile Menu)
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

  // Close mobile menu when clicking a nav link
  document.querySelectorAll("#mobile-menu a").forEach((link) => {
    link.addEventListener("click", () => {
      mobileMenu?.classList.add("hidden");
    });
  });

  // Initialize language & currency
  setLanguage(currentLang);
  setCurrency(currentCurrency);

  // Scroll listener
  window.addEventListener("scroll", handleScroll, { passive: true });
  handleScroll();
});
