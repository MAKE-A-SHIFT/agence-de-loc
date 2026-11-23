/* ==========================================================================
   G&L MOTORS E.A.S. — ERP Flotte, Paiements Journaliers, GPS, Contrats & Finance
   Tarif journalier fixe non négociable : 50.000 PYG / jour
   Multi-langue (ES / FR / EN) + Synchronisation Serveur Cloud (/api/erp)
   ========================================================================== */

const DAILY_RATE = 50000;
const STORAGE_KEY = "glmotors_erp_state_v1";
const AUTH_KEY = "gl_admin_auth";
const AUTH_VALUE = "BigLuck_OK";
const ADMIN_PASS = "BigLuck";
const ADMIN_LANG_KEY = "gl_admin_lang";
const CLOUD_API_URL = "/api/erp";

// ==========================================================================
// 1. MULTI-LANGUAGE ENGINE (Español / Français / English)
// ==========================================================================
function detectAdminLang() {
  const saved = localStorage.getItem(ADMIN_LANG_KEY);
  if (saved && ADMIN_I18N[saved]) return saved;
  const nav = (navigator.language || "es").toLowerCase();
  if (nav.startsWith("fr")) return "fr";
  if (nav.startsWith("en")) return "en";
  return "es"; // Default to Spanish for Paraguay
}

let currentAdminLang = detectAdminLang();

function t(key, vars = {}) {
  const dict = ADMIN_I18N[currentAdminLang] || ADMIN_I18N.es;
  let text = dict[key] || ADMIN_I18N.es[key] || key;
  for (const [k, v] of Object.entries(vars)) {
    text = text.replace(new RegExp(`\\{${k}\\}`, "g"), v);
  }
  return text;
}

function setAdminLang(lang, manual = false) {
  if (!ADMIN_I18N[lang]) return;
  currentAdminLang = lang;
  if (manual) localStorage.setItem(ADMIN_LANG_KEY, lang);
  document.documentElement.lang = lang;
  applyAdminI18n();
  renderAll();
}

function applyAdminI18n() {
  document.querySelectorAll("[data-a18n]").forEach((el) => {
    const key = el.getAttribute("data-a18n");
    if (key) el.textContent = t(key);
  });
  document.querySelectorAll("[data-a18n-html]").forEach((el) => {
    const key = el.getAttribute("data-a18n-html");
    if (key) el.innerHTML = t(key);
  });
  document.querySelectorAll("[data-a18n-ph]").forEach((el) => {
    const key = el.getAttribute("data-a18n-ph");
    if (key) el.placeholder = t(key);
  });
  document.querySelectorAll(".admin-lang-btn").forEach((btn) => {
    const isSel = btn.getAttribute("data-lang-btn") === currentAdminLang;
    if (isSel) {
      btn.classList.add("bg-black", "text-white", "shadow-xs");
      btn.classList.remove("text-gray-600", "hover:text-gray-900");
    } else {
      btn.classList.remove("bg-black", "text-white", "shadow-xs");
      btn.classList.add("text-gray-600", "hover:text-gray-900");
    }
  });
  refreshCloudStatusLabel();
}

// ==========================================================================
// 2. DATE HELPERS (Local Paraguay-safe YYYY-MM-DD, zero UTC shift)
// ==========================================================================
function toLocalIso(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function getTodayIso() {
  return toLocalIso(new Date());
}

function parseLocalIso(isoStr) {
  const [y, m, d] = isoStr.split("-").map(Number);
  return new Date(y, m - 1, d, 12, 0, 0);
}

function addDaysIso(isoStr, days) {
  const dt = parseLocalIso(isoStr);
  dt.setDate(dt.getDate() + days);
  return toLocalIso(dt);
}

function getDaysRange(startIso, endIso) {
  const result = [];
  if (!startIso || !endIso || startIso > endIso) return result;
  let cur = startIso;
  let guard = 0;
  while (cur <= endIso && guard < 1500) {
    result.push(cur);
    cur = addDaysIso(cur, 1);
    guard++;
  }
  return result;
}

function diffDaysInclusive(startIso, endIso) {
  if (!startIso || !endIso || startIso > endIso) return 0;
  const a = parseLocalIso(startIso);
  const b = parseLocalIso(endIso);
  return Math.round((b - a) / 86400000) + 1;
}

function formatDateFr(isoStr) {
  if (!isoStr) return "—";
  const [y, m, d] = isoStr.split("-");
  return `${d}/${m}/${y}`;
}

function formatGs(amount) {
  const n = Math.round(Number(amount) || 0);
  const sign = n < 0 ? "-" : "";
  const abs = Math.abs(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `${sign}₲ ${abs}`;
}

function escapeHtml(str) {
  return String(str || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// ==========================================================================
// 3. STATE & REAL SERVER CLOUD SYNC (/api/erp + LocalStorage + IndexedDB)
// ==========================================================================
function createDefaultState() {
  return {
    version: 1,
    updatedAt: 0,
    initialCash: 0,
    initialTransferencia: 0,
    bikes: [
      {
        id: "bike-buler-1",
        name: "Buler Faiter Rojo 150cc",
        plate: "—",
        year: 2025,
        chassis: "",
        gpsId: "GPS-01",
        image: "assets/images/buler-faiter.png",
        status: "available",
        maintenanceReason: "",
        maintenanceSince: null
      },
      {
        id: "bike-desert-2",
        name: "Star New Desert Rojo 150cc",
        plate: "—",
        year: 2024,
        chassis: "",
        gpsId: "GPS-02",
        image: "assets/images/star-desert-rojo.png",
        status: "available",
        maintenanceReason: "",
        maintenanceSince: null
      },
      {
        id: "bike-enduro-3",
        name: "Enduro Star Negra 150cc",
        plate: "—",
        year: 2024,
        chassis: "",
        gpsId: "GPS-03",
        image: "assets/images/enduro-star-negra.png",
        status: "available",
        maintenanceReason: "",
        maintenanceSince: null
      },
      {
        id: "bike-xvr-4",
        name: "XVR Grise et Verte 150cc",
        plate: "—",
        year: 2025,
        chassis: "",
        gpsId: "GPS-04",
        image: "assets/images/xvr-150.png",
        status: "available",
        maintenanceReason: "",
        maintenanceSince: null
      },
      {
        id: "bike-boxer-5",
        name: "Boxer Azul 150cc",
        plate: "—",
        year: 2024,
        chassis: "",
        gpsId: "GPS-05",
        image: "assets/images/boxer-azul.png",
        status: "available",
        maintenanceReason: "",
        maintenanceSince: null
      }
    ],
    rentals: [],
    repuestos: []
  };
}

let erpState = loadLocalState();
let currentPeriod = "monthly";
let currentFleetFilter = "all";
let currentTimelineTab = "active";
let activeDocsRentalId = null;
let cloudSyncState = "checking"; // checking | ok | saving | pulling | not_configured | offline

let growthChart = null;
let ratioChart = null;
let repuestosChart = null;

function loadLocalState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && Array.isArray(parsed.bikes)) {
        return {
          ...createDefaultState(),
          ...parsed,
          bikes: parsed.bikes || [],
          rentals: parsed.rentals || [],
          repuestos: parsed.repuestos || []
        };
      }
    }
  } catch (err) {
    console.warn("LocalStorage read error:", err);
  }
  return createDefaultState();
}

function setCloudStatus(stateKey) {
  cloudSyncState = stateKey;
  refreshCloudStatusLabel();
}

function refreshCloudStatusLabel() {
  const dot = document.getElementById("cloud-sync-dot");
  const txt = document.getElementById("cloud-sync-label");
  const banner = document.getElementById("cloud-setup-banner");
  const setupBox = document.getElementById("cloud-setup-instructions");

  const map = {
    checking: { cls: "bg-amber-400 animate-pulse", key: "sync_checking" },
    ok: { cls: "bg-emerald-500", key: "sync_ok" },
    saving: { cls: "bg-amber-400 animate-pulse", key: "sync_saving" },
    pulling: { cls: "bg-blue-400 animate-pulse", key: "sync_pulling" },
    not_configured: { cls: "bg-red-500 animate-pulse", key: "sync_not_configured" },
    offline: { cls: "bg-slate-400", key: "sync_offline" }
  };
  const cfg = map[cloudSyncState] || map.offline;
  if (dot) dot.className = `w-2 h-2 rounded-full inline-block ${cfg.cls}`;
  if (txt) txt.textContent = t(cfg.key);

  if (banner) {
    if (cloudSyncState === "not_configured") banner.classList.remove("hidden");
    else banner.classList.add("hidden");
  }
  if (setupBox) {
    if (cloudSyncState === "ok") setupBox.classList.add("hidden");
    else setupBox.classList.remove("hidden");
  }
}

let cloudPushTimer = null;
let isSyncingNow = false;

function saveState(skipCloudPush = false) {
  erpState.updatedAt = Date.now();
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(erpState));
  } catch (err) {
    console.error("LocalStorage quota warning:", err);
  }
  renderAll();

  if (!skipCloudPush) {
    setCloudStatus("saving");
    clearTimeout(cloudPushTimer);
    cloudPushTimer = setTimeout(() => {
      pushToCloud();
    }, 250);
  }
}

async function pushToCloud() {
  if (isSyncingNow) return;
  isSyncingNow = true;
  try {
    let res = await fetch(CLOUD_API_URL, {
      method: "PUT",
      cache: "no-store",
      headers: {
        "Content-Type": "application/json",
        "x-admin-pass": ADMIN_PASS
      },
      body: JSON.stringify({ data: erpState })
    });

    if (res.status === 503) {
      setCloudStatus("not_configured");
      return;
    }

    // If payload is rejected as too large (413) due to many documents, strip large binaries cleanly so finances/fleet always sync
    if (res.status === 413) {
      const lightweightState = {
        ...erpState,
        rentals: erpState.rentals.map((r) => ({
          ...r,
          documents: (r.documents || []).map((d) => ({
            ...d,
            dataUrl: d.dataUrl && d.dataUrl.length > 60000 ? "" : d.dataUrl
          }))
        }))
      };
      res = await fetch(CLOUD_API_URL, {
        method: "PUT",
        cache: "no-store",
        headers: {
          "Content-Type": "application/json",
          "x-admin-pass": ADMIN_PASS
        },
        body: JSON.stringify({ data: lightweightState })
      });
    }

    if (res.ok) {
      setCloudStatus("ok");
    } else {
      setCloudStatus("offline");
    }
  } catch (err) {
    setCloudStatus("offline");
  } finally {
    isSyncingNow = false;
  }
}

async function syncFromCloud(manual = false) {
  if (isSyncingNow) return;
  if (manual) setCloudStatus("pulling");
  isSyncingNow = true;
  try {
    const res = await fetch(CLOUD_API_URL, {
      method: "GET",
      cache: "no-store",
      headers: { "x-admin-pass": ADMIN_PASS }
    });

    if (res.status === 503) {
      setCloudStatus("not_configured");
      return;
    }
    if (!res.ok) {
      if (manual) setCloudStatus("offline");
      return;
    }

    const payload = await res.json();
    const remoteErp = payload?.data;

    if (remoteErp && Array.isArray(remoteErp.bikes)) {
      if ((remoteErp.updatedAt || 0) > (erpState.updatedAt || 0)) {
        erpState = {
          ...createDefaultState(),
          ...remoteErp,
          bikes: remoteErp.bikes || [],
          rentals: remoteErp.rentals || [],
          repuestos: remoteErp.repuestos || []
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(erpState));
        renderAll();
        setCloudStatus("ok");
      } else if ((erpState.updatedAt || 0) > (remoteErp.updatedAt || 0)) {
        // Local device has newer edits: push them up to Cloud right away
        isSyncingNow = false;
        await pushToCloud();
        return;
      } else {
        setCloudStatus("ok");
      }
    } else {
      // Cloud DB is fresh & empty -> seed it with our current state
      if (erpState.updatedAt === 0) erpState.updatedAt = Date.now();
      isSyncingNow = false;
      await pushToCloud();
      return;
    }
  } catch (err) {
    setCloudStatus("offline");
  } finally {
    isSyncingNow = false;
  }
}

// IndexedDB for full-resolution local archive of uploaded files
function openFilesDb() {
  return new Promise((resolve, reject) => {
    if (!window.indexedDB) return reject(new Error("No IndexedDB"));
    const req = indexedDB.open("glmotors_files_db", 1);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains("files")) {
        db.createObjectStore("files", { keyPath: "id" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function saveFileToIdb(docId, fullDataUrl) {
  try {
    const db = await openFilesDb();
    const tx = db.transaction("files", "readwrite");
    tx.objectStore("files").put({ id: docId, dataUrl: fullDataUrl });
  } catch {}
}

async function getFileFromIdb(docId) {
  try {
    const db = await openFilesDb();
    return new Promise((resolve) => {
      const tx = db.transaction("files", "readonly");
      const req = tx.objectStore("files").get(docId);
      req.onsuccess = () => resolve(req.result?.dataUrl || null);
      req.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

// ==========================================================================
// 4. AUTHENTICATION LOCK SCREEN ("BigLuck")
// ==========================================================================
function isAuthenticated() {
  return (
    sessionStorage.getItem(AUTH_KEY) === AUTH_VALUE ||
    localStorage.getItem(AUTH_KEY) === AUTH_VALUE
  );
}

function checkAuthOnLoad() {
  const overlay = document.getElementById("admin-lock-overlay");
  if (isAuthenticated() && overlay) {
    overlay.classList.add("hidden");
  }
}

function unlockAdminOverlay(e) {
  e.preventDefault();
  const input = document.getElementById("overlay-password-input");
  const err = document.getElementById("overlay-password-error");
  const val = (input?.value || "").trim();

  if (val === ADMIN_PASS) {
    sessionStorage.setItem(AUTH_KEY, AUTH_VALUE);
    localStorage.setItem(AUTH_KEY, AUTH_VALUE);
    document.getElementById("admin-lock-overlay")?.classList.add("hidden");
    if (err) err.classList.add("hidden");
    syncFromCloud(true);
  } else {
    if (err) err.classList.remove("hidden");
    if (input) {
      input.value = "";
      input.focus();
    }
  }
}

function lockAdmin() {
  sessionStorage.removeItem(AUTH_KEY);
  localStorage.removeItem(AUTH_KEY);
  document.getElementById("admin-lock-overlay")?.classList.remove("hidden");
  const input = document.getElementById("overlay-password-input");
  if (input) {
    input.value = "";
    input.focus();
  }
}

// ==========================================================================
// 5. RENTAL PAYMENT EVALUATION ENGINE
// ==========================================================================
function analyzeRentalPayments(rental) {
  const today = getTodayIso();
  const payments = rental.payments || {};

  if (rental.status === "future") {
    return {
      totalDaysElapsed: 0,
      paidCashDays: 0,
      paidTransferDays: 0,
      paidCashAmount: 0,
      paidTransferAmount: 0,
      totalPaidAmount: 0,
      todayStatus: "future",
      unpaidDates: [],
      unpaidCount: 0,
      unpaidAmount: 0,
      gpsAlert: false,
      dayLogs: []
    };
  }

  const endBoundary =
    rental.status === "completed" && rental.endDate
      ? (rental.endDate < today ? rental.endDate : today)
      : today;

  const days = getDaysRange(rental.startDate, endBoundary);
  let paidCashDays = 0;
  let paidTransferDays = 0;
  const unpaidDates = [];
  const dayLogs = [];

  for (const dateStr of days) {
    const entry = payments[dateStr];
    if (entry && entry.status === "paid") {
      if (entry.method === "cash") paidCashDays++;
      else paidTransferDays++;
      dayLogs.push({ date: dateStr, status: "paid", method: entry.method, amount: entry.amount || DAILY_RATE });
    } else if (entry && entry.status === "unpaid") {
      unpaidDates.push(dateStr);
      dayLogs.push({ date: dateStr, status: "unpaid", method: null, amount: DAILY_RATE });
    } else {
      if (dateStr < today || rental.status === "completed") {
        unpaidDates.push(dateStr);
        dayLogs.push({ date: dateStr, status: "unpaid", method: null, amount: DAILY_RATE });
      } else {
        dayLogs.push({ date: dateStr, status: "pending", method: null, amount: DAILY_RATE });
      }
    }
  }

  let todayStatus = "none";
  if (rental.status === "active" && rental.startDate <= today) {
    const tEntry = payments[today];
    if (tEntry?.status === "paid") todayStatus = "paid";
    else if (tEntry?.status === "unpaid") todayStatus = "unpaid";
    else todayStatus = "pending_today";
  }

  const paidCashAmount = paidCashDays * DAILY_RATE;
  const paidTransferAmount = paidTransferDays * DAILY_RATE;
  const unpaidCount = unpaidDates.length;
  const unpaidAmount = unpaidCount * DAILY_RATE;

  return {
    totalDaysElapsed: days.length,
    paidCashDays,
    paidTransferDays,
    paidCashAmount,
    paidTransferAmount,
    totalPaidAmount: paidCashAmount + paidTransferAmount,
    todayStatus,
    unpaidDates,
    unpaidCount,
    unpaidAmount,
    gpsAlert: unpaidCount >= 2,
    dayLogs
  };
}

// ==========================================================================
// 6. FINANCIAL METRICS & AGGREGATIONS
// ==========================================================================
function computeAllFinancials() {
  const today = getTodayIso();

  let totalPaidCash = 0;
  let totalPaidTransfer = 0;
  let totalUnpaidAmount = 0;
  let totalUnpaidDays = 0;
  const unpaidClientsList = [];
  const allRevenueEvents = [];
  const uniqueClients = new Set();

  for (const rental of erpState.rentals) {
    if (rental.clientName) {
      uniqueClients.add((rental.clientCi || rental.clientName).trim().toLowerCase());
    }
    const analysis = analyzeRentalPayments(rental);
    totalPaidCash += analysis.paidCashAmount;
    totalPaidTransfer += analysis.paidTransferAmount;
    totalUnpaidAmount += analysis.unpaidAmount;
    totalUnpaidDays += analysis.unpaidCount;

    for (const log of analysis.dayLogs) {
      if (log.status === "paid") {
        allRevenueEvents.push({
          date: log.date,
          amount: log.amount,
          method: log.method
        });
      }
    }

    if (analysis.unpaidCount > 0) {
      const bike = erpState.bikes.find((b) => b.id === rental.bikeId);
      unpaidClientsList.push({ rental, bike, analysis });
    }
  }

  unpaidClientsList.sort((a, b) => b.analysis.unpaidCount - a.analysis.unpaidCount);

  let totalRepuestosCash = 0;
  let totalRepuestosTransfer = 0;
  for (const rep of erpState.repuestos) {
    const amt = Number(rep.amount) || 0;
    if (rep.method === "transferencia") totalRepuestosTransfer += amt;
    else totalRepuestosCash += amt;
  }

  const cashBalance = (Number(erpState.initialCash) || 0) + totalPaidCash - totalRepuestosCash;
  const transferBalance = (Number(erpState.initialTransferencia) || 0) + totalPaidTransfer - totalRepuestosTransfer;
  const totalBalance = cashBalance + transferBalance;

  let rentedCount = 0;
  let availableCount = 0;
  let maintenanceCount = 0;
  let downtimeLossTotal = 0;

  for (const bike of erpState.bikes) {
    const activeRental = erpState.rentals.find((r) => r.bikeId === bike.id && r.status === "active");
    if (bike.status === "maintenance") {
      maintenanceCount++;
      const since = bike.maintenanceSince || today;
      const daysDown = Math.max(1, diffDaysInclusive(since, today));
      downtimeLossTotal += daysDown * DAILY_RATE;
    } else if (activeRental || bike.status === "rented") {
      rentedCount++;
    } else {
      availableCount++;
    }
  }

  const inServiceCount = rentedCount + availableCount;
  const periodStartIso = getPeriodStartIso(currentPeriod);
  const periodRev = allRevenueEvents
    .filter((ev) => !periodStartIso || ev.date >= periodStartIso)
    .reduce((acc, ev) => acc + ev.amount, 0);

  const periodRep = erpState.repuestos
    .filter((rep) => !periodStartIso || (rep.date || today) >= periodStartIso)
    .reduce((acc, rep) => acc + (Number(rep.amount) || 0), 0);

  return {
    cashIn: totalPaidCash,
    cashOut: totalRepuestosCash,
    cashBalance,
    transferIn: totalPaidTransfer,
    transferOut: totalRepuestosTransfer,
    transferBalance,
    totalBalance,
    rentedCount,
    availableCount,
    inServiceCount,
    maintenanceCount,
    downtimeLossTotal,
    totalUnpaidAmount,
    totalUnpaidDays,
    unpaidClientsList,
    uniqueClientsCount: uniqueClients.size,
    allRevenueEvents,
    periodStartIso,
    periodRev,
    periodRep,
    periodNet: periodRev - periodRep
  };
}

function getPeriodStartIso(period) {
  const today = getTodayIso();
  if (period === "daily") return today;
  if (period === "weekly") return addDaysIso(today, -6);
  if (period === "monthly") return addDaysIso(today, -29);
  return null;
}

// ==========================================================================
// 7. RENDERING UI (PARTIE 1 + PARTIE 2)
// ==========================================================================
function renderAll() {
  const stats = computeAllFinancials();
  renderPart1Finance(stats);
  renderPart2Alerts(stats);
  renderFleetGrid();
  renderTimelineRentals();
  populateSelectDropdowns();
  runPoliceLookup();
}

function renderPart1Finance(stats) {
  document.getElementById("bank-cash-balance").textContent = formatGs(stats.cashBalance);
  document.getElementById("bank-cash-in").textContent = `+ ${formatGs(stats.cashIn)}`;
  document.getElementById("bank-cash-out").textContent = `- ${formatGs(stats.cashOut)}`;

  document.getElementById("bank-transfer-balance").textContent = formatGs(stats.transferBalance);
  document.getElementById("bank-transfer-in").textContent = `+ ${formatGs(stats.transferIn)}`;
  document.getElementById("bank-transfer-out").textContent = `- ${formatGs(stats.transferOut)}`;

  document.getElementById("bank-total-balance").textContent = formatGs(stats.totalBalance);
  document.getElementById("daily-runrate-pill").textContent = `${formatGs(stats.rentedCount * DAILY_RATE)} ${t("active_day_flow")}`;

  const totalInflows = stats.cashIn + stats.transferIn;
  let cashPct = 50;
  let bankPct = 50;
  if (totalInflows > 0) {
    cashPct = Math.round((stats.cashIn / totalInflows) * 100);
    bankPct = 100 - cashPct;
  } else if (stats.cashBalance + stats.transferBalance > 0) {
    const posCash = Math.max(0, stats.cashBalance);
    const posBank = Math.max(0, stats.transferBalance);
    const sumPos = posCash + posBank || 1;
    cashPct = Math.round((posCash / sumPos) * 100);
    bankPct = 100 - cashPct;
  }
  document.getElementById("ratio-bar-cash").style.width = `${cashPct}%`;
  document.getElementById("ratio-bar-bank").style.width = `${bankPct}%`;
  document.getElementById("ratio-label-cash").textContent = `${t("ratio_cash")} : ${cashPct}%`;
  document.getElementById("ratio-label-bank").textContent = `${t("ratio_bank")} : ${bankPct}%`;

  document.getElementById("stat-rented-count").textContent = stats.rentedCount;
  document.getElementById("stat-available-count").textContent = stats.availableCount;
  const totalBikes = erpState.bikes.length || 1;
  const occRate = Math.round((stats.rentedCount / totalBikes) * 100);
  document.getElementById("stat-occupancy-rate").textContent = `${t("kpi_occ_rate")} ${occRate}% (${erpState.bikes.length} ${t("kpi_bikes_total")})`;

  document.getElementById("stat-in-service-count").textContent = stats.inServiceCount;
  document.getElementById("stat-out-service-count").textContent = stats.maintenanceCount;
  document.getElementById("stat-downtime-loss").textContent = formatGs(stats.downtimeLossTotal);

  document.getElementById("stat-unpaid-amount").textContent = formatGs(stats.totalUnpaidAmount);
  document.getElementById("stat-unpaid-count").textContent = stats.totalUnpaidDays;
  document.getElementById("stat-unpaid-clients").textContent = stats.unpaidClientsList.length;

  document.getElementById("stat-clients-served").textContent = stats.uniqueClientsCount;
  document.getElementById("stat-period-net").textContent = formatGs(stats.periodNet);

  ["daily", "weekly", "monthly", "total"].forEach((p) => {
    const btn = document.getElementById(`period-btn-${p}`);
    if (!btn) return;
    btn.className =
      p === currentPeriod
        ? "period-btn px-3.5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer bg-black text-white shadow-sm"
        : "period-btn px-3.5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer text-gray-600 hover:text-gray-900";
  });

  document.getElementById("period-revenue").textContent = formatGs(stats.periodRev);
  document.getElementById("period-repuestos").textContent = formatGs(stats.periodRep);
  document.getElementById("period-profit").textContent = formatGs(stats.periodNet);
  const ratioStr =
    stats.periodRep > 0
      ? `${(stats.periodRev / stats.periodRep).toFixed(2)}x (${Math.round((stats.periodNet / Math.max(1, stats.periodRev)) * 100)}% ${t("margin_word")})`
      : stats.periodRev > 0
      ? t("ratio_inf")
      : "—";
  document.getElementById("period-ratio").textContent = ratioStr;

  renderCharts(stats);

  const repContainer = document.getElementById("repuestos-list");
  const sortedRep = [...erpState.repuestos].sort((a, b) => (b.date || "").localeCompare(a.date || ""));
  document.getElementById("repuestos-count-badge").textContent = `${sortedRep.length} ${t("repuestos_count_suffix")}`;

  if (sortedRep.length === 0) {
    repContainer.innerHTML = `<div class="text-xs text-gray-400 italic py-2">${escapeHtml(t("no_repuestos"))}</div>`;
  } else {
    repContainer.innerHTML = sortedRep
      .slice(0, 15)
      .map((rep) => {
        const bike = erpState.bikes.find((b) => b.id === rep.bikeId);
        const methodBadge =
          rep.method === "transferencia"
            ? `<span class="text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded font-bold">🏦 ${escapeHtml(t("ratio_bank"))}</span>`
            : `<span class="text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded font-bold">💵 ${escapeHtml(t("ratio_cash"))}</span>`;
        return `
          <div class="flex-shrink-0 w-60 rounded-2xl border border-gray-200 bg-gray-50 p-3 text-xs space-y-1.5">
            <div class="flex items-center justify-between gap-2">
              <span class="font-bold text-gray-900 truncate">${escapeHtml(rep.description)}</span>
              <button type="button" onclick="deleteRepuesto('${rep.id}')" class="text-gray-400 hover:text-red-600 cursor-pointer">✕</button>
            </div>
            <div class="flex items-center justify-between">
              <span class="font-black text-amber-700">${formatGs(rep.amount)}</span>
              ${methodBadge}
            </div>
            <div class="text-[10px] text-gray-500 flex justify-between">
              <span class="truncate max-w-[120px]">${bike ? escapeHtml(bike.name) : escapeHtml(t("general_workshop"))}</span>
              <span>${formatDateFr(rep.date)}</span>
            </div>
          </div>
        `;
      })
      .join("");
  }
}

function setFinancialPeriod(period) {
  currentPeriod = period;
  renderAll();
}

function buildTimeSeriesBuckets(stats) {
  const today = getTodayIso();
  let dates = [];

  if (currentPeriod === "daily") {
    for (let i = 6; i >= 0; i--) dates.push(addDaysIso(today, -i));
  } else if (currentPeriod === "weekly") {
    for (let i = 13; i >= 0; i--) dates.push(addDaysIso(today, -i));
  } else if (currentPeriod === "monthly") {
    for (let i = 29; i >= 0; i--) dates.push(addDaysIso(today, -i));
  } else {
    const allDates = [
      ...stats.allRevenueEvents.map((e) => e.date),
      ...erpState.repuestos.map((r) => r.date),
      ...erpState.rentals.map((r) => r.startDate)
    ].filter(Boolean);
    const minDate = allDates.length > 0 ? allDates.sort()[0] : addDaysIso(today, -14);
    dates = getDaysRange(minDate <= today ? minDate : today, today);
    if (dates.length > 60) dates = dates.slice(-60);
  }

  const revByDate = {};
  const repByDate = {};
  for (const ev of stats.allRevenueEvents) revByDate[ev.date] = (revByDate[ev.date] || 0) + ev.amount;
  for (const r of erpState.repuestos) {
    const d = r.date || today;
    repByDate[d] = (repByDate[d] || 0) + (Number(r.amount) || 0);
  }

  const labels = dates.map((d) => {
    const [, m, day] = d.split("-");
    return `${day}/${m}`;
  });
  const revSeries = dates.map((d) => revByDate[d] || 0);
  const repSeries = dates.map((d) => repByDate[d] || 0);
  const cumNetSeries = [];
  let runningNet = 0;

  for (let i = 0; i < dates.length; i++) {
    runningNet += revSeries[i] - repSeries[i];
    cumNetSeries.push(runningNet);
  }

  return { labels, revSeries, repSeries, cumNetSeries };
}

function renderCharts(stats) {
  if (typeof Chart === "undefined") return;
  const series = buildTimeSeriesBuckets(stats);

  if (growthChart) growthChart.destroy();
  if (ratioChart) ratioChart.destroy();
  if (repuestosChart) repuestosChart.destroy();

  const ctxGrowth = document.getElementById("chart-growth")?.getContext("2d");
  if (ctxGrowth) {
    growthChart = new Chart(ctxGrowth, {
      type: "line",
      data: {
        labels: series.labels,
        datasets: [
          {
            label: t("chart_lbl_rev"),
            data: series.revSeries,
            borderColor: "#199E5E",
            backgroundColor: "rgba(25, 158, 94, 0.12)",
            fill: true,
            tension: 0.35,
            borderWidth: 2.5
          },
          {
            label: t("chart_lbl_cumnet"),
            data: series.cumNetSeries,
            borderColor: "#0f172a",
            borderDash: [5, 4],
            fill: false,
            tension: 0.35,
            borderWidth: 2
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: true, labels: { boxWidth: 10, font: { size: 10 } } } },
        scales: { y: { beginAtZero: true, ticks: { font: { size: 10 } } }, x: { ticks: { font: { size: 10 } } } }
      }
    });
  }

  const ctxRatio = document.getElementById("chart-ratio")?.getContext("2d");
  if (ctxRatio) {
    ratioChart = new Chart(ctxRatio, {
      type: "bar",
      data: {
        labels: series.labels,
        datasets: [
          {
            label: t("chart_lbl_rev_short"),
            data: series.revSeries,
            backgroundColor: "rgba(52, 209, 134, 0.75)",
            borderRadius: 6
          },
          {
            label: t("chart_lbl_rep"),
            data: series.repSeries,
            backgroundColor: "rgba(239, 68, 68, 0.75)",
            borderRadius: 6
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: true, labels: { boxWidth: 10, font: { size: 10 } } } },
        scales: { y: { beginAtZero: true, ticks: { font: { size: 10 } } }, x: { ticks: { font: { size: 10 } } } }
      }
    });
  }

  const ctxRep = document.getElementById("chart-repuestos")?.getContext("2d");
  if (ctxRep) {
    repuestosChart = new Chart(ctxRep, {
      type: "line",
      data: {
        labels: series.labels,
        datasets: [
          {
            label: t("chart_lbl_rep"),
            data: series.repSeries,
            borderColor: "#d97706",
            backgroundColor: "rgba(217, 119, 6, 0.15)",
            fill: true,
            tension: 0.3,
            borderWidth: 2.5
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: true, labels: { boxWidth: 10, font: { size: 10 } } } },
        scales: { y: { beginAtZero: true, ticks: { font: { size: 10 } } }, x: { ticks: { font: { size: 10 } } } }
      }
    });
  }
}

// ==========================================================================
// 8. PARTIE 2: ALERTES NIVEAU 1 & NIVEAU 2 (COUPURE GPS)
// ==========================================================================
function renderPart2Alerts(stats) {
  const container = document.getElementById("alerts-center");
  const today = getTodayIso();
  const blocks = [];

  const gpsAlerts = stats.unpaidClientsList.filter((item) => item.analysis.gpsAlert);
  for (const item of gpsAlerts) {
    const { rental, bike, analysis } = item;
    const phoneClean = (rental.clientPhone || "").replace(/\D/g, "");
    const waMsg = encodeURIComponent(
      `Hola ${rental.clientName}, tenés ${analysis.unpaidCount} días de alquiler impagos (${formatGs(analysis.unpaidAmount)}) en G&L MOTORS por la moto ${bike?.name || ""}. Por contrato, procedemos al corte remoto por GPS si no se regulariza de inmediato.`
    );
    blocks.push(`
      <div class="alert-gps-pulse rounded-3xl bg-red-600 text-white p-5 shadow-lg border-2 border-red-400">
        <div class="flex flex-wrap items-center justify-between gap-4">
          <div class="space-y-1 flex-1 min-w-[260px]">
            <div class="flex items-center gap-2 flex-wrap">
              <span class="px-2.5 py-0.5 rounded-full bg-yellow-300 text-black text-[11px] font-black uppercase tracking-wider">
                ${escapeHtml(t("alert_gps_badge"))} (${analysis.unpaidCount} ${escapeHtml(t("alert_gps_unpaid_word"))})
              </span>
              ${rental.gpsCutTriggered ? `<span class="px-2 py-0.5 rounded-full bg-black/40 text-white text-[10px] font-bold">${escapeHtml(t("alert_gps_already_cut"))}</span>` : ""}
            </div>
            <h3 class="text-base sm:text-lg font-black">
              ${escapeHtml(rental.clientName)} • ${escapeHtml(bike?.name || "Moto")} (${escapeHtml(bike?.gpsId || "GPS")}) — ${escapeHtml(t("alert_gps_debt"))} ${formatGs(analysis.unpaidAmount)}
            </h3>
            <p class="text-xs text-red-100 font-medium">
              ${escapeHtml(t("alert_gps_msg_1"))} <strong>${analysis.unpaidCount}</strong> ${escapeHtml(t("alert_gps_msg_2"))} ${escapeHtml(bike?.plate || "N/A")}).
            </p>
          </div>
          <div class="flex flex-wrap items-center gap-2">
            <button type="button" onclick="toggleGpsCut('${rental.id}')" class="px-3.5 py-2 rounded-full bg-black hover:bg-gray-900 text-yellow-300 text-xs font-extrabold cursor-pointer transition-all">
              ${escapeHtml(rental.gpsCutTriggered ? t("btn_gps_cut_done") : t("btn_gps_cut_mark"))}
            </button>
            ${phoneClean ? `<a href="https://wa.me/${phoneClean}?text=${waMsg}" target="_blank" class="px-3.5 py-2 rounded-full bg-[#25D366] hover:bg-[#1ebe5a] text-white text-xs font-extrabold">💬 WhatsApp</a>` : ""}
            <button type="button" onclick="openUnpaidDetailsModal()" class="px-3.5 py-2 rounded-full bg-white text-red-700 hover:bg-red-50 text-xs font-extrabold cursor-pointer">
              ${escapeHtml(t("btn_settle"))}
            </button>
          </div>
        </div>
      </div>
    `);
  }

  const pendingTodayRentals = erpState.rentals.filter((r) => {
    if (r.status !== "active") return false;
    return analyzeRentalPayments(r).todayStatus === "pending_today";
  });

  for (const rental of pendingTodayRentals) {
    const bike = erpState.bikes.find((b) => b.id === rental.bikeId);
    blocks.push(`
      <div class="rounded-2xl bg-red-50 border-2 border-red-400 p-4 shadow-sm flex flex-wrap items-center justify-between gap-3">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-full bg-red-600 text-white flex items-center justify-center font-black text-lg flex-shrink-0">!</div>
          <div>
            <p class="text-xs font-extrabold text-red-700 uppercase tracking-wider">${escapeHtml(t("alert_today_title"))} (${formatDateFr(today)})</p>
            <p class="text-sm font-bold text-gray-900">
              <span class="text-red-700">${escapeHtml(t("alert_today_q_1"))} ${escapeHtml(rental.clientName)} ${escapeHtml(t("alert_today_q_2"))}</span>
              <span class="text-gray-600 font-medium">(${escapeHtml(bike?.name || "Moto")} — ₲ 50.000)</span>
            </p>
          </div>
        </div>
        <div class="flex flex-wrap items-center gap-2">
          <button type="button" onclick="markDayPayment('${rental.id}', '${today}', 'paid', 'cash')" class="px-3.5 py-2 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold cursor-pointer shadow-xs">
            ${escapeHtml(t("btn_yes_cash"))}
          </button>
          <button type="button" onclick="markDayPayment('${rental.id}', '${today}', 'paid', 'transferencia')" class="px-3.5 py-2 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold cursor-pointer shadow-xs">
            ${escapeHtml(t("btn_yes_transfer"))}
          </button>
          <button type="button" onclick="markDayPayment('${rental.id}', '${today}', 'unpaid', null)" class="px-3.5 py-2 rounded-full bg-red-600 hover:bg-red-700 text-white text-xs font-bold cursor-pointer shadow-xs">
            ${escapeHtml(t("btn_no_unpaid"))}
          </button>
        </div>
      </div>
    `);
  }

  if (blocks.length === 0) {
    container.innerHTML = `
      <div class="rounded-2xl bg-emerald-50 border border-emerald-200 px-4 py-3 text-xs font-semibold text-emerald-900 flex items-center gap-2">
        <span>✅</span>
        <span>${escapeHtml(t("alerts_all_ok"))} (${formatDateFr(today)})</span>
      </div>
    `;
  } else {
    container.innerHTML = blocks.join("");
  }
}

// ==========================================================================
// 9. GRILLE DES MOTOS & GESTION OPÉRATIONNELLE
// ==========================================================================
function setFleetFilter(filter) {
  currentFleetFilter = filter;
  renderFleetGrid();
}

function renderFleetGrid() {
  const today = getTodayIso();

  ["all", "rented", "available", "maintenance"].forEach((f) => {
    const btn = document.getElementById(`fleet-filter-${f}`);
    if (!btn) return;
    btn.className =
      f === currentFleetFilter
        ? "fleet-filter-btn px-3.5 py-2 rounded-full text-xs font-bold cursor-pointer transition-all bg-black text-white shadow-sm"
        : "fleet-filter-btn px-3.5 py-2 rounded-full text-xs font-bold cursor-pointer transition-all bg-white border border-gray-200 text-gray-700 hover:bg-gray-100";
  });

  const grid = document.getElementById("fleet-grid");
  const enrichedBikes = erpState.bikes.map((bike) => {
    const activeRental = erpState.rentals.find((r) => r.bikeId === bike.id && r.status === "active");
    const derivedStatus = bike.status === "maintenance" ? "maintenance" : activeRental ? "rented" : "available";
    return { bike, activeRental, derivedStatus };
  });

  const filtered = enrichedBikes.filter((item) => currentFleetFilter === "all" || item.derivedStatus === currentFleetFilter);
  document.getElementById("fleet-count-label").textContent = `${filtered.length} ${t("fleet_shown")}`;

  if (filtered.length === 0) {
    grid.innerHTML = `<div class="col-span-full rounded-3xl bg-white border border-gray-200 p-8 text-center text-sm text-gray-500">${escapeHtml(t("fleet_empty"))}</div>`;
    return;
  }

  grid.innerHTML = filtered
    .map(({ bike, activeRental, derivedStatus }) => {
      if (derivedStatus === "rented" && activeRental) {
        const analysis = analyzeRentalPayments(activeRental);
        const docsCount = (activeRental.documents || []).length;
        const daysRented = diffDaysInclusive(activeRental.startDate, today);
        const recentDays = [];
        for (let i = 6; i >= 0; i--) {
          const d = addDaysIso(today, -i);
          if (d >= activeRental.startDate) recentDays.push(d);
        }

        const todayBanner =
          analysis.todayStatus === "paid"
            ? `<div class="rounded-xl bg-emerald-50 border border-emerald-200 px-3 py-2 text-xs font-bold text-emerald-800 flex items-center justify-between">
                <span>${escapeHtml(t("paid_today_ok"))} (${activeRental.payments[today]?.method === "transferencia" ? `🏦 ${escapeHtml(t("ratio_bank"))}` : `💵 ${escapeHtml(t("ratio_cash"))}`})</span>
                <button type="button" onclick="markDayPayment('${activeRental.id}', '${today}', 'unpaid', null)" class="text-[10px] underline text-gray-500 hover:text-red-600 cursor-pointer">${escapeHtml(t("btn_correct"))}</button>
              </div>`
            : `<div class="rounded-xl bg-red-50 border-2 border-red-400 p-3 space-y-2">
                <div class="flex items-center justify-between">
                  <span class="text-xs font-black text-red-700">
                    ${escapeHtml(analysis.todayStatus === "unpaid" ? t("unpaid_today_badge") : t("paid_today_q"))} (₲ 50.000)
                  </span>
                </div>
                <div class="grid grid-cols-3 gap-1.5">
                  <button type="button" onclick="markDayPayment('${activeRental.id}', '${today}', 'paid', 'cash')" class="py-1.5 px-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold cursor-pointer">${escapeHtml(t("btn_yes_cash_sm"))}</button>
                  <button type="button" onclick="markDayPayment('${activeRental.id}', '${today}', 'paid', 'transferencia')" class="py-1.5 px-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-bold cursor-pointer">${escapeHtml(t("btn_yes_transf_sm"))}</button>
                  <button type="button" onclick="markDayPayment('${activeRental.id}', '${today}', 'unpaid', null)" class="py-1.5 px-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-[11px] font-bold cursor-pointer">${escapeHtml(t("btn_no_sm"))}</button>
                </div>
              </div>`;

        const gpsWarning = analysis.gpsAlert
          ? `<div class="rounded-xl bg-red-600 text-white px-3 py-2 text-[11px] font-black flex items-center justify-between gap-2">
              <span>🚨 ${analysis.unpaidCount} ${escapeHtml(t("alert_gps_unpaid_word"))} (${formatGs(analysis.unpaidAmount)}) — ${escapeHtml(t("gps_strip_cut"))}</span>
              <button type="button" onclick="toggleGpsCut('${activeRental.id}')" class="px-2 py-0.5 rounded bg-black text-yellow-300 text-[10px] cursor-pointer">${escapeHtml(activeRental.gpsCutTriggered ? t("gps_strip_btn_done") : t("gps_strip_btn"))}</button>
            </div>`
          : analysis.unpaidCount === 1
          ? `<div class="rounded-xl bg-amber-100 text-amber-900 px-3 py-1.5 text-[11px] font-bold">
              ${escapeHtml(t("one_unpaid_warn"))} (${formatGs(analysis.unpaidAmount)})
            </div>`
          : "";

        const dayPillsHtml = recentDays
          .map((d) => {
            const p = activeRental.payments?.[d];
            const [, mm, dd] = d.split("-");
            let cls = "bg-gray-100 text-gray-600 border-gray-200";
            let icon = "•";
            if (p?.status === "paid" && p.method === "cash") {
              cls = "bg-emerald-100 text-emerald-800 border-emerald-300";
              icon = "💵";
            } else if (p?.status === "paid" && p.method === "transferencia") {
              cls = "bg-indigo-100 text-indigo-800 border-indigo-300";
              icon = "🏦";
            } else if (p?.status === "unpaid" || d < today) {
              cls = "bg-red-100 text-red-700 border-red-300";
              icon = "✕";
            }
            return `
              <button type="button" onclick="cycleDayPayment('${activeRental.id}', '${d}')" title="${formatDateFr(d)}" class="flex flex-col items-center px-1.5 py-1 rounded-lg border text-[10px] font-bold cursor-pointer hover:scale-105 transition-transform ${cls}">
                <span>${dd}/${mm}</span>
                <span>${icon}</span>
              </button>
            `;
          })
          .join("");

        return `
          <div class="rounded-3xl bg-white border ${analysis.gpsAlert ? "border-red-500 ring-2 ring-red-200" : "border-gray-200"} shadow-sm overflow-hidden flex flex-col justify-between p-5 space-y-4">
            <div class="space-y-3">
              <div class="flex items-start justify-between gap-3">
                <div class="flex items-center gap-3">
                  <img src="${escapeHtml(bike.image || "assets/images/logo-gl-motors.jpg")}" alt="${escapeHtml(bike.name)}" class="w-14 h-14 rounded-2xl object-contain bg-gray-50 border border-gray-100 p-1" />
                  <div>
                    <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-black uppercase">
                      ${escapeHtml(t("status_rented"))} (${daysRented}${t("word_day_short")})
                    </span>
                    <h3 class="font-extrabold text-base text-gray-900 leading-snug mt-0.5">${escapeHtml(bike.name)}</h3>
                    <p class="text-[11px] text-gray-500">${escapeHtml(t("lbl_plate"))} <strong>${escapeHtml(bike.plate || "—")}</strong> • ${escapeHtml(bike.gpsId || "GPS")}</p>
                  </div>
                </div>
                <button type="button" onclick="openEditBikeModal('${bike.id}')" class="text-xs text-gray-400 hover:text-gray-800 p-1 cursor-pointer">✏️</button>
              </div>

              <div class="rounded-2xl bg-gray-50 border border-gray-100 p-3 text-xs space-y-1">
                <div class="flex justify-between">
                  <span class="text-gray-500">${escapeHtml(t("lbl_client"))}</span>
                  <span class="font-extrabold text-gray-900">${escapeHtml(activeRental.clientName)}</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-gray-500">${escapeHtml(t("lbl_ci_tel"))}</span>
                  <span class="font-semibold text-gray-800">${escapeHtml(activeRental.clientCi)} • ${escapeHtml(activeRental.clientPhone)}</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-gray-500">${escapeHtml(t("lbl_rented_since"))}</span>
                  <span class="font-bold text-gray-900">${formatDateFr(activeRental.startDate)}</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-gray-500">${escapeHtml(t("lbl_total_paid"))}</span>
                  <span class="font-black text-emerald-700">${formatGs(analysis.totalPaidAmount)}</span>
                </div>
              </div>

              ${gpsWarning}
              ${todayBanner}

              <div>
                <p class="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1.5">${escapeHtml(t("last_7_days"))}</p>
                <div class="flex flex-wrap gap-1">${dayPillsHtml}</div>
              </div>
            </div>

            <div class="pt-3 border-t border-gray-100 grid grid-cols-2 gap-2">
              <button type="button" onclick="openContractDocsModal('${activeRental.id}')" class="py-2 px-3 rounded-xl bg-gray-900 hover:bg-gray-800 text-white text-[11px] font-bold cursor-pointer">
                ${escapeHtml(t("btn_contract_docs"))} (${docsCount})
              </button>
              <button type="button" onclick="endRentalAndSwitchPrompt('${activeRental.id}')" class="py-2 px-3 rounded-xl bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-900 text-[11px] font-bold cursor-pointer">
                ${escapeHtml(t("btn_end_switch"))}
              </button>
              <button type="button" onclick="openBikeHistoryModal('${bike.id}')" class="py-1.5 px-3 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 text-[11px] font-semibold cursor-pointer">
                ${escapeHtml(t("btn_bike_history"))}
              </button>
              <button type="button" onclick="openMaintenanceModal('${bike.id}')" class="py-1.5 px-3 rounded-xl bg-red-50 hover:bg-red-100 text-red-700 text-[11px] font-semibold cursor-pointer">
                ${escapeHtml(t("btn_out_service"))}
              </button>
            </div>
          </div>
        `;
      }

      if (derivedStatus === "maintenance") {
        const since = bike.maintenanceSince || today;
        const daysDown = Math.max(1, diffDaysInclusive(since, today));
        const lossEst = daysDown * DAILY_RATE;

        return `
          <div class="rounded-3xl bg-white border-2 border-amber-300 shadow-sm overflow-hidden flex flex-col justify-between p-5 space-y-4">
            <div class="space-y-3">
              <div class="flex items-start justify-between gap-3">
                <div class="flex items-center gap-3">
                  <img src="${escapeHtml(bike.image || "assets/images/logo-gl-motors.jpg")}" alt="${escapeHtml(bike.name)}" class="w-14 h-14 rounded-2xl object-contain bg-gray-50 border border-gray-100 p-1 opacity-75" />
                  <div>
                    <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-100 text-red-800 text-[10px] font-black uppercase">
                      ${escapeHtml(t("status_maintenance"))} (${daysDown}${t("word_day_short")})
                    </span>
                    <h3 class="font-extrabold text-base text-gray-900 leading-snug mt-0.5">${escapeHtml(bike.name)}</h3>
                    <p class="text-[11px] text-gray-500">${escapeHtml(t("lbl_plate"))} <strong>${escapeHtml(bike.plate || "—")}</strong> • ${escapeHtml(bike.gpsId || "GPS")}</p>
                  </div>
                </div>
                <button type="button" onclick="openEditBikeModal('${bike.id}')" class="text-xs text-gray-400 hover:text-gray-800 p-1 cursor-pointer">✏️</button>
              </div>

              <div class="rounded-2xl bg-amber-50 border border-amber-200 p-3.5 text-xs space-y-1.5">
                <p class="font-bold text-amber-900">${escapeHtml(t("maint_reason"))} ${escapeHtml(bike.maintenanceReason || "—")}</p>
                <p class="text-amber-800">${escapeHtml(t("maint_since"))} <strong>${formatDateFr(since)}</strong></p>
                <p class="font-black text-red-700 pt-1 border-t border-amber-200">${escapeHtml(t("maint_loss"))} - ${formatGs(lossEst)}</p>
              </div>
            </div>

            <div class="pt-3 border-t border-gray-100 grid grid-cols-2 gap-2">
              <button type="button" onclick="returnBikeToService('${bike.id}')" class="col-span-2 py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold cursor-pointer">
                ${escapeHtml(t("btn_back_service"))}
              </button>
              <button type="button" onclick="openRepuestoModal('${bike.id}')" class="py-1.5 px-3 rounded-xl bg-amber-100 hover:bg-amber-200 text-amber-900 text-[11px] font-bold cursor-pointer">
                ${escapeHtml(t("btn_add_repuesto_card"))}
              </button>
              <button type="button" onclick="openBikeHistoryModal('${bike.id}')" class="py-1.5 px-3 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 text-[11px] font-semibold cursor-pointer">
                ${escapeHtml(t("btn_bike_history"))}
              </button>
            </div>
          </div>
        `;
      }

      return `
        <div class="rounded-3xl bg-white border border-gray-200 shadow-sm overflow-hidden flex flex-col justify-between p-5 space-y-4">
          <div class="space-y-3">
            <div class="flex items-start justify-between gap-3">
              <div class="flex items-center gap-3">
                <img src="${escapeHtml(bike.image || "assets/images/logo-gl-motors.jpg")}" alt="${escapeHtml(bike.name)}" class="w-14 h-14 rounded-2xl object-contain bg-gray-50 border border-gray-100 p-1" />
                <div>
                  <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 text-[10px] font-black uppercase">
                    ${escapeHtml(t("status_available"))}
                  </span>
                  <h3 class="font-extrabold text-base text-gray-900 leading-snug mt-0.5">${escapeHtml(bike.name)}</h3>
                  <p class="text-[11px] text-gray-500">${escapeHtml(t("lbl_plate"))} <strong>${escapeHtml(bike.plate || "—")}</strong> • ${escapeHtml(bike.gpsId || "GPS")}</p>
                </div>
              </div>
              <button type="button" onclick="openEditBikeModal('${bike.id}')" class="text-xs text-gray-400 hover:text-gray-800 p-1 cursor-pointer">✏️</button>
            </div>

            <div class="rounded-2xl bg-blue-50/50 border border-blue-100 p-3 text-xs text-gray-600">
              ${escapeHtml(t("avail_desc"))}
            </div>
          </div>

          <div class="pt-3 border-t border-gray-100 grid grid-cols-2 gap-2">
            <button type="button" onclick="openRentalModal('${bike.id}', 'active')" class="col-span-2 py-2.5 px-3 rounded-xl bg-[#199E5E] hover:bg-[#14824d] text-white text-xs font-bold cursor-pointer">
              ${escapeHtml(t("btn_start_rental"))}
            </button>
            <button type="button" onclick="openBikeHistoryModal('${bike.id}')" class="py-1.5 px-3 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 text-[11px] font-semibold cursor-pointer">
              ${escapeHtml(t("btn_bike_history"))}
            </button>
            <button type="button" onclick="openMaintenanceModal('${bike.id}')" class="py-1.5 px-3 rounded-xl bg-red-50 hover:bg-red-100 text-red-700 text-[11px] font-semibold cursor-pointer">
              ${escapeHtml(t("btn_out_service"))}
            </button>
          </div>
        </div>
      `;
    })
    .join("");
}

// ==========================================================================
// 10. TIMELINE & POLICE LOOKUP
// ==========================================================================
function setTimelineTab(tab) {
  currentTimelineTab = tab;
  renderTimelineRentals();
}

function renderTimelineRentals() {
  ["active", "future", "completed"].forEach((tab) => {
    const btn = document.getElementById(`timeline-tab-${tab}`);
    if (!btn) return;
    btn.className =
      tab === currentTimelineTab
        ? "timeline-tab-btn px-3.5 py-1.5 rounded-full text-xs font-bold cursor-pointer transition-all bg-black text-white shadow-sm"
        : "timeline-tab-btn px-3.5 py-1.5 rounded-full text-xs font-bold cursor-pointer transition-all text-gray-600 hover:text-gray-900";
  });

  const list = document.getElementById("rentals-timeline-list");
  const filtered = erpState.rentals
    .filter((r) => r.status === currentTimelineTab)
    .sort((a, b) => (b.startDate || "").localeCompare(a.startDate || ""));

  if (filtered.length === 0) {
    list.innerHTML = `<div class="text-xs text-gray-500 text-center py-6 bg-gray-50 rounded-2xl">${escapeHtml(t("timeline_empty"))}</div>`;
    return;
  }

  list.innerHTML = filtered
    .map((r) => {
      const bike = erpState.bikes.find((b) => b.id === r.bikeId);
      const analysis = analyzeRentalPayments(r);
      const docsCount = (r.documents || []).length;

      return `
        <div class="rounded-2xl border border-gray-200 bg-gray-50/70 p-4 flex flex-wrap items-center justify-between gap-4">
          <div class="space-y-1">
            <div class="flex items-center gap-2 flex-wrap">
              <span class="font-extrabold text-sm text-gray-900">${escapeHtml(r.clientName)}</span>
              <span class="text-xs text-gray-500">C.I. ${escapeHtml(r.clientCi)}</span>
              <span class="px-2 py-0.5 rounded-full bg-white border border-gray-200 text-[11px] font-bold text-gray-800">${escapeHtml(bike?.name || "Moto")} (${escapeHtml(bike?.plate || "—")})</span>
            </div>
            <p class="text-xs text-gray-600">
              ${escapeHtml(t("lbl_period"))} <strong>${formatDateFr(r.startDate)}</strong> → <strong>${r.endDate ? formatDateFr(r.endDate) : escapeHtml(t("lbl_ongoing"))}</strong>
              • ${escapeHtml(t("label_collected"))} <strong class="text-emerald-700">${formatGs(analysis.totalPaidAmount)}</strong>
              ${analysis.unpaidAmount > 0 ? `• <strong class="text-red-600">${escapeHtml(t("lbl_unpaid_short"))} ${formatGs(analysis.unpaidAmount)}</strong>` : ""}
            </p>
          </div>
          <div class="flex flex-wrap items-center gap-2">
            ${
              r.status === "future"
                ? `<button type="button" onclick="activateFutureRental('${r.id}')" class="px-3 py-1.5 rounded-full bg-emerald-600 text-white text-xs font-bold cursor-pointer">${escapeHtml(t("btn_start_now"))}</button>`
                : ""
            }
            <button type="button" onclick="openContractDocsModal('${r.id}')" class="px-3 py-1.5 rounded-full bg-gray-900 text-white text-xs font-bold cursor-pointer hover:bg-gray-800">
              ${escapeHtml(t("btn_contract_docs"))} (${docsCount})
            </button>
            <button type="button" onclick="deleteRental('${r.id}')" class="p-1.5 rounded-full text-gray-400 hover:text-red-600 cursor-pointer text-xs">🗑️</button>
          </div>
        </div>
      `;
    })
    .join("");
}

function runPoliceLookup() {
  const dateInput = document.getElementById("police-date-input");
  const bikeFilter = document.getElementById("police-bike-select")?.value || "";
  const textFilter = (document.getElementById("police-text-input")?.value || "").trim().toLowerCase();
  const container = document.getElementById("police-results");

  if (!container) return;
  const targetDate = dateInput?.value || "";

  if (!targetDate && !bikeFilter && !textFilter) {
    container.innerHTML = `<p class="text-xs text-slate-400 italic">${escapeHtml(t("police_empty_hint"))}</p>`;
    return;
  }

  const matches = erpState.rentals.filter((r) => {
    const bike = erpState.bikes.find((b) => b.id === r.bikeId);
    if (bikeFilter && r.bikeId !== bikeFilter) return false;
    if (targetDate) {
      if (r.startDate > targetDate) return false;
      if (r.endDate && r.endDate < targetDate) return false;
    }
    if (textFilter) {
      const hay = `${r.clientName} ${r.clientCi} ${r.clientPhone} ${bike?.name || ""} ${bike?.plate || ""}`.toLowerCase();
      if (!hay.includes(textFilter)) return false;
    }
    return true;
  });

  if (matches.length === 0) {
    container.innerHTML = `<p class="text-xs text-amber-300 font-semibold">${escapeHtml(t("police_no_match"))}</p>`;
    return;
  }

  container.innerHTML = matches
    .map((r) => {
      const bike = erpState.bikes.find((b) => b.id === r.bikeId);
      const docsCount = (r.documents || []).length;
      return `
        <div class="rounded-2xl bg-slate-800 border border-slate-700 p-3.5 flex flex-wrap items-center justify-between gap-3">
          <div class="space-y-0.5">
            <div class="flex items-center gap-2 flex-wrap">
              <span class="font-extrabold text-sm text-white">${escapeHtml(r.clientName)}</span>
              <span class="text-xs px-2 py-0.5 rounded bg-blue-500/20 text-blue-200 font-semibold">C.I. ${escapeHtml(r.clientCi)}</span>
              <span class="text-xs text-emerald-300 font-bold">${escapeHtml(bike?.name || "Moto")} (${escapeHtml(t("lbl_plate"))} ${escapeHtml(bike?.plate || "—")})</span>
            </div>
            <p class="text-xs text-slate-300">
              ${escapeHtml(t("police_period"))} <strong>${formatDateFr(r.startDate)}</strong> ${escapeHtml(t("police_to"))} <strong>${r.endDate ? formatDateFr(r.endDate) : escapeHtml(t("police_present"))}</strong>
              • Tel : ${escapeHtml(r.clientPhone)} • ${escapeHtml(t("police_address"))} ${escapeHtml(r.clientAddress || "—")}
            </p>
          </div>
          <button type="button" onclick="openContractDocsModal('${r.id}')" class="px-3.5 py-2 rounded-full bg-[#34D186] hover:bg-emerald-400 text-black text-xs font-black cursor-pointer">
            ${escapeHtml(t("police_btn_docs"))} (${docsCount})
          </button>
        </div>
      `;
    })
    .join("");
}

// ==========================================================================
// 11. ACTIONS MÉTIER & MODALES
// ==========================================================================
function markDayPayment(rentalId, dateStr, status, method) {
  const rental = erpState.rentals.find((r) => r.id === rentalId);
  if (!rental) return;
  if (!rental.payments) rental.payments = {};
  rental.payments[dateStr] = {
    status,
    method: status === "paid" ? method : null,
    amount: DAILY_RATE,
    updatedAt: Date.now()
  };
  saveState();
}

function cycleDayPayment(rentalId, dateStr) {
  const rental = erpState.rentals.find((r) => r.id === rentalId);
  if (!rental) return;
  const cur = rental.payments?.[dateStr];
  if (!cur || cur.status !== "paid") {
    markDayPayment(rentalId, dateStr, "paid", "cash");
  } else if (cur.method === "cash") {
    markDayPayment(rentalId, dateStr, "paid", "transferencia");
  } else {
    markDayPayment(rentalId, dateStr, "unpaid", null);
  }
}

function settleAllClientUnpaid(rentalId, method) {
  const rental = erpState.rentals.find((r) => r.id === rentalId);
  if (!rental) return;
  const analysis = analyzeRentalPayments(rental);
  if (!rental.payments) rental.payments = {};
  for (const d of analysis.unpaidDates) {
    rental.payments[d] = { status: "paid", method, amount: DAILY_RATE, updatedAt: Date.now() };
  }
  rental.gpsCutTriggered = false;
  saveState();
  openUnpaidDetailsModal();
}

function toggleGpsCut(rentalId) {
  const rental = erpState.rentals.find((r) => r.id === rentalId);
  if (!rental) return;
  rental.gpsCutTriggered = !rental.gpsCutTriggered;
  saveState();
}

function endRentalAndSwitchPrompt(rentalId) {
  const rental = erpState.rentals.find((r) => r.id === rentalId);
  if (!rental) return;
  const bike = erpState.bikes.find((b) => b.id === rental.bikeId);
  const analysis = analyzeRentalPayments(rental);

  let warnMsg = t("confirm_end_rental", { client: rental.clientName, bike: bike?.name || "Moto" });
  if (analysis.unpaidAmount > 0) {
    warnMsg += t("confirm_end_unpaid_warn", { amount: formatGs(analysis.unpaidAmount) });
  }
  if (!confirm(warnMsg)) return;

  rental.status = "completed";
  rental.endDate = getTodayIso();
  if (bike) bike.status = "available";
  saveState();

  if (confirm(t("confirm_start_next"))) {
    openRentalModal(bike?.id || "", "active");
  }
}

function activateFutureRental(rentalId) {
  const rental = erpState.rentals.find((r) => r.id === rentalId);
  if (!rental) return;
  const conflict = erpState.rentals.find((r) => r.bikeId === rental.bikeId && r.status === "active");
  if (conflict) {
    alert(t("alert_conflict_future", { client: conflict.clientName }));
    return;
  }
  rental.status = "active";
  rental.startDate = getTodayIso();
  const bike = erpState.bikes.find((b) => b.id === rental.bikeId);
  if (bike) bike.status = "rented";
  saveState();
}

function deleteRental(rentalId) {
  if (!confirm(t("confirm_delete_rental"))) return;
  const rental = erpState.rentals.find((r) => r.id === rentalId);
  if (rental && rental.status === "active") {
    const bike = erpState.bikes.find((b) => b.id === rental.bikeId);
    if (bike) bike.status = "available";
  }
  erpState.rentals = erpState.rentals.filter((r) => r.id !== rentalId);
  saveState();
}

function openModal(id) {
  document.getElementById(id)?.classList.remove("hidden");
  document.body.style.overflow = "hidden";
}

function closeModal(id) {
  document.getElementById(id)?.classList.add("hidden");
  document.body.style.overflow = "";
}

function populateSelectDropdowns() {
  const bikeOptions = erpState.bikes
    .map((b) => `<option value="${b.id}">${escapeHtml(b.name)} (${escapeHtml(b.plate || "—")})</option>`)
    .join("");

  const policeBikeSel = document.getElementById("police-bike-select");
  if (policeBikeSel) {
    const prev = policeBikeSel.value;
    policeBikeSel.innerHTML = `<option value="">${escapeHtml(t("police_all_bikes"))}</option>${bikeOptions}`;
    policeBikeSel.value = prev;
  }

  const repBikeSel = document.getElementById("repuesto-bike-select");
  if (repBikeSel) {
    repBikeSel.innerHTML = `<option value="">${escapeHtml(t("general_workshop"))}</option>${bikeOptions}`;
  }
}

function openUnpaidDetailsModal() {
  const stats = computeAllFinancials();
  const body = document.getElementById("unpaid-modal-body");

  if (stats.unpaidClientsList.length === 0) {
    body.innerHTML = `
      <div class="rounded-2xl bg-emerald-50 border border-emerald-200 p-6 text-center text-sm font-bold text-emerald-800">
        ${escapeHtml(t("modal_unpaid_empty"))}
      </div>
    `;
  } else {
    body.innerHTML = stats.unpaidClientsList
      .map(({ rental, bike, analysis }) => {
        const phoneClean = (rental.clientPhone || "").replace(/\D/g, "");
        return `
          <div class="rounded-2xl bg-white border ${analysis.gpsAlert ? "border-red-500 ring-2 ring-red-100" : "border-gray-200"} p-4 space-y-3">
            <div class="flex flex-wrap items-start justify-between gap-2">
              <div>
                <div class="flex items-center gap-2 flex-wrap">
                  <span class="font-extrabold text-base text-gray-900">${escapeHtml(rental.clientName)}</span>
                  <span class="text-xs text-gray-500">C.I. ${escapeHtml(rental.clientCi)}</span>
                  ${analysis.gpsAlert ? `<span class="px-2 py-0.5 rounded-full bg-red-600 text-white text-[10px] font-black">🚨 ${escapeHtml(t("gps_strip_cut"))}</span>` : ""}
                </div>
                <p class="text-xs text-gray-600 mt-0.5">${escapeHtml(bike?.name || "Moto")} • Tel : ${escapeHtml(rental.clientPhone)}</p>
                <p class="text-[11px] text-gray-500 mt-1">
                  ${escapeHtml(t("modal_unpaid_days"))} (${analysis.unpaidCount}) : ${analysis.unpaidDates.map(formatDateFr).join(", ")}
                </p>
              </div>
              <div class="text-right">
                <p class="text-xl font-black text-red-600">${formatGs(analysis.unpaidAmount)}</p>
                <p class="text-[10px] text-gray-400">${escapeHtml(t("modal_unpaid_owed"))}</p>
              </div>
            </div>
            <div class="flex flex-wrap items-center gap-2 pt-2 border-t border-gray-100">
              <button type="button" onclick="settleAllClientUnpaid('${rental.id}', 'cash')" class="px-3 py-1.5 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold cursor-pointer">
                ${escapeHtml(t("btn_settle_cash"))}
              </button>
              <button type="button" onclick="settleAllClientUnpaid('${rental.id}', 'transferencia')" class="px-3 py-1.5 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold cursor-pointer">
                ${escapeHtml(t("btn_settle_transfer"))}
              </button>
              ${phoneClean ? `<a href="https://wa.me/${phoneClean}" target="_blank" class="px-3 py-1.5 rounded-full bg-[#25D366] text-white text-xs font-bold">💬 WhatsApp</a>` : ""}
            </div>
          </div>
        `;
      })
      .join("");
  }

  openModal("unpaid-modal");
}

function openAddBikeModal() {
  document.getElementById("bike-modal-title").textContent = t("modal_bike_add");
  document.getElementById("bike-form-id").value = "";
  document.getElementById("bike-form-name").value = "";
  document.getElementById("bike-form-plate").value = "";
  document.getElementById("bike-form-year").value = "2025";
  document.getElementById("bike-form-chassis").value = "";
  document.getElementById("bike-form-gps").value = `GPS-0${erpState.bikes.length + 1}`;
  openModal("add-bike-modal");
}

function openEditBikeModal(bikeId) {
  const bike = erpState.bikes.find((b) => b.id === bikeId);
  if (!bike) return;
  document.getElementById("bike-modal-title").textContent = t("modal_bike_edit");
  document.getElementById("bike-form-id").value = bike.id;
  document.getElementById("bike-form-name").value = bike.name || "";
  document.getElementById("bike-form-plate").value = bike.plate === "—" ? "" : bike.plate || "";
  document.getElementById("bike-form-year").value = bike.year || 2025;
  document.getElementById("bike-form-chassis").value = bike.chassis || "";
  document.getElementById("bike-form-gps").value = bike.gpsId || "";
  document.getElementById("bike-form-image").value = bike.image || "assets/images/logo-gl-motors.jpg";
  openModal("add-bike-modal");
}

function submitBikeForm(e) {
  e.preventDefault();
  const id = document.getElementById("bike-form-id").value;
  const bikeData = {
    name: document.getElementById("bike-form-name").value.trim(),
    plate: document.getElementById("bike-form-plate").value.trim() || "—",
    year: Number(document.getElementById("bike-form-year").value) || 2025,
    chassis: document.getElementById("bike-form-chassis").value.trim(),
    gpsId: document.getElementById("bike-form-gps").value.trim(),
    image: document.getElementById("bike-form-image").value
  };

  if (id) {
    const existing = erpState.bikes.find((b) => b.id === id);
    if (existing) Object.assign(existing, bikeData);
  } else {
    erpState.bikes.push({
      id: `bike-${Date.now()}`,
      ...bikeData,
      status: "available",
      maintenanceReason: "",
      maintenanceSince: null
    });
  }
  closeModal("add-bike-modal");
  saveState();
}

function openRentalModal(defaultBikeId = "", defaultType = "active") {
  const sel = document.getElementById("rental-bike-select");
  const typeSel = document.getElementById("rental-type-select");
  const dateInp = document.getElementById("rental-start-date");

  sel.innerHTML = erpState.bikes
    .map((b) => {
      const hasActive = erpState.rentals.some((r) => r.bikeId === b.id && r.status === "active");
      return `<option value="${b.id}">${escapeHtml(b.name)} ${hasActive ? escapeHtml(t("word_occupied")) : escapeHtml(t("word_free"))}</option>`;
    })
    .join("");

  if (defaultBikeId) sel.value = defaultBikeId;
  if (typeSel) typeSel.value = defaultType;
  if (dateInp) dateInp.value = getTodayIso();

  document.getElementById("rental-client-name").value = "";
  document.getElementById("rental-client-ci").value = "";
  document.getElementById("rental-client-phone").value = "";
  document.getElementById("rental-client-address").value = "";
  document.getElementById("rental-first-pay-status").value = "pending";
  document.getElementById("rental-deposit").value = "0";

  openModal("rental-modal");
}

function submitRentalForm(e) {
  e.preventDefault();
  const bikeId = document.getElementById("rental-bike-select").value;
  let status = document.getElementById("rental-type-select").value;
  const startDate = document.getElementById("rental-start-date").value || getTodayIso();

  const existingActive = erpState.rentals.find((r) => r.bikeId === bikeId && r.status === "active");
  if (status === "active" && existingActive) {
    if (!confirm(t("confirm_force_future", { client: existingActive.clientName }))) return;
    status = "future";
  }

  const firstPay = document.getElementById("rental-first-pay-status").value;
  const payments = {};
  if (status === "active" && (firstPay === "paid_cash" || firstPay === "paid_transferencia")) {
    payments[startDate] = {
      status: "paid",
      method: firstPay === "paid_cash" ? "cash" : "transferencia",
      amount: DAILY_RATE,
      updatedAt: Date.now()
    };
  }

  const newRental = {
    id: `rent-${Date.now()}`,
    bikeId,
    clientName: document.getElementById("rental-client-name").value.trim(),
    clientCi: document.getElementById("rental-client-ci").value.trim(),
    clientPhone: document.getElementById("rental-client-phone").value.trim(),
    clientAddress: document.getElementById("rental-client-address").value.trim(),
    depositAmount: Number(document.getElementById("rental-deposit").value) || 0,
    startDate,
    endDate: null,
    dailyRate: DAILY_RATE,
    status,
    gpsCutTriggered: false,
    payments,
    documents: []
  };

  erpState.rentals.push(newRental);
  if (status === "active") {
    const bike = erpState.bikes.find((b) => b.id === bikeId);
    if (bike) {
      bike.status = "rented";
      bike.maintenanceReason = "";
      bike.maintenanceSince = null;
    }
  }

  closeModal("rental-modal");
  saveState();
  openContractDocsModal(newRental.id);
}

function openRepuestoModal(defaultBikeId = "") {
  populateSelectDropdowns();
  const sel = document.getElementById("repuesto-bike-select");
  if (sel && defaultBikeId) sel.value = defaultBikeId;
  document.getElementById("repuesto-desc").value = "";
  document.getElementById("repuesto-amount").value = "";
  document.getElementById("repuesto-method").value = "cash";
  document.getElementById("repuesto-date").value = getTodayIso();
  openModal("repuesto-modal");
}

function submitRepuestoForm(e) {
  e.preventDefault();
  erpState.repuestos.push({
    id: `rep-${Date.now()}`,
    bikeId: document.getElementById("repuesto-bike-select").value,
    description: document.getElementById("repuesto-desc").value.trim(),
    amount: Number(document.getElementById("repuesto-amount").value) || 0,
    method: document.getElementById("repuesto-method").value,
    date: document.getElementById("repuesto-date").value || getTodayIso()
  });
  closeModal("repuesto-modal");
  saveState();
}

function deleteRepuesto(repId) {
  if (!confirm(t("confirm_delete_rep"))) return;
  erpState.repuestos = erpState.repuestos.filter((r) => r.id !== repId);
  saveState();
}

function openMaintenanceModal(bikeId) {
  document.getElementById("maint-bike-id").value = bikeId;
  document.getElementById("maint-reason").value = "";
  document.getElementById("maint-since").value = getTodayIso();
  openModal("maintenance-modal");
}

function submitMaintenanceForm(e) {
  e.preventDefault();
  const bikeId = document.getElementById("maint-bike-id").value;
  const sinceDate = document.getElementById("maint-since").value || getTodayIso();
  const bike = erpState.bikes.find((b) => b.id === bikeId);
  if (bike) {
    const activeRental = erpState.rentals.find((r) => r.bikeId === bikeId && r.status === "active");
    if (activeRental) {
      if (confirm(t("confirm_maint_close", { client: activeRental.clientName, date: formatDateFr(sinceDate) }))) {
        activeRental.status = "completed";
        activeRental.endDate = sinceDate;
      }
    }
    bike.status = "maintenance";
    bike.maintenanceReason = document.getElementById("maint-reason").value.trim();
    bike.maintenanceSince = sinceDate;
  }
  closeModal("maintenance-modal");
  saveState();
}

function returnBikeToService(bikeId) {
  const bike = erpState.bikes.find((b) => b.id === bikeId);
  if (!bike) return;
  const activeRental = erpState.rentals.find((r) => r.bikeId === bikeId && r.status === "active");
  bike.status = activeRental ? "rented" : "available";
  bike.maintenanceReason = "";
  bike.maintenanceSince = null;
  saveState();
}

function openAdjustBalanceModal(type) {
  document.getElementById("adjust-account-type").value = type;
  document.getElementById("adjust-modal-title").textContent = type === "cash" ? t("modal_adj_cash") : t("modal_adj_bank");
  document.getElementById("adjust-amount-input").value =
    type === "cash" ? erpState.initialCash || 0 : erpState.initialTransferencia || 0;
  openModal("adjust-balance-modal");
}

function submitAdjustBalance(e) {
  e.preventDefault();
  const type = document.getElementById("adjust-account-type").value;
  const val = Number(document.getElementById("adjust-amount-input").value) || 0;
  if (type === "cash") erpState.initialCash = val;
  else erpState.initialTransferencia = val;
  closeModal("adjust-balance-modal");
  saveState();
}

function openBikeHistoryModal(bikeId) {
  const bike = erpState.bikes.find((b) => b.id === bikeId);
  if (!bike) return;
  document.getElementById("bike-history-title").textContent = `${bike.name} (${bike.plate || "—"})`;

  const bikeRentals = erpState.rentals
    .filter((r) => r.bikeId === bikeId)
    .sort((a, b) => (b.startDate || "").localeCompare(a.startDate || ""));
  const bikeReps = erpState.repuestos.filter((rep) => rep.bikeId === bikeId);

  const body = document.getElementById("bike-history-body");
  body.innerHTML = `
    <div class="space-y-2">
      <h4 class="text-xs font-bold uppercase tracking-wider text-gray-500">${escapeHtml(t("timeline_title"))} (${bikeRentals.length})</h4>
      ${
        bikeRentals.length === 0
          ? `<p class="text-xs text-gray-500 italic bg-white p-4 rounded-xl border border-gray-200">${escapeHtml(t("timeline_empty"))}</p>`
          : bikeRentals
              .map((r) => {
                const an = analyzeRentalPayments(r);
                return `
                  <div class="rounded-2xl bg-white border border-gray-200 p-3.5 flex flex-wrap items-center justify-between gap-2 text-xs">
                    <div>
                      <p class="font-extrabold text-gray-900">${escapeHtml(r.clientName)} <span class="font-normal text-gray-500">(C.I. ${escapeHtml(r.clientCi)})</span></p>
                      <p class="text-gray-600">${formatDateFr(r.startDate)} → ${r.endDate ? formatDateFr(r.endDate) : escapeHtml(t("lbl_ongoing"))} • <strong class="text-emerald-700">${formatGs(an.totalPaidAmount)}</strong></p>
                    </div>
                    <button type="button" onclick="closeModal('bike-history-modal'); openContractDocsModal('${r.id}')" class="px-3 py-1.5 rounded-full bg-gray-900 text-white font-bold cursor-pointer">
                      📁 Docs (${(r.documents || []).length})
                    </button>
                  </div>
                `;
              })
              .join("")
      }
    </div>
    <div class="space-y-2 pt-2">
      <h4 class="text-xs font-bold uppercase tracking-wider text-gray-500">${escapeHtml(t("period_repuestos"))} (${bikeReps.length})</h4>
      ${
        bikeReps.length === 0
          ? `<p class="text-xs text-gray-500 italic bg-white p-4 rounded-xl border border-gray-200">${escapeHtml(t("no_repuestos"))}</p>`
          : bikeReps
              .map(
                (rep) => `
                  <div class="rounded-xl bg-white border border-gray-200 px-3.5 py-2.5 flex justify-between text-xs">
                    <span class="font-bold text-gray-800">${escapeHtml(rep.description)} (${formatDateFr(rep.date)})</span>
                    <span class="font-black text-amber-700">${formatGs(rep.amount)} (${rep.method})</span>
                  </div>
                `
              )
              .join("")
      }
    </div>
  `;
  openModal("bike-history-modal");
}

// ==========================================================================
// 12. ESPACE CONTRAT, DOCUMENTS & IMPRESSION CONTRAT PDF
// ==========================================================================
function openContractDocsModal(rentalId) {
  activeDocsRentalId = rentalId;
  const rental = erpState.rentals.find((r) => r.id === rentalId);
  if (!rental) return;
  const bike = erpState.bikes.find((b) => b.id === rental.bikeId);

  document.getElementById("docs-modal-title").textContent = `${rental.clientName} — ${bike?.name || "Moto"}`;
  document.getElementById("docs-client-summary").innerHTML = `
    <div class="text-xs space-y-1">
      <p class="font-extrabold text-sm text-gray-900">${escapeHtml(rental.clientName)} <span class="text-gray-500 font-medium">(C.I. ${escapeHtml(rental.clientCi)})</span></p>
      <p class="text-gray-600">Tel : <strong>${escapeHtml(rental.clientPhone)}</strong> • ${escapeHtml(t("police_address"))} ${escapeHtml(rental.clientAddress || "—")}</p>
      <p class="text-gray-600">Moto : <strong>${escapeHtml(bike?.name || "")}</strong> (${escapeHtml(t("lbl_plate"))} ${escapeHtml(bike?.plate || "—")}) • ${formatDateFr(rental.startDate)}</p>
    </div>
    <button type="button" onclick="printLegalContract('${rental.id}')" class="px-4 py-2.5 rounded-full bg-[#199E5E] hover:bg-[#14824d] text-white text-xs font-extrabold shadow-sm cursor-pointer">
      ${escapeHtml(t("btn_print_contract"))}
    </button>
  `;

  renderDocsFilesList(rental);
  openModal("contract-docs-modal");
}

function renderDocsFilesList(rental) {
  const grid = document.getElementById("docs-files-grid");
  const docs = rental.documents || [];
  if (docs.length === 0) {
    grid.innerHTML = `<div class="col-span-full text-xs text-gray-500 italic bg-white p-6 rounded-2xl border border-gray-200 text-center">${escapeHtml(t("stored_docs_empty"))}</div>`;
    return;
  }

  grid.innerHTML = docs
    .map((doc) => {
      const isImg = (doc.mimeType || "").startsWith("image/") && doc.dataUrl;
      return `
        <div class="rounded-2xl bg-white border border-gray-200 p-3 flex items-center gap-3 shadow-2xs">
          <div class="w-14 h-14 rounded-xl bg-gray-100 border border-gray-200 overflow-hidden flex items-center justify-center flex-shrink-0">
            ${isImg ? `<img src="${doc.dataUrl}" alt="${escapeHtml(doc.name)}" class="w-full h-full object-cover" />` : `<span class="text-2xl">📄</span>`}
          </div>
          <div class="min-w-0 flex-1 text-xs space-y-1">
            <p class="font-extrabold text-gray-900 truncate">${escapeHtml(doc.docType)}</p>
            <p class="text-[11px] text-gray-500 truncate">${escapeHtml(doc.name)}</p>
            <div class="flex items-center gap-2 pt-1">
              <button type="button" onclick="viewStoredDocument('${rental.id}', '${doc.id}')" class="px-2.5 py-1 rounded-lg bg-gray-900 text-white text-[10px] font-bold cursor-pointer">${escapeHtml(t("btn_view"))}</button>
              <button type="button" onclick="downloadStoredDocument('${rental.id}', '${doc.id}')" class="px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-900 text-[10px] font-bold cursor-pointer">${escapeHtml(t("btn_download"))}</button>
              <button type="button" onclick="deleteStoredDocument('${rental.id}', '${doc.id}')" class="text-gray-400 hover:text-red-600 text-[11px] cursor-pointer ml-auto">🗑️</button>
            </div>
          </div>
        </div>
      `;
    })
    .join("");
}

function compressImageDataUrl(file) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (ev) => {
      const rawDataUrl = ev.target.result;
      if (!file.type.startsWith("image/")) {
        resolve({ rawDataUrl, syncedDataUrl: rawDataUrl });
        return;
      }
      const img = new Image();
      img.onload = () => {
        const maxDim = 900;
        let w = img.width;
        let h = img.height;
        if (w > maxDim || h > maxDim) {
          if (w > h) {
            h = Math.round((h * maxDim) / w);
            w = maxDim;
          } else {
            w = Math.round((w * maxDim) / h);
            h = maxDim;
          }
        }
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, w, h);
        const compressed = canvas.toDataURL("image/jpeg", 0.65);
        resolve({ rawDataUrl, syncedDataUrl: compressed });
      };
      img.onerror = () => resolve({ rawDataUrl, syncedDataUrl: rawDataUrl });
      img.src = rawDataUrl;
    };
    reader.readAsDataURL(file);
  });
}

async function handleDocumentUpload(e) {
  const files = Array.from(e.target.files || []);
  if (!files.length || !activeDocsRentalId) return;
  const rental = erpState.rentals.find((r) => r.id === activeDocsRentalId);
  if (!rental) return;

  const docType = document.getElementById("upload-doc-type")?.value || "Document";
  if (!rental.documents) rental.documents = [];

  for (const file of files) {
    const docId = `doc-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const { rawDataUrl, syncedDataUrl } = await compressImageDataUrl(file);
    await saveFileToIdb(docId, rawDataUrl);

    rental.documents.push({
      id: docId,
      name: file.name,
      docType,
      mimeType: file.type || "image/jpeg",
      dataUrl: syncedDataUrl,
      uploadedAt: new Date().toISOString()
    });
  }

  e.target.value = "";
  saveState();
  renderDocsFilesList(rental);
}

async function viewStoredDocument(rentalId, docId) {
  const rental = erpState.rentals.find((r) => r.id === rentalId);
  const doc = rental?.documents?.find((d) => d.id === docId);
  if (!doc) return;

  const fullDataUrl = (await getFileFromIdb(docId)) || doc.dataUrl;
  if (!fullDataUrl) {
    alert("Archivo grande archivado en el dispositivo original / Large file archived on original device.");
    return;
  }
  document.getElementById("viewer-doc-name").textContent = `${doc.docType} — ${doc.name}`;
  const dlBtn = document.getElementById("viewer-doc-download");
  dlBtn.href = fullDataUrl;
  dlBtn.download = doc.name || "document";

  const content = document.getElementById("viewer-doc-content");
  if ((doc.mimeType || "").includes("pdf")) {
    content.innerHTML = `<iframe src="${fullDataUrl}" class="w-full h-full min-h-[75vh] rounded-xl bg-white"></iframe>`;
  } else {
    content.innerHTML = `<img src="${fullDataUrl}" alt="${escapeHtml(doc.name)}" class="max-h-[82vh] max-w-full object-contain rounded-xl shadow-2xl" />`;
  }
  openModal("doc-viewer-modal");
}

async function downloadStoredDocument(rentalId, docId) {
  const rental = erpState.rentals.find((r) => r.id === rentalId);
  const doc = rental?.documents?.find((d) => d.id === docId);
  if (!doc) return;

  const fullDataUrl = (await getFileFromIdb(docId)) || doc.dataUrl;
  if (!fullDataUrl) {
    alert("Archivo grande archivado en el dispositivo original / Large file archived on original device.");
    return;
  }
  const a = document.createElement("a");
  a.href = fullDataUrl;
  a.download = `${rental.clientName.replace(/\s+/g, "_")}_${doc.docType.replace(/\s+/g, "_")}_${doc.name}`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

function deleteStoredDocument(rentalId, docId) {
  if (!confirm(t("confirm_delete_doc"))) return;
  const rental = erpState.rentals.find((r) => r.id === rentalId);
  if (!rental) return;
  rental.documents = (rental.documents || []).filter((d) => d.id !== docId);
  saveState();
  renderDocsFilesList(rental);
}

function printLegalContract(rentalId) {
  const rental = erpState.rentals.find((r) => r.id === rentalId);
  if (!rental) return;
  const bike = erpState.bikes.find((b) => b.id === rental.bikeId);

  const w = window.open("", "_blank");
  if (!w) return;

  w.document.write(`
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8" />
      <title>Contrato de Alquiler - ${escapeHtml(rental.clientName)}</title>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.5; color: #111; max-width: 800px; margin: 30px auto; padding: 20px; font-size: 13px; }
        h1 { text-align: center; font-size: 18px; border-bottom: 2px solid #000; padding-bottom: 10px; }
        .box { border: 1px solid #ccc; padding: 12px; border-radius: 6px; margin-bottom: 16px; background: #f9f9f9; }
        .sigs { display: flex; justify-content: space-between; margin-top: 60px; }
        .sig { width: 42%; border-top: 1px solid #000; text-align: center; padding-top: 6px; font-weight: bold; }
        @media print { .no-print { display: none; } }
      </style>
    </head>
    <body>
      <div class="no-print" style="margin-bottom:20px; text-align:right;">
        <button onclick="window.print()" style="padding:10px 20px; background:#000; color:#fff; border:none; border-radius:20px; cursor:pointer; font-weight:bold;">🖨️ Imprimir / Guardar PDF</button>
      </div>
      <h1>CONTRATO DE LOCACIÓN DE MOTOCICLETA — G&amp;L MOTORS E.A.S.</h1>
      <div class="box">
        <strong>LOCADOR :</strong> G&amp;L MOTORS E.A.S. (Representante Legal : Adán Andrés Pereira Escobar, C.I. 4.274.384), domiciliada en Av. Gobernador Irala, Cacique Areguá, Paraguay. Tel: +595 995 620 416.<br/>
        <strong>LOCATARIO (CONDUCTOR) :</strong> ${escapeHtml(rental.clientName)} | C.I./Pasaporte N° : <strong>${escapeHtml(rental.clientCi)}</strong> | Tel : ${escapeHtml(rental.clientPhone)} | Domicilio : ${escapeHtml(rental.clientAddress || "A completar")}.
      </div>
      <div class="box">
        <strong>VEHÍCULO ENTREGADO :</strong> ${escapeHtml(bike?.name || "Motocicleta 150cc")} | Placa (Chapa) : <strong>${escapeHtml(bike?.plate || "En trámite")}</strong> | Chasis : ${escapeHtml(bike?.chassis || "S/N")} | Rastreador GPS : ${escapeHtml(bike?.gpsId || "Activo")}.<br/>
        <strong>FECHA DE INICIO :</strong> ${formatDateFr(rental.startDate)} | <strong>GARANTÍA :</strong> ${formatGs(rental.depositAmount || 0)}.
      </div>
      <p><strong>CLÁUSULA PRIMERA (Precio y Pago Diario No Negociable) :</strong> El precio del alquiler diario queda fijado en la suma única de <strong>₲ 50.000 (Guaraníes cincuenta mil) por día</strong>, pagadero diariamente en Efectivo o por Transferencia SIPAP (Banco Mango Alias C.I. 4274384).</p>
      <p><strong>CLÁUSULA SEGUNDA (Control GPS y Recuperación por Mora) :</strong> La motocicleta cuenta con sistema de rastreo satelital y corte de corriente a distancia. En caso de acumular <strong>2 (dos) o más días de pago impagos</strong> sin justificación ni acuerdo previo, G&amp;L MOTORS E.A.S. queda expresamente autorizada a ejecutar el <strong>bloqueo remoto del motor vía GPS</strong> y proceder a la recuperación inmediata del vehículo en la vía pública o domicilio declarado.</p>
      <p><strong>CLÁUSULA TERCERA (Mantenimiento Mecánico Incluido) :</strong> El mantenimiento preventivo (cambio de aceite semanal, frenos, transmisión por desgaste normal) está 100% cubierto en el taller propio de G&amp;L MOTORS. El locatario se compromete a presentar la unidad cada semana para su revisión obligatoria.</p>
      <p><strong>CLÁUSULA CUARTA (Responsabilidad Civil y Tránsito) :</strong> El locatario asume la responsabilidad exclusiva ante multas, infracciones a la Ley N° 5016/2014 o daños causados a terceros durante todo el período que figure bajo su custodia en el registro de G&amp;L MOTORS.</p>
      <div class="sigs">
        <div class="sig">Firma Locador<br/>G&amp;L MOTORS E.A.S.</div>
        <div class="sig">Firma Locatario<br/>${escapeHtml(rental.clientName)} (C.I. ${escapeHtml(rental.clientCi)})</div>
      </div>
    </body>
    </html>
  `);
  w.document.close();
}

// ==========================================================================
// 13. SAUVEGARDE EXPORT / IMPORT JSON
// ==========================================================================
function openBackupModal() {
  openModal("backup-modal");
}

function exportDatabaseJson() {
  const blob = new Blob([JSON.stringify(erpState, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `glmotors_backup_${getTodayIso()}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function importDatabaseJson(e) {
  const file = e.target.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (ev) => {
    try {
      const parsed = JSON.parse(ev.target.result);
      if (!parsed || !Array.isArray(parsed.bikes)) {
        alert("Invalid JSON backup file.");
        return;
      }
      erpState = { ...createDefaultState(), ...parsed };
      saveState();
      closeModal("backup-modal");
    } catch {
      alert("Error reading JSON file.");
    }
  };
  reader.readAsText(file);
}

// ==========================================================================
// 14. INITIALIZATION & LIVE CROSS-DEVICE AUTO-SYNC
// ==========================================================================
document.addEventListener("DOMContentLoaded", () => {
  checkAuthOnLoad();
  const policeDateInp = document.getElementById("police-date-input");
  if (policeDateInp) policeDateInp.value = getTodayIso();

  setAdminLang(currentAdminLang, false);
  syncFromCloud(false);

  // Auto-refresh from server when switching back to phone/PC tab
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible" && isAuthenticated()) {
      syncFromCloud(false);
    }
  });
  window.addEventListener("focus", () => {
    if (isAuthenticated()) syncFromCloud(false);
  });

  // Gentle 20s background cloud refresh so both partners stay live-synced
  setInterval(() => {
    if (document.visibilityState === "visible" && isAuthenticated() && cloudSyncState === "ok") {
      syncFromCloud(false);
    }
  }, 20000);
});
