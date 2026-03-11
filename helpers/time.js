/**
 * ======================================================
 * helpers/time.js
 * Time utilities (ANTI TIMEZONE BUG)
 *
 * Semua perhitungan berbasis UTC
 * Tidak bergantung timezone server
 *
 * WIB = UTC +7
 * JST = UTC +9
 * ======================================================
 */

const HOUR = 60 * 60 * 1000;

const TZ = {
  UTC: 0,
  WIB: 7,
  JST: 9,
};

/* ======================================================
   DAY INDEX (MAL)
====================================================== */

const DAY_INDEX = {
  Sundays: 0,
  Mondays: 1,
  Tuesdays: 2,
  Wednesdays: 3,
  Thursdays: 4,
  Fridays: 5,
  Saturdays: 6,
};

const DAY_NAME_ID = [
  'Minggu',
  'Senin',
  'Selasa',
  'Rabu',
  'Kamis',
  'Jumat',
  'Sabtu',
];

/* ======================================================
   BASE TIME
====================================================== */

/**
 * Timestamp UTC sekarang
 */
function nowUTC() {
  return Date.now();
}

/**
 * Timestamp WIB sekarang
 */
function nowWIB() {
  return nowUTC() + TZ.WIB * HOUR;
}

/**
 * Timestamp JST sekarang
 */
function nowJST() {
  return nowUTC() + TZ.JST * HOUR;
}

/* ======================================================
   CORE CONVERSION (PALING PENTING)
====================================================== */

/**
 * Broadcast MAL (JST) ➜ timestamp WIB
 *
 * @param {string} broadcastDay - "Sundays" ... "Saturdays"
 * @param {string} broadcastTime - "HH:mm"
 * @returns {number|null}
 */
function buildAiringWIB(broadcastDay, broadcastTime) {
  if (!broadcastDay || !broadcastTime) return null;

  const [hour, minute] = broadcastTime.split(':').map(Number);

  // base UTC hari ini (00:00)
  const baseUTC = new Date();
  baseUTC.setUTCHours(0, 0, 0, 0);

  // hari sekarang di JST
  const todayJST =
    (baseUTC.getUTCDay() + 1) % 7;

  const targetJST = DAY_INDEX[broadcastDay];

  let diff = targetJST - todayJST;
  if (diff < 0) diff += 7;

  // set tanggal JST yang benar
  baseUTC.setUTCDate(baseUTC.getUTCDate() + diff);

  // set jam JST → UTC
  baseUTC.setUTCHours(hour - 9, minute, 0, 0);

  // UTC → WIB
  return baseUTC.getTime() + TZ.WIB * HOUR;
}

/* ======================================================
   FORMAT
====================================================== */

/**
 * Format jam WIB HH:mm
 */
function formatTimeWIB(ts) {
  return new Date(ts).toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Jakarta',
  });
}

/**
 * Format tanggal WIB lengkap
 */
function formatDateWIB(ts) {
  const d = new Date(ts);
  const day = DAY_NAME_ID[d.getUTCDay()];
  const date = d.getUTCDate().toString().padStart(2, '0');
  const month = d.toLocaleString('id-ID', {
    month: 'long',
    timeZone: 'Asia/Jakarta',
  });
  const year = d.getUTCFullYear();

  return `${day}, ${date} ${month} ${year}`;
}

/* ======================================================
   RANGE
====================================================== */

/**
 * Apakah dalam 24 jam ke depan (WIB)
 */
function isWithinNext24h(ts) {
  const now = nowWIB();
  return ts >= now && ts <= now + 24 * HOUR;
}

/* ======================================================
   EXPORT
====================================================== */

module.exports = {
  TZ,
  nowUTC,
  nowWIB,
  nowJST,
  buildAiringWIB,
  formatTimeWIB,
  formatDateWIB,
  isWithinNext24h,
};
