const { EmbedBuilder } = require('discord.js');

/* =============================
   EMBED UTAMA (GENERAL)
============================= */
function modEmbed(options = {}) {
  const {
    title,
    description,
    color = 0x2941F2,

    thumbnail,
    image, // ✅ TAMBAHAN (POSTER BESAR)

    footer = { text: 'JLS Gaming 🎮' },
    timestamp = true,
    fields = [],
  } = options;

  const embed = new EmbedBuilder().setColor(color);

  if (title) embed.setTitle(title);
  if (description) embed.setDescription(description);

  // ✅ SUPPORT GAMBAR
  if (thumbnail) embed.setThumbnail(thumbnail);
  if (image) embed.setImage(image);

  if (fields.length > 0) embed.addFields(fields);

  if (footer) embed.setFooter(footer);
  if (timestamp) embed.setTimestamp();

  return embed;
}

/* =============================
   EMBED KHUSUS ANIME SCHEDULE
============================= */
function animeScheduleEmbed({
  title,
  description,
  thumbnail,
  image, // ✅ TAMBAHAN
  fields = [],
  isWeekly = false,
}) {
  return modEmbed({
    title,
    description,
    thumbnail,
    image, // ✅ PASS KE modEmbed
    fields,
    footer: {
      text: isWeekly
        ? 'Anime minggu ini • Data dari Jikan • WIB'
        : 'Anime hari ini • Data dari Jikan • WIB',
    },
    timestamp: true,
  });
}

/* =============================
   UTILITIES
============================= */

// Batasi teks agar tidak melebihi limit Discord
function limitText(text = '', max = 1024) {
  if (!text) return '';
  return text.length <= max
    ? text
    : text.slice(0, max - 3) + '...';
}

// Format genre anime (maks 3)
function formatGenres(genres = []) {
  return genres.length
    ? genres.slice(0, 3).join(', ')
    : 'Tidak diketahui';
}

// Format durasi
function formatDuration(ms) {
  if (!ms || ms < 1000) return 'kurang dari 1 detik';

  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  const sec = seconds % 60;
  const min = minutes % 60;
  const hr = hours % 24;

  const parts = [];
  if (days > 0) parts.push(`${days} hari`);
  if (hr > 0) parts.push(`${hr} jam`);
  if (min > 0) parts.push(`${min} menit`);
  if (sec > 0) parts.push(`${sec} detik`);

  return parts.join(' ');
}

/* =============================
   CARD ANIME (ANILIST STYLE)
============================= */
function scheduleCard(anime, { showDay = false } = {}) {
  const date = new Date(anime.airingAt * 1000);

  const time = date.toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Jakarta',
  });

  const day = date.toLocaleDateString('id-ID', {
    weekday: 'long',
    timeZone: 'Asia/Jakarta',
  });

  const media = anime.media;

  return {
    name: `🎬 ${media.title.romaji}`,
    value:
      `${showDay ? `📅 **${day}**\n` : ''}` +
      `⏰ **${time} WIB**\n` +
      `📺 Episode **${anime.episode}**\n\n` +
      `🏷️ **Genre**: ${formatGenres(media.genres)}\n` +
      `🏢 **Studio**: ${
        media.studios?.nodes?.[0]?.name || 'Tidak diketahui'
      }\n` +
      `📡 **Platform**: ${
        require('./animePlatform').detectPlatform(media) ||
        'Belum tersedia'
      }`,
    inline: false,
  };
}

/* =============================
   EXPORT
============================= */
module.exports = {
  modEmbed,
  animeScheduleEmbed,
  scheduleCard,
  formatDuration,
  limitText,
  formatGenres,
};