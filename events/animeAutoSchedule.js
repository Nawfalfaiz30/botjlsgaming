const cron = require('node-cron');
const { EmbedBuilder } = require('discord.js');
const { getAiringAnime } = require('../helpers/malService');

// ================= CONFIG =================

const ANIME_CHANNEL_ID = process.env.ANIME_CHANNEL_ID || '1425803587526594621';
const ROLE_ID = '1425791942003789928';

const WIB = 'Asia/Jakarta';
const JST_OFFSET = 9; // JST is UTC+9

const scheduledReminders = new Set();
let cachedChannel = null;

// ================= EXPORT =================

module.exports = client => {
  setTimeout(() => {
    runScan(client, { sendList: true, label: 'Startup' });
  }, 5000);

  // Hourly Scan: Menit ke-7 setiap jam (untuk jadwal reminder)
  cron.schedule('7 * * * *', () => runScan(client, { sendList: false, label: 'Hourly' }), { timezone: WIB });

  // Daily List: Jam 08:00 WIB
  cron.schedule('0 6 * * *', () => {
    cleanupExpiredReminders();
    runScan(client, { sendList: true, label: 'Daily 06:00' });
  }, { timezone: WIB });
};

// ================= CORE LOGIC (REWRITTEN) =================

async function runScan(client, { sendList = false, label = 'Scan' } = {}) {
  console.log(`[ANIME] ${label} scan started`);

  const channel = await getChannel(client);
  if (!channel) return;

  const animeList = await getAiringAnime();
  if (!animeList?.length) return;

  const now = Date.now();
  const next24h = now + (24 * 60 * 60 * 1000);
  const upcoming = [];

  for (const anime of animeList) {
    if (!anime.broadcast?.day || !anime.broadcast?.time) continue;

    const airingTimestamp = calculateNextAiring(anime.broadcast);
    if (!airingTimestamp) continue;

    if (anime.aired_to) {
      const endTimestamp = new Date(anime.aired_to).setHours(23, 59, 59, 999);
      if (airingTimestamp > endTimestamp) continue;
    }

    if (airingTimestamp >= now && airingTimestamp <= next24h) {
      const key = `${anime.mal_id}-${airingTimestamp}`;

      if (!scheduledReminders.has(key)) {
        scheduledReminders.add(key);
        scheduleReminder(client, anime, airingTimestamp);
      }

      upcoming.push({ anime, airingTimestamp });
    }
  }

  console.log(`[ANIME] Found ${upcoming.length} upcoming anime.`);

  if (sendList && upcoming.length > 0) {
    await sendScheduleEmbed(channel, upcoming);
  }
}

// ================= THE MAGIC: TIME CALCULATION =================

function calculateNextAiring(broadcast) {
  const days = {
    Sundays: 0, Sunday: 0, Mondays: 1, Monday: 1, Tuesdays: 2, Tuesday: 2,
    Wednesdays: 3, Wednesday: 3, Thursdays: 4, Thursday: 4, Fridays: 5, Friday: 5,
    Saturdays: 6, Saturday: 6
  };

  const targetDay = days[broadcast.day];
  if (targetDay === undefined) return null;

  const [hour, minute] = broadcast.time.split(':').map(Number);
  
  const now = new Date();
  const nowJST = new Date(now.getTime() + (now.getTimezoneOffset() * 60000) + (JST_OFFSET * 3600000));

  let airingDateJST = new Date(nowJST);
  let diff = targetDay - nowJST.getUTCDay();
  
  airingDateJST.setUTCDate(nowJST.getUTCDate() + diff);
  airingDateJST.setUTCHours(hour, minute, 0, 0);

  let airingUnix = airingDateJST.getTime() - (JST_OFFSET * 3600000);

  if (airingUnix < Date.now()) {
    airingUnix += 7 * 24 * 60 * 60 * 1000;
  }

  return airingUnix;
}

// ================= EMBED LIST (UI TETAP SAMA) =================

async function sendScheduleEmbed(channel, upcoming) {
  const client = channel.client;
  upcoming.sort((a, b) => a.airingTimestamp - b.airingTimestamp);

  const embed = new EmbedBuilder()
    .setColor(0x5865F2)
    .setAuthor({ name: '✨ JLS Anime Scheduler', iconURL: client.user.displayAvatarURL() })
    .setTitle('📺 Airing Anime — Next 24 Hours')
    .setDescription('```fix\nStay updated with the latest anime episodes airing soon!\n```')
    .setThumbnail(client.user.displayAvatarURL({ size: 256 }))
    .setFooter({ text: 'JLS Gaming Anime Schedule' })
    .setTimestamp();

  for (const { anime, airingTimestamp } of upcoming) {
    const unix = Math.floor(airingTimestamp / 1000);
    embed.addFields({
      name: `🎬 ${anime.title}`,
      value: 
        `🕒 **${fmtWIB(airingTimestamp)} WIB** ⏳ <t:${unix}:R>\n` +
        `⭐ **${anime.score}** | 📚 ${formatSource(anime.source)}\n` +
        `🏢 ${anime.studios?.[0] || 'Unknown'}\n` +
        `🎭 ${anime.genres?.slice(0, 3).join(', ') || '—'}\n` +
        `📅 ${anime.aired}`,
      inline: false,
    });
  }

  await channel.send({ content: `<@&${ROLE_ID}>`, embeds: [embed] });
}

// ================= REMINDER EMBED (UI TETAP SAMA) =================

function scheduleReminder(client, anime, airingTimestamp) {
  const delay = airingTimestamp - Date.now();
  if (delay <= 0) return;

  setTimeout(async () => {
    try {
      const channel = await getChannel(client);
      if (!channel) return;

      const embed = new EmbedBuilder()
        .setColor(0x2ecc71)
        .setAuthor({ name: '🎉 Episode Released!' })
        .setTitle(anime.title)
        .setURL(anime.url)
        .setDescription(`✨ Episode terbaru sudah tayang!\n\n🕒 **${fmtWIB(airingTimestamp)} WIB**`)
        .setImage(anime.image)
        .addFields(
          { name: '⭐ Rating', value: anime.score ? `${anime.score}/10` : 'N/A', inline: true },
          { name: '📚 Source', value: formatSource(anime.source), inline: true },
          { name: '🏢 Studio', value: anime.studios?.[0] || 'Unknown', inline: true },
          { name: '🎭 Genres', value: anime.genres?.join(', ') || '—', inline: false },
          { name: '📅 Aired', value: anime.aired, inline: false }
        )
        .setFooter({ text: `JLS Anime Reminder • Enjoy your watch 🍿 • Today at ${fmtWIB(Date.now())}` })
        .setTimestamp();

      await channel.send({ content: `<@&${ROLE_ID}>`, embeds: [embed] });
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
  } catch { return null; }
}

function fmtWIB(ts) {
  return new Date(ts).toLocaleTimeString('id-ID', {
    hour: '2-digit', minute: '2-digit', hour12: false, timeZone: WIB
  }).replace('.', ':');
}

function formatSource(source) {
  if (!source) return 'Unknown';
  const map = { light_novel: 'Light Novel', web_manga: 'Web Manga', web_novel: 'Web Novel' };
  const key = source.toLowerCase().replace(/\s+/g, '_');
  return map[key] || source.charAt(0).toUpperCase() + source.slice(1);
}

function cleanupExpiredReminders() {
  const now = Date.now();
  for (const key of scheduledReminders) {
    const airingTS = Number(key.split('-')[1]);
    if (airingTS < now) scheduledReminders.delete(key);
  }
}
