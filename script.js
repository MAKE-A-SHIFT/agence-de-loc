/* ==========================================================================
   G&L MOTORS - Multi-Currency (50k / 350k / 1.4M PYG), Bolt Estimator & Checkout
   ========================================================================== */

const WHATSAPP_NUMBER = "595995620416";

// Official Base Rates in Paraguayan Guaraníes (PYG)
const BASE_PRICES_PYG = {
  daily: 50000,
  weekly: 350000,
  monthly: 1400000,
  monthlyEffectiveDaily: 46600 // 1,400,000 / 30 days
};

// Currency Configuration (dynamically converts 50k / 350k / 1,400,000 PYG)
const CURRENCIES = {
  PYG: {
    code: "PYG",
    symbol: "₲",
    flag: "🇵🇾",
    name: "Guaraní",
    rateFromPyg: 1,
    symbolPos: "before",
    sep: ".",
    roundStep: 1000
  },
  USD: {
    code: "USD",
    symbol: "$",
    flag: "🇺🇸",
    name: "US Dollar",
    rateFromPyg: 1 / 7150, // 50k -> $7, 350k -> $49, 1.4M -> $196
    symbolPos: "before",
    sep: ",",
    roundStep: 1
  },
  EUR: {
    code: "EUR",
    symbol: "€",
    flag: "🇪🇺",
    name: "Euro",
    rateFromPyg: 1 / 7800, // 50k -> 6€, 350k -> 45€, 1.4M -> 179€
    symbolPos: "after",
    sep: ".",
    roundStep: 1
  },
  BRL: {
    code: "BRL",
    symbol: "R$",
    flag: "🇧🇷",
    name: "Real",
    rateFromPyg: 1 / 1315, // 50k -> R$38, 350k -> R$266, 1.4M -> R$1.065
    symbolPos: "before",
    sep: ".",
    roundStep: 1
  },
  ARS: {
    code: "ARS",
    symbol: "$",
    flag: "🇦🇷",
    name: "Peso Argentino",
    rateFromPyg: 190 / 1000, // 50k -> $9.500, 350k -> $66.500, 1.4M -> $266.000
    symbolPos: "before",
    sep: ".",
    roundStep: 500
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
  1: "Alquilé la Buler Faiter Rojo 150cc (2025) a último minuto para recorrer Areguá y San Bernardino el fin de semana, todo por WhatsApp en 10 minutos. Moto impecable, cascos nuevos y pude pagar directo por transferencia SIPAP sin comisión.",
  2: "Alquilo mi Boxer Azul 150cc por mes a 1.400.000 Gs para trabajar en Bolt por Asunción. Me abrieron la cuenta de Bolt gratis el primer día y el mantenimiento de cada semana en el taller está incluido. Imposible encontrar algo más rentable.",
  3: "Awesome experience! As an expat in Asunción, being able to pay in USDT (Solana) and having a fully equipped XVR 150cc to beat rush-hour traffic changes everything. Super responsive 7/7 support.",
  4: "Gente muy seria y mecánica de primera con la Star New Desert Rojo 150cc. Ya sea que pagues en efectivo, tarjeta o transferencia bancaria, todo es transparente. Avisas por WhatsApp antes de llegar a Areguá y en 15 minutos ya salís andando."
};

// Automatic Language & Currency Detection with Defaults (Castellano & PYG)
function detectVisitorLanguage() {
  const manual = localStorage.getItem("gl_lang_manual");
  if (manual && translations[manual]) {
    return manual;
  }

  const navLangs = (navigator.languages && navigator.languages.length)
    ? navigator.languages
    : [navigator.language || navigator.userLanguage || ""];

  for (let raw of navLangs) {
    if (!raw) continue;
    const l = raw.toLowerCase().trim();
    if (l.startsWith("fr")) return "fr";
    if (l.startsWith("en")) return "en";
    if (l.startsWith("pt")) return "pt";
    if (l.startsWith("de")) return "de";
    if (l.startsWith("it")) return "it";
    if (l.startsWith("gn") || l.startsWith("gug")) return "guarani";
    if (l.startsWith("es")) {
      if (l === "es-es") return "es";
      return "castillano";
    }
  }

  return "castillano"; // Default fallback
}

function detectVisitorCurrency() {
  const manual = localStorage.getItem("gl_currency_manual");
  if (manual && CURRENCIES[manual]) {
    return manual;
  }

  let tz = "";
  try {
    tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "";
  } catch (_) {}

  const navLang = (navigator.language || navigator.userLanguage || "").toLowerCase().trim();

  // 1. Argentina -> ARS
  if (tz.includes("Argentina") || tz.includes("Buenos_Aires") || navLang === "es-ar") {
    return "ARS";
  }

  // 2. Brazil -> BRL
  if (
    tz.includes("Sao_Paulo") ||
    tz.includes("Fortaleza") ||
    tz.includes("Recife") ||
    tz.includes("Manaus") ||
    tz.includes("Belem") ||
    tz.includes("Cuiaba") ||
    tz.includes("Porto_Velho") ||
    navLang.startsWith("pt-br")
  ) {
    return "BRL";
  }

  // 3. Eurozone -> EUR
  if (
    tz.startsWith("Europe/") &&
    !tz.includes("London") &&
    !tz.includes("Zurich") &&
    !tz.includes("Moscow") &&
    !tz.includes("Kiev") &&
    !tz.includes("Istanbul")
  ) {
    return "EUR";
  }

  // 4. USA / Expat -> USD
  if (
    (tz.startsWith("America/") &&
      (tz.includes("New_York") ||
        tz.includes("Chicago") ||
        tz.includes("Los_Angeles") ||
        tz.includes("Denver") ||
        tz.includes("Phoenix") ||
        tz.includes("Detroit") ||
        tz.includes("Anchorage") ||
        tz.includes("Honolulu"))) ||
    navLang === "en-us"
  ) {
    return "USD";
  }

  // 5. Paraguay & Default -> PYG
  return "PYG";
}

let currentLang = detectVisitorLanguage();
let currentCurrency = detectVisitorCurrency();
let selectedShareIndex = 0;
const reviewShowingOriginal = { 1: false, 2: false, 3: false, 4: false };

// Bolt Estimator State (Real Asunción Market Data)
let estimatorHours = 8;
let estimatorDays = 6;
let estimatorMode = "normal";

function formatPygAmount(pygAmount, currencyCode = currentCurrency, compact = false) {
  const c = CURRENCIES[currencyCode] || CURRENCIES.PYG;
  let val = pygAmount * c.rateFromPyg;
  if (c.roundStep >= 500) {
    val = Math.round(val / c.roundStep) * c.roundStep;
  } else {
    val = Math.round(val);
  }
  const formatted = val.toString().replace(/\B(?=(\d{3})+(?!\d))/g, c.sep);
  const space = compact ? "" : " ";
  return c.symbolPos === "before" ? `${c.symbol}${space}${formatted}` : `${formatted}${space}${c.symbol}`;
}

// 1. Language Switching
function setLanguage(lang, isManual = false) {
  if (!translations[lang]) lang = "castillano";
  currentLang = lang;
  localStorage.setItem("gl_lang", lang);
  if (isManual) {
    localStorage.setItem("gl_lang_manual", lang);
  }
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
  const langInfo = LANGUAGES[lang] || LANGUAGES.castillano;
  const flagEl = document.getElementById("current-lang-flag");
  const codeEl = document.getElementById("current-lang-code");
  if (flagEl) flagEl.textContent = langInfo.flag;
  if (codeEl) codeEl.textContent = langInfo.code;

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
  updatePaymentProcessorNote();
}

// 2. Currency Switching (adapts 50k / 350k / 1.4M PYG across the entire site)
function setCurrency(code, isManual = false) {
  if (!CURRENCIES[code]) code = "PYG";
  currentCurrency = code;
  localStorage.setItem("gl_currency", code);
  if (isManual) {
    localStorage.setItem("gl_currency_manual", code);
  }
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

  document.querySelectorAll("[data-currency-option]").forEach((btn) => {
    const isSelected = btn.getAttribute("data-currency-option") === currentCurrency;
    btn.classList.toggle("bg-gray-100", isSelected);
    btn.classList.toggle("font-semibold", isSelected);
  });

  // Formatted strings in active currency
  const dailyMain = formatPygAmount(BASE_PRICES_PYG.daily, currentCurrency, true);
  const weeklyMain = formatPygAmount(BASE_PRICES_PYG.weekly, currentCurrency, true);
  const monthlyMain = formatPygAmount(BASE_PRICES_PYG.monthly, currentCurrency, true);
  const monthlyEffMain = formatPygAmount(BASE_PRICES_PYG.monthlyEffectiveDaily, currentCurrency, true);

  // Tooltips (always show PYG equivalent + effective daily rate)
  const dailyTooltip =
    currentCurrency === "PYG"
      ? `50.000 PYG${perDay}`
      : `₲50.000 PYG`;
  const weeklyTooltip =
    currentCurrency === "PYG"
      ? `~₲50.000${perDay}`
      : `₲350.000 (~${dailyMain}${perDay})`;
  const monthlyTooltip =
    currentCurrency === "PYG"
      ? `~₲46.600${perDay}`
      : `₲1.400.000 (~${monthlyEffMain}${perDay})`;

  // Update Hero price
  document.querySelectorAll('[data-price="hero-daily"]').forEach((el) => {
    el.textContent = `${dailyMain}${perDay}`;
  });
  document.querySelectorAll('[data-price-tooltip="hero-daily"]').forEach((el) => {
    el.textContent = dailyTooltip;
  });

  // Update Services Daily / Weekly / Monthly prices & tooltips
  document.querySelectorAll('[data-price="daily"]').forEach((el) => {
    el.textContent = `${dailyMain}${perDay}`;
  });
  document.querySelectorAll('[data-price-tooltip="daily"]').forEach((el) => {
    el.textContent = dailyTooltip;
  });

  document.querySelectorAll('[data-price="weekly"]').forEach((el) => {
    el.textContent = weeklyMain;
  });
  document.querySelectorAll('[data-price-tooltip="weekly"]').forEach((el) => {
    el.textContent = weeklyTooltip;
  });

  document.querySelectorAll('[data-price="monthly"]').forEach((el) => {
    el.textContent = monthlyMain;
  });
  document.querySelectorAll('[data-price-tooltip="monthly"]').forEach((el) => {
    el.textContent = monthlyTooltip;
  });

  if (typeof selectQrAmount === "function") selectQrAmount(currentQrPlan);
  if (typeof selectAutoDebitCycle === "function") selectAutoDebitCycle(currentAutoDebitCycle);
  if (typeof selectModalAutoDebitCycle === "function") selectModalAutoDebitCycle(modalAutoDebitCycle);

  // Update Booking Modal Plan Options dynamically with active currency
  const planSelect = document.getElementById("booking-plan-select");
  if (planSelect && planSelect.options.length >= 3) {
    const pygSuffix = currentCurrency === "PYG" ? "" : ` / 50.000 PYG`;
    const pygWeekSuffix = currentCurrency === "PYG" ? "" : ` / 350.000 PYG`;
    const pygMonthSuffix = currentCurrency === "PYG" ? "" : ` / 1.400.000 PYG`;

    planSelect.options[0].textContent = `${t.services_daily_title || "Journalier"} — ${dailyMain}${pygSuffix}`;
    planSelect.options[0].value = `Journalier (${dailyMain} / 50.000 PYG)`;

    planSelect.options[1].textContent = `${t.services_weekly_title || "Hebdomadaire"} — ${weeklyMain}${pygWeekSuffix}`;
    planSelect.options[1].value = `Hebdomadaire (${weeklyMain} / 350.000 PYG)`;

    planSelect.options[2].textContent = `${t.services_monthly_title || "Mensuel"} — ${monthlyMain}${pygMonthSuffix}`;
    planSelect.options[2].value = `Mensuel (${monthlyMain} / 1.400.000 PYG)`;
  }
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
  const grossPerHourPyg = estimatorMode === "peak" ? 42000 : 32500;
  const grossDayPyg = estimatorHours * grossPerHourPyg;
  const boltCommissionPyg = Math.round(grossDayPyg * 0.17);
  const fuelDayPyg = estimatorHours * 3000;
  const rentalDayPyg = BASE_PRICES_PYG.daily; // 50,000 PYG
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

  const heroBg = document.getElementById("hero-parallax-bg");
  if (heroBg && scrollY < vh * 1.2) {
    heroBg.style.transform = `translate3d(0, ${scrollY * 0.35}px, 0)`;
  }

  const flyingScooter = document.getElementById("flying-scooter");
  if (flyingScooter) {
    const docHeight = Math.max(document.body.scrollHeight - vh, 1);
    const progress = Math.min(Math.max(scrollY / docHeight, 0), 1);
    const xPos = progress * (window.innerWidth + 300);
    const rot = Math.sin(progress * Math.PI * 4) * 5;
    flyingScooter.style.transform = `translate3d(${xPos}px, 0, 0) rotate(${rot}deg)`;
  }

  document.querySelectorAll("[data-scooter-card]").forEach((card, idx) => {
    const rect = card.getBoundingClientRect();
    if (rect.top < vh && rect.bottom > 0 && window.innerWidth >= 768) {
      const centerOffset = (vh / 2 - (rect.top + rect.height / 2)) / vh;
      const dir = idx % 2 === 0 ? 1 : -1;
      const shiftX = centerOffset * 16 * dir;
      const rot = centerOffset * 2 * dir;
      card.style.transform = `translate3d(${shiftX}px, 0, 0) rotate(${rot}deg)`;
    } else {
      card.style.transform = "";
    }
  });

  const aboutImg = document.getElementById("about-parallax-img");
  if (aboutImg) {
    const rect = aboutImg.getBoundingClientRect();
    if (rect.top < vh && rect.bottom > 0 && window.innerWidth >= 768) {
      const offset = ((vh - rect.top) / (vh + rect.height) - 0.5) * 20;
      aboutImg.style.transform = `translate3d(0, ${offset}px, 0)`;
    } else {
      aboutImg.style.transform = "";
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

// 9. Booking, QR Transferencia SIPAP & Automatic Card Debit System
let currentQrPlan = "daily";
let currentAutoDebitCycle = "daily";

function selectQrAmount(planKey) {
  currentQrPlan = planKey;
  document.querySelectorAll("[data-qr-plan]").forEach((btn) => {
    const isSelected = btn.getAttribute("data-qr-plan") === planKey;
    if (isSelected) {
      btn.classList.remove("bg-white", "text-gray-800", "border-gray-300");
      btn.classList.add("bg-black", "text-white", "border-black");
    } else {
      btn.classList.add("bg-white", "text-gray-800", "border-gray-300");
      btn.classList.remove("bg-black", "text-white", "border-black");
    }
  });

  const amountEl = document.getElementById("sipap-qr-amount-display");
  if (amountEl) {
    if (planKey === "daily") {
      amountEl.textContent = `${formatPygAmount(BASE_PRICES_PYG.daily, currentCurrency, true)} / jour (₲ 50.000)`;
    } else if (planKey === "weekly") {
      amountEl.textContent = `${formatPygAmount(BASE_PRICES_PYG.weekly, currentCurrency, true)} / semaine (₲ 350.000)`;
    } else {
      amountEl.textContent = `${formatPygAmount(BASE_PRICES_PYG.monthly, currentCurrency, true)} / mois (₲ 1.400.000)`;
    }
  }
}

async function copySipapAlias() {
  const btn = document.getElementById("copy-alias-btn");
  const modalBtn = document.getElementById("modal-copy-alias-btn");
  try {
    await navigator.clipboard.writeText("4274384");
    [btn, modalBtn].forEach((b) => {
      if (b) {
        const orig = b.textContent;
        b.textContent = "¡Copiado!";
        setTimeout(() => {
          b.textContent = orig;
        }, 2200);
      }
    });
  } catch (_) {}
}

function confirmQrPaymentOnWhatsApp() {
  const planMap = {
    daily: "Por Día (₲ 50.000 / día)",
    weekly: "Por Semana (₲ 350.000 / semana)",
    monthly: "Por Mes (₲ 1.400.000 / mes)"
  };
  const label = planMap[currentQrPlan] || planMap.daily;
  const msg = `¡Hola G&L MOTORS! 🇵🇾\nAcabo de realizar una transferencia SIPAP / Mango para el alquiler de moto :\n• Plan : ${label}\n• Banco destino : Mango\n• Titular : Adán Pereira (C.I. 4.274.384)\n• Alias C.I. : 4274384\n\nAdjunto aquí mi comprobante de transferencia :`;
  window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(msg)}`, "_blank", "noopener,noreferrer");
}

let modalAutoDebitCycle = "daily";

function selectAutoDebitCycle(cycleKey) {
  if (cycleKey !== "weekly") cycleKey = "daily";
  currentAutoDebitCycle = cycleKey;
  modalAutoDebitCycle = cycleKey;
  document.querySelectorAll("[data-autodebit-cycle]").forEach((btn) => {
    const isSelected = btn.getAttribute("data-autodebit-cycle") === cycleKey;
    if (isSelected) {
      btn.classList.remove("bg-white", "text-gray-800", "border-gray-300");
      btn.classList.add("bg-indigo-600", "text-white", "border-indigo-600");
    } else {
      btn.classList.add("bg-white", "text-gray-800", "border-gray-300");
      btn.classList.remove("bg-indigo-600", "text-white", "border-indigo-600");
    }
  });

  const cycleLabel = document.getElementById("autodebit-cycle-label");
  const amountLabel = document.getElementById("autodebit-amount-label");
  const t = translations[currentLang] || translations.fr;
  if (cycleKey === "daily") {
    if (cycleLabel) cycleLabel.textContent = t.hub_cycle_daily || "Débito automático cada día (24h)";
    if (amountLabel) amountLabel.textContent = `${formatPygAmount(BASE_PRICES_PYG.daily, currentCurrency, true)} / día`;
  } else {
    if (cycleLabel) cycleLabel.textContent = t.hub_cycle_weekly || "Débito automático cada semana (7 días)";
    if (amountLabel) amountLabel.textContent = `${formatPygAmount(BASE_PRICES_PYG.weekly, currentCurrency, true)} / semana`;
  }
}

function openAutoDebitModal(preselectedCycle) {
  const modal = document.getElementById("autodebit-modal");
  if (preselectedCycle) {
    selectModalAutoDebitCycle(preselectedCycle);
  } else {
    selectModalAutoDebitCycle(currentAutoDebitCycle || "daily");
  }
  if (modal) {
    modal.classList.add("active");
    document.body.style.overflow = "hidden";
  }
}

function closeAutoDebitModal() {
  const modal = document.getElementById("autodebit-modal");
  if (modal) {
    modal.classList.remove("active");
    document.body.style.overflow = "";
  }
}

function selectModalAutoDebitCycle(cycleKey) {
  if (cycleKey !== "weekly") cycleKey = "daily";
  modalAutoDebitCycle = cycleKey;
  document.querySelectorAll("[data-modal-cycle]").forEach((btn) => {
    const isSelected = btn.getAttribute("data-modal-cycle") === cycleKey;
    if (isSelected) {
      btn.classList.remove("bg-white", "text-gray-800", "border-gray-300");
      btn.classList.add("bg-indigo-600", "text-white", "border-indigo-600");
    } else {
      btn.classList.add("bg-white", "text-gray-800", "border-gray-300");
      btn.classList.remove("bg-indigo-600", "text-white", "border-indigo-600");
    }
  });

  const submitText = document.getElementById("autodebit-submit-btn-text");
  if (submitText) {
    if (cycleKey === "daily") {
      submitText.textContent = `Confirmar y Activar Débito Automático (${formatPygAmount(BASE_PRICES_PYG.daily, currentCurrency, true)} / día)`;
    } else {
      submitText.textContent = `Confirmar y Activar Débito Automático (${formatPygAmount(BASE_PRICES_PYG.weekly, currentCurrency, true)} / semana)`;
    }
  }
}

function formatCardNumberInput(input) {
  let v = input.value.replace(/\D/g, "").slice(0, 16);
  let matches = v.match(/\d{4,16}/g);
  let match = (matches && matches[0]) || "";
  let parts = [];
  for (let i = 0, len = match.length; i < len; i += 4) {
    parts.push(match.substring(i, i + 4));
  }
  if (parts.length) {
    input.value = parts.join(" ");
  } else {
    input.value = v;
  }
}

function formatExpiryInput(input) {
  let v = input.value.replace(/\D/g, "").slice(0, 4);
  if (v.length >= 2) {
    input.value = v.substring(0, 2) + "/" + v.substring(2);
  } else {
    input.value = v;
  }
}

function submitAutoDebitMandate(e) {
  e.preventDefault();
  const cardholder = document.getElementById("autodebit-cardholder")?.value || "";
  const ci = document.getElementById("autodebit-ci")?.value || "";
  const phone = document.getElementById("autodebit-phone")?.value || "";
  const bike = document.getElementById("autodebit-bike-select")?.value || "XVR 150cc";
  const cardNum = document.getElementById("autodebit-cardnumber")?.value.replace(/\s/g, "") || "";
  const last4 = cardNum.slice(-4) || "****";

  const cycleLabels = {
    daily: `Cada Día (${formatPygAmount(BASE_PRICES_PYG.daily, currentCurrency, true)} / día)`,
    weekly: `Cada Semana (${formatPygAmount(BASE_PRICES_PYG.weekly, currentCurrency, true)} / semana)`
  };
  const cycleName = cycleLabels[modalAutoDebitCycle] || cycleLabels.daily;

  const msg = `¡Hola G&L MOTORS! 🇵🇾💳\nQuiero confirmar mi adhesión al DÉBITO AUTOMÁTICO recurrente :\n• Frecuencia : ${cycleName}\n• Moto : ${bike}\n• Titular : ${cardholder}\n• Cédula (C.I.) : ${ci}\n• WhatsApp : ${phone}\n• Tarjeta terminada en : ...${last4}\n• Pasarela oficial : Pagopar & Bancard Paraguay\n\nPor favor confirmar la activación de mi cobro recurrente. ¡Muchas gracias!`;

  window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(msg)}`, "_blank", "noopener,noreferrer");
  closeAutoDebitModal();
}

function setModalPlanIndex(idx) {
  const planSelect = document.getElementById("booking-plan-select");
  if (planSelect) {
    planSelect.selectedIndex = idx;
    updatePaymentProcessorNote();
  }
}

function updatePaymentProcessorNote() {
  const paySelect = document.getElementById("booking-payment-select");
  const planSelect = document.getElementById("booking-plan-select");
  const noteEl = document.getElementById("payment-processor-note");
  const qrBox = document.getElementById("modal-sipap-qr-box");
  const cardBox = document.getElementById("modal-card-autodebit-box");
  const modalQrAmount = document.getElementById("modal-qr-amount");
  if (!paySelect || !noteEl) return;

  const planIdx = planSelect ? planSelect.selectedIndex : 0;
  const planAmounts = ["₲ 50.000 / jour", "₲ 350.000 / semaine", "₲ 1.400.000 / mois"];
  if (modalQrAmount) {
    modalQrAmount.textContent = `Montant : ${planAmounts[planIdx] || planAmounts[0]}`;
  }

  [0, 1].forEach((i) => {
    const btn = document.getElementById(`modal-cycle-btn-${i}`);
    if (btn) {
      if (i === planIdx) {
        btn.classList.remove("bg-white", "text-gray-700", "border-gray-300");
        btn.classList.add("bg-indigo-600", "text-white", "border-indigo-600");
      } else {
        btn.classList.add("bg-white", "text-gray-700", "border-gray-300");
        btn.classList.remove("bg-indigo-600", "text-white", "border-indigo-600");
      }
    }
  });

  const val = paySelect.value;
  if (val === "SIPAP") {
    noteEl.textContent = "✓ Virement instantané SIPAP 24/7 / QR Code au Paraguay (0% de frais bancaires). Scannez le QR ci-dessous :";
    qrBox?.classList.remove("hidden");
    cardBox?.classList.add("hidden");
  } else if (val === "CARD") {
    noteEl.textContent = "✓ Prélèvement automatique sécurisé par Carte Bancaire (Visa / Mastercard) débité chaque jour ou chaque semaine selon votre choix (sans engagement).";
    qrBox?.classList.add("hidden");
    cardBox?.classList.remove("hidden");
  } else if (val === "CRYPTO") {
    noteEl.textContent = "✓ Paiement direct sans frais via Solana (USDC / USDT / SOL) ou Bitcoin Lightning.";
    qrBox?.classList.add("hidden");
    cardBox?.classList.add("hidden");
  } else {
    noteEl.textContent = "✓ Paiement en espèces (Guaraníes PYG ou USD) directement à l'atelier lors de la remise des clés.";
    qrBox?.classList.add("hidden");
    cardBox?.classList.add("hidden");
  }
}

// 9b. Paraguay Legal Policies Modal Controller
function openLegalModal(tab = "terms") {
  const modal = document.getElementById("legal-modal");
  if (modal) {
    modal.classList.remove("hidden");
    modal.classList.add("active");
    document.body.style.overflow = "hidden";
    switchLegalTab(tab);
  }
}

function closeLegalModal() {
  const modal = document.getElementById("legal-modal");
  if (modal) {
    modal.classList.remove("active");
    modal.classList.add("hidden");
    document.body.style.overflow = "";
  }
}

function switchLegalTab(tab) {
  const tabs = ["terms", "privacy", "company"];
  tabs.forEach((t) => {
    const btn = document.getElementById(`legal-tab-btn-${t}`);
    const content = document.getElementById(`legal-content-${t}`);
    const isSelected = t === tab;
    if (btn) {
      if (isSelected) {
        btn.classList.add("border-black", "text-gray-900");
        btn.classList.remove("border-transparent", "text-gray-500");
      } else {
        btn.classList.remove("border-black", "text-gray-900");
        btn.classList.add("border-transparent", "text-gray-500");
      }
    }
    if (content) {
      if (isSelected) {
        content.classList.remove("hidden");
      } else {
        content.classList.add("hidden");
      }
    }
  });
}

function openBookingModal(defaultBike = "", precheckBolt = false, defaultPayment = "") {
  const modal = document.getElementById("booking-modal");
  const bikeSelect = document.getElementById("booking-bike-select");
  const dateInput = document.getElementById("booking-date-input");
  const boltCheck = document.getElementById("booking-bolt-checkbox");
  const paySelect = document.getElementById("booking-payment-select");

  if (bikeSelect && defaultBike) {
    bikeSelect.value = defaultBike;
  }
  if (boltCheck && precheckBolt) {
    boltCheck.checked = true;
  }
  if (paySelect && defaultPayment) {
    paySelect.value = defaultPayment;
  }
  if (dateInput && !dateInput.value) {
    const today = new Date().toISOString().split("T")[0];
    dateInput.value = today;
    dateInput.min = today;
  }

  updatePaymentProcessorNote();
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
  const plan = document.getElementById("booking-plan-select")?.value || "Journalier (50.000 PYG)";
  const paymentSelect = document.getElementById("booking-payment-select");
  const paymentText = paymentSelect?.options[paymentSelect.selectedIndex]?.textContent || "Transferencia Paraguay (SIPAP)";
  const date = document.getElementById("booking-date-input")?.value || "Aujourd'hui";
  const needBolt = document.getElementById("booking-bolt-checkbox")?.checked;

  let message = `Bonjour G&L MOTORS ! 🏍️\nJe souhaite réserver une moto :\n• Modèle : ${bike}\n• Formule : ${plan}\n• Moyen de paiement : ${paymentText}\n• Date de retrait : ${date}`;
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
  updatePaymentProcessorNote();

  window.addEventListener("scroll", handleScroll, { passive: true });
  handleScroll();
});
