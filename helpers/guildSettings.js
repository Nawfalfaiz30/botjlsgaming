const fs = require('fs');
const path = require('path');

/* =====================
   FILE PATH
===================== */

const DATA_DIR = path.join(__dirname, '../data');
const FILE_PATH = path.join(DATA_DIR, 'guildSettings.json');

/* =====================
   INIT FILE & FOLDER
===================== */

function ensureFile() {
  // Buat folder data jika belum ada
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  // Buat file json jika belum ada
  if (!fs.existsSync(FILE_PATH)) {
    fs.writeFileSync(FILE_PATH, JSON.stringify({}, null, 2));
  }
}

/* =====================
   READ / WRITE
===================== */

function readData() {
  ensureFile();
  try {
    const raw = fs.readFileSync(FILE_PATH, 'utf8');
    return JSON.parse(raw);
  } catch (err) {
    console.error('[GUILD SETTINGS] Gagal membaca file:', err);
    return {};
  }
}

function writeData(data) {
  ensureFile();
  fs.writeFileSync(FILE_PATH, JSON.stringify(data, null, 2));
}

/* =====================
   LOG CHANNEL
===================== */

/**
 * Set channel log untuk guild
 * @param {string} guildId
 * @param {string} channelId
 */
function setLogChannel(guildId, channelId) {
  const data = readData();

  if (!data[guildId]) {
    data[guildId] = {};
  }

  data[guildId].logChannelId = channelId;
  writeData(data);
}

/**
 * Ambil channel log guild
 * @param {string} guildId
 * @returns {string|null}
 */
function getLogChannel(guildId) {
  const data = readData();
  return data[guildId]?.logChannelId || null;
}

/**
 * Hapus channel log guild
 * @param {string} guildId
 */
function removeLogChannel(guildId) {
  const data = readData();

  if (data[guildId]) {
    delete data[guildId].logChannelId;
    writeData(data);
  }
}

/* =====================
   GENERIC SETTINGS (FUTURE PROOF)
===================== */

/**
 * Set setting bebas (untuk fitur masa depan)
 */
function setGuildSetting(guildId, key, value) {
  const data = readData();

  if (!data[guildId]) {
    data[guildId] = {};
  }

  data[guildId][key] = value;
  writeData(data);
}

/**
 * Ambil setting bebas
 */
function getGuildSetting(guildId, key, defaultValue = null) {
  const data = readData();
  return data[guildId]?.[key] ?? defaultValue;
}

/* =====================
   EXPORTS
===================== */

module.exports = {
  // Log channel
  setLogChannel,
  getLogChannel,
  removeLogChannel,

  // Generic (future use)
  setGuildSetting,
  getGuildSetting,
};
