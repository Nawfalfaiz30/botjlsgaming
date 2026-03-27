const cron = require('node-cron');
const { EmbedBuilder } = require('discord.js');
const { getAiringAnime } = require('../helpers/malService');

// ================= CONFIG =================

const ANIME_CHANNEL_ID =
  process.env.ANIME_CHANNEL_ID || '1425803587526594621';
const ROLE_ID = '1425791942003789928';

const WIB = 'Asia/Jakarta';
const JST_OFFSET = 9; // Jepang UTC+9

// ================= STATE =================

const scheduledReminders = new Set();
let cachedChannel = null;

// ================= EXPORT =================

module.exports = client => {

  // STARTUP
  setTimeout(() => {
    runScan(client, { sendList: false, label: 'Startup' });
  }, 5000);

  // SCAN TIAP JAM MENIT 07
  cron.schedule(
    '7 * * * *',
    () => runScan(client, { sendList: false, label: 'Hourly' }),
    { timezone: WIB }
  );

  // LIST HARIAN JAM 08:00 WIB
  cron.schedule(
    '0 8 * * *',
    () => {
      cleanupExpiredReminders();
      runScan(client, { sendList: true, label: 'Daily 08:00' });
    },
    { timezone: WIB }
  );
};

// ================= CORE =================

async function runScan(
  client,
  { sendList = false, label = 'Scan' } = {}
) {
  console.log(`[ANIME] ${label} scan started`);

  const channel = await getChannel(client);
  if (!channel) return;

  let animeList = [];
  try {
    animeList = await getAiringAnime();
  } catch (err) {
    console.error('[ANIME] API error:', err);
    return;
  }

  if (!animeList?.length) return;

  const now = Date.now();
  const next24h = now + 24 * 60 * 60 * 1000;

  const upcoming = [];

  for (const anime of animeList) {
    // 🔹 aired hanya sebagai filter
    if (!isStillAiring(anime)) continue;

    if (!anime.broadcast?.day || !anime.broadcast?.time) continue;

    const airingUTC = getNextAiringUTC(anime.broadcast);
    if (!airingUTC) continue;

    // 🔥 FILTER UTAMA (FIXED)
    if (airingUTC < now || airingUTC > next24h) continue;

    const key = `${anime.mal_id}-${airingUTC}`;

    if (!scheduledReminders.has(key)) {
      scheduledReminders.add(key);
      scheduleReminder(client, anime, airingUTC);
    }

    upcoming.push({ anime, airingUTC });
  }

  if (sendList && upcoming.length) {
    await sendScheduleEmbed(channel, upcoming);
  }
}

// ================= TIME FIX =================

// 🔥 FIX TOTAL: perhitungan airing
function getNextAiringUTC(broadcast) {
  const now = new Date();

  const days = {
    Sundays: 0,
    Mondays: 1,
    Tuesdays: 2,
    Wednesdays: 3,
    Thursdays: 4,
    Fridays: 5,
    Saturdays: 6,
  };

  const targetDay = days[broadcast.day];
  if (targetDay === undefined) return null;

  const result = new Date(now);

  // cari hari berikutnya
  while (result.getUTCDay() !== targetDay) {
    result.setUTCDate(result.getUTCDate() + 1);
  }

  const [hour, minute] = broadcast.time.split(':').map(Number);

  // convert JST → UTC (AMAN)
  result.setUTCHours(hour - JST_OFFSET, minute, 0, 0);

  // kalau sudah lewat minggu ini → lompat ke minggu depan
  if (result.getTime() < now.getTime()) {
    result.setUTCDate(result.getUTCDate() + 7);
  }

  return result.getTime();
}

// ================= FILTER =================

function isStillAiring(anime) {
  const end = anime.aired?.to
    ? new Date(anime.aired.to).getTime()
    : null;

  return !end || end > Date.now();
}

// ================= EMBED =================

async function sendScheduleEmbed(channel, upcoming) {
  const client = channel.client;
  if (!client?.user) return;

  upcoming.sort((a, b) => a.airingUTC - b.airingUTC);

  // 🔥 SPLIT (ANTI LIMIT)
  const chunks = [];
  for (let i = 0; i < upcoming.length; i += 25) {
    chunks.push(upcoming.slice(i, i + 25));
  }

  for (const chunk of chunks) {
    const embed = new EmbedBuilder()
      .setColor(0x5865F2)
      .setAuthor({
        name: '✨ JLS Anime Scheduler',
        iconURL: client.user.displayAvatarURL(),
      })
      .setTitle('📺 Airing Anime — Next 24 Hours')
      .setDescription(
        '```fix\nAnime yang akan tayang dalam 24 jam ke depan\n```'
      )
      .setFooter({ text: 'JLS Anime Schedule' })
      .setTimestamp();

    for (const { anime, airingUTC } of chunk) {
      const unix = Math.floor(airingUTC / 1000);

      embed.addFields({
        name: `🎬 ${anime.title}`,
        value:
          `🕒 <t:${unix}:F>\n` +
          `⏳ <t:${unix}:R>\n` +
          `⭐ ${anime.score ?? 'N/A'} | 📚 ${formatSource(anime.source)}`,
      });
    }

    await channel.send({
      content: `<@&${ROLE_ID}>`,
      embeds: [embed],
    });
  }
}

// ================= REMINDER =================

function scheduleReminder(client, anime, airingUTC) {
  const delay = airingUTC - Date.now();
  if (delay <= 0) return;

  setTimeout(async () => {
    try {
      const channel = await getChannel(client);
      if (!channel) return;

      const embed = new EmbedBuilder()
        .setColor(0x2ecc71)
        .setTitle(`🎉 ${anime.title}`)
        .setURL(anime.url)
        .setDescription(`Episode terbaru sudah tayang!`)
        .setImage(anime.images?.jpg?.large_image_url)
        .setTimestamp();

      await channel.send({
        content: `<@&${ROLE_ID}>`,
        embeds: [embed],
      });

    } catch (err) {
      console.error('[ANIME] Reminder error:', err);
    }
  }, delay);
}

// ================= CLEANUP =================

function cleanupExpiredReminders() {
  const now = Date.now();

  for (const key of scheduledReminders) {
    const airingUTC = Number(key.split('-')[1]);
    if (airingUTC < now) {
      scheduledReminders.delete(key);
    }
  }
}

// ================= UTIL =================

async function getChannel(client) {
  if (cachedChannel) return cachedChannel;

  cachedChannel = await client.channels.fetch(ANIME_CHANNEL_ID);
  return cachedChannel;
}

function formatSource(source) {
  if (!source) return 'Unknown';

  const map = {
    manga: 'Manga',
    light_novel: 'Light Novel',
    novel: 'Novel',
    original: 'Original',
  };

  return map[source?.toLowerCase()] || source;
}
