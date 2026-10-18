const cron = require('node-cron');
const { EmbedBuilder } = require('discord.js');
const { getAiringAnime } = require('../helpers/anilistService');

// ================= CONFIG =================

const ANIME_CHANNEL_ID = process.env.ANIME_CHANNEL_ID || '1425803587526594621';
const ROLE_ID = process.env.ANIME_ROLE_ID || '1425791942003789928';

const WIB = 'Asia/Jakarta';

const scheduledReminders = new Set();
let cachedChannel = null;

// ================= EXPORT =================

module.exports = client => {
  // Scan awal saat bot startup (tunggu 5 detik agar bot fully ready)
  setTimeout(() => {
    runScan(client, { sendList: true, label: 'Startup' });
  }, 5000);

  // Scan rutin setiap jam untuk menjadwalkan reminder episode baru
  cron.schedule('7 * * * *', () => {
    runScan(client, { sendList: false, label: 'Hourly' });
  }, { timezone: WIB });

  // Kirim "Koran Anime" harian setiap pukul 06:00 WIB
  cron.schedule('0 6 * * *', () => {
    cleanupExpiredReminders();
    runScan(client, { sendList: true, label: 'Daily 06:00' });
  }, { timezone: WIB });
};

// ================= CORE LOGIC =================

async function runScan(client, { sendList = false, label = 'Scan' } = {}) {
  console.log(`[ANIME] ${label} scan started`);

  const channel = await getChannel(client);
  if (!channel) {
    console.warn(`[ANIME] Channel ${ANIME_CHANNEL_ID} tidak ditemukan atau bot tidak memiliki izin.`);
    return;
  }

  let animeList = [];
  try {
    animeList = await getAiringAnime({ rangeHours: 24, excludeAdult: true });
  } catch (error) {
    console.error(`[ANIME] Gagal mengambil jadwal anime:`, error.message);
    return;
  }

  if (!animeList || animeList.length === 0) {
    console.log(`[ANIME] Tidak ada jadwal anime rilis dalam 24 jam ke depan.`);
    return;
  }

  const now = Date.now();
  const next24h = now + (24 * 60 * 60 * 1000);
  const upcoming = [];

  for (const anime of animeList) {
    const airingTimestamp = anime.airingTimestamp;

    if (airingTimestamp >= now && airingTimestamp <= next24h) {
      const key = `${anime.id}-${airingTimestamp}`;
      if (!scheduledReminders.has(key)) {
        scheduledReminders.add(key);
        scheduleReminder(client, anime, airingTimestamp);
      }
      upcoming.push({ anime, airingTimestamp });
    }
  }

  console.log(`[ANIME] ${label}: Ditemukan ${upcoming.length} anime tayang dalam 24 jam ke depan.`);

  if (sendList && upcoming.length > 0) {
    await sendScheduleEmbed(channel, upcoming);
  }
}

// ================= TAMPILAN KORAN ANIME (EMBED) =================

async function sendScheduleEmbed(channel, upcoming) {
  const client = channel.client;
  upcoming.sort((a, b) => a.airingTimestamp - b.airingTimestamp);

  const dateFormatted = new Date().toLocaleDateString('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: WIB,
  });

  // Batasi 10 anime per embed agar tidak melebihi limit karakter Discord (6000 karakter)
  const PER_EMBED = 10;
  const chunks = [];
  for (let i = 0; i < upcoming.length; i += PER_EMBED) {
    chunks.push(upcoming.slice(i, i + PER_EMBED));
  }

  for (let cIdx = 0; cIdx < chunks.length; cIdx++) {
    const chunk = chunks[cIdx];
    const isFirst = cIdx === 0;

    const embed = new EmbedBuilder()
      .setColor(0x2941F2)
      .setTitle(
        isFirst
          ? '📺 JADWAL TAYANG ANIME HARI INI (24 JAM)'
          : `📺 JADWAL TAYANG ANIME — LANJUTAN (PART ${cIdx + 1})`
      )
      .setTimestamp();

    if (isFirst) {
      embed.setAuthor({
        name: '📰 JLS Gaming — Koran Anime Harian',
        iconURL: client.user.displayAvatarURL({ dynamic: true }),
      });
      embed.setDescription(
        `✨ **Rangkuman episode anime yang tayang hari ini (Family Friendly)**\n` +
        `📅 **${dateFormatted}** • Waktu Indonesia Barat (WIB)\n` +
        `🔔 Total: **${upcoming.length} anime** bersiap tayang. Enjoy your watch! 🍿\n` +
        `───────────────────────────────`
      );
      embed.setThumbnail(client.user.displayAvatarURL({ dynamic: true, size: 256 }));
    }

    for (const { anime, airingTimestamp } of chunk) {
      const unix = Math.floor(airingTimestamp / 1000);
      const studio = anime.studios?.[0] || 'Unknown';
      const genres = anime.genres?.slice(0, 3).join(', ') || '—';

      embed.addFields({
        name: `🎬 ${anime.title} (Ep. ${anime.episode})`,
        value:
          `⏰ **${fmtWIB(airingTimestamp)} WIB** • ⏳ <t:${unix}:R> | ⭐ **${anime.score}/10**\n` +
          `🏢 *${studio}* | 🎭 *${genres}*\n` +
          `🔗 [Info AniList](${anime.url})`,
        inline: false,
      });
    }

    embed.setFooter({
      text: `Halaman ${cIdx + 1} dari ${chunks.length} • JLS Gaming Community • Update Otomatis`,
    });

    try {
      const content = isFirst
        ? `<@&${ROLE_ID}> 📣 **Koran Anime Hari Ini Telah Terbit!**`
        : undefined;

      await channel.send({
        content,
        embeds: [embed],
        allowedMentions: { roles: [ROLE_ID] },
      });
    } catch (err) {
      console.error(`[ANIME] Gagal mengirim Koran Anime Part ${cIdx + 1}:`, err);
    }
  }

  console.log(`[ANIME] Berhasil menerbitkan Koran Anime ke #${channel.name} (${chunks.length} pesan).`);
}

// ================= REMINDER PER EPISODE =================

function scheduleReminder(client, anime, airingTimestamp) {
  const delay = airingTimestamp - Date.now();
  if (delay <= 0) return;

  setTimeout(async () => {
    try {
      const channel = await getChannel(client);
      if (!channel) return;

      const embed = new EmbedBuilder()
        .setColor(0x2ECC71)
        .setAuthor({
          name: '🎉 Episode Baru Rilis!',
          iconURL: client.user.displayAvatarURL({ dynamic: true }),
        })
        .setTitle(`${anime.title} — Episode ${anime.episode}`)
        .setURL(anime.url)
        .setDescription(
          `✨ **Episode ${anime.episode}** resmi rilis dan tayang sekarang!\n\n` +
          `🕒 **Waktu Rilis:** **${fmtWIB(airingTimestamp)} WIB**\n` +
          `⭐ **Rating:** ${anime.score}/10\n` +
          `🏢 **Studio:** ${anime.studios?.[0] || 'Unknown'}\n` +
          `📚 **Source:** ${anime.source}`
        )
        .addFields({
          name: '🎭 Genres',
          value: anime.genres?.join(', ') || '—',
          inline: false,
        })
        .setFooter({ text: `JLS Anime Alert • Selamat menonton! 🍿` })
        .setTimestamp();

      if (anime.image) {
        embed.setImage(anime.image);
      }

      await channel.send({
        content: `<@&${ROLE_ID}>`,
        embeds: [embed],
        allowedMentions: { roles: [ROLE_ID] },
      });

      scheduledReminders.delete(`${anime.id}-${airingTimestamp}`);
      console.log(`[ANIME] Reminder episode terkirim: ${anime.title} Ep ${anime.episode}`);
    } catch (err) {
      console.error('[ANIME] Reminder error:', err);
    }
  }, delay);
}

// ================= UTILS =================

async function getChannel(client) {
  if (cachedChannel) return cachedChannel;
  try {
    cachedChannel = await client.channels.fetch(ANIME_CHANNEL_ID);
    return cachedChannel;
  } catch (err) {
    console.error(`[ANIME] Error fetch channel ${ANIME_CHANNEL_ID}:`, err.message);
    return null;
  }
}

function fmtWIB(ts) {
  return new Date(ts).toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: WIB,
  }).replace('.', ':');
}

function cleanupExpiredReminders() {
  const now = Date.now();
  for (const key of scheduledReminders) {
    const airingTS = Number(key.split('-')[1]);
    if (airingTS < now) scheduledReminders.delete(key);
  }
}
