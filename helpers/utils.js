module.exports = {
  getRandom(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  }
};

// helpers/utils.js

/**
 * Fungsi untuk memotong teks panjang agar aman ditampilkan di embed (maks ~1000 karakter)
 * @param {string} text - Teks yang ingin dipotong
 * @param {number} [maxLength=1000] - Panjang maksimal
 * @returns {string}
 */
function truncateText(text, maxLength = 1000) {
  if (!text || text.length <= maxLength) return text;
  return text.substring(0, maxLength - 3) + '...';
}

/**
 * Mengambil emoji angka Discord (1️⃣ sampai 🔟)
 * @param {number} num - Angka 1 sampai 10
 * @returns {string} emoji angka Discord
 */
function getNumberEmoji(num) {
  const emojis = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟'];
  return emojis[num - 1] || '❓';
}

/**
 * Membuat timestamp Discord yang relative dan readable
 * @param {Date|number} date - Date object atau timestamp (ms)
 * @param {string} [style='R'] - Format style Discord: t, T, d, D, f, F, R
 * @returns {string} Contoh: <t:1640995200:R>
 */
function discordTimestamp(date, style = 'R') {
  const timestamp = typeof date === 'number' ? date : Math.floor(date.getTime() / 1000);
  return `<t:${timestamp}:${style}>`;
}

/**
 * Memformat username + discriminator menjadi tag lengkap (jika ada)
 * @param {import('discord.js').User | import('discord.js').GuildMember} user
 * @returns {string}
 */
function getUserTag(user) {
  if (!user) return 'Unknown#0000';
  return user.tag || `${user.username}#${user.discriminator || '0000'}`;
}

/**
 * Memeriksa apakah string adalah URL yang valid
 * @param {string} str - String yang dicek
 * @returns {boolean}
 */
function isValidUrl(str) {
  try {
    new URL(str);
    return true;
  } catch {
    return false;
  }
}

/**
 * Menghasilkan warna random untuk embed (hex number)
 * @returns {number} Warna hex (0xRRGGBB)
 */
function randomColor() {
  return Math.floor(Math.random() * 16777215); // 0x000000 - 0xFFFFFF
}

/**
 * Membuat string loading sederhana (bisa dipakai di deferReply)
 * @param {string} [text='Menghitung...'] - Teks loading
 * @returns {EmbedBuilder}
 */
function loadingEmbed(text = 'Menghitung...') {
  return new EmbedBuilder()
    .setColor(0xFF69B4)
    .setTitle('⏳ Loading...')
    .setDescription(text)
    .setTimestamp();
}

module.exports = {
  truncateText,
  getNumberEmoji,
  discordTimestamp,
  getUserTag,
  isValidUrl,
  randomColor,
  loadingEmbed,
};