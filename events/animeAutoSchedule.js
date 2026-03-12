const cron = require('node-cron');
const { EmbedBuilder } = require('discord.js');
const { getAiringAnime } = require('../helpers/malService');

/* ======================================================
   CONFIG
====================================================== */

const ANIME_CHANNEL_ID =
  process.env.ANIME_CHANNEL_ID || '1425803587526594621';
const ROLE_ID = '1425791942003789928';

const TEST_MODE = false;
const WIB = 'Asia/Jakarta';

/* ======================================================
   DAY MAP (MAL FORMAT)
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

/* ======================================================
   INTERNAL STATE
====================================================== */

/**
 * key format: `${mal_id}-${airingUTC}`
 */
const scheduledReminders = new Set();

/* ======================================================
   MAIN EXPORT
====================================================== */

module.exports = client => {

  /* =====================
     STARTUP SCAN
  ====================== */

  setTimeout(() => {
    runScan(client, {
      sendList: false,
      label: 'Startup',
    });
  }, TEST_MODE ? 3000 : 5000);

  /* =====================
     HOURLY SCAN
  ====================== */

  cron.schedule(
    '7 * * * *',  
    () => runScan(client, {
      sendList: false,
      label: 'Hourly',
    }),
    { timezone: WIB }
  );

  /* =====================
     DAILY SCAN (08:00 WIB)
     → SEND LIST
  ====================== */

  cron.schedule(
    '00 8  * * *',
    () => {
      cleanupExpiredReminders();
      runScan(client, {
        sendList: true,
        label: 'Daily 08:00',
      });
    },
    { timezone: WIB }
  );
};

/* ======================================================
   CORE SCAN (NEXT 24 HOURS)
====================================================== */

async function runScan(
  client,
  { sendList = false, label = 'Scan' } = {}
) {
  console.log(`[ANIME] ${label} scan started`);

  const channel = await client.channels.fetch(ANIME_CHANNEL_ID);
  if (!channel) return;

  const animeList = await getAiringAnime();
  if (!animeList?.length) return;

  const now = Date.now();
  const next24h = now + 24 * 60 * 60 * 1000;

  const upcoming = [];

  for (const anime of animeList) {
    if (!anime.broadcast?.day || !anime.broadcast?.time) continue;

    const airingUTC = buildAiringUTC(anime.broadcast);
    if (!airingUTC) continue;

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

/* ======================================================
   DAILY LIST EMBED
====================================================== */

async function sendScheduleEmbed(channel, upcoming) {
  const client = channel.client;
  if (!client?.user) return;

  // Urutkan dari yang paling dekat
  upcoming.sort((a, b) => a.airingUTC - b.airingUTC);

  const embed = new EmbedBuilder()
    .setColor(0x22C55E)

    // HEADER
    .setAuthor({
      name: 'JLS GAMING • ANIME SCHEDULE',
      iconURL: client.user.displayAvatarURL(),
    })

    // TITLE
    .setTitle('📅 Today’s Airing Lineup')

    // DESC
    .setDescription(
      '🎎 **Anime yang akan tayang dalam 24 jam ke depan**\n' +
      '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n'
    )

    // LOGO KANAN
    .setThumbnail(client.user.displayAvatarURL({ size: 256 }))

    // FOOTER
    .setFooter({
      text: 'JLS Gaming • Anime Timeline',
      iconURL: client.user.displayAvatarURL(),
    })
    .setTimestamp();

  for (const { anime, airingUTC } of upcoming) {
    const studio = anime?.studios?.[0]?.name || 'Unknown';
    const score = anime?.score ?? 'N/A';
    const genres =
      anime?.genres?.slice(0, 3).map(g => g.name).join(', ') || '—';

    const unix = Math.floor(airingUTC / 1000);

    embed.addFields({
      name: `🎬 ${anime.title}`,
      value:
        `🕒 **${fmtWIB(airingUTC)} WIB** ⏳ <t:${unix}:R>\n` +
        `⭐ ${score}\n` +
        `🏢 ${studio}\n` +
        `🎭 ${genres}\n`,
      inline: false,
    });
  }

  await channel.send({
    content: `<@&${ROLE_ID}>`,
    embeds: [embed],
  });
}

/* ======================================================
   REMINDER HANDLER
====================================================== */

function scheduleReminder(client, anime, airingUTC) {
  const delay = TEST_MODE ? 5000 : airingUTC - Date.now();
  if (!TEST_MODE && delay <= 0) return;

  console.log(
    `[ANIME] Reminder scheduled: ${anime.title} (${fmtWIB(airingUTC)} WIB)`
  );

  setTimeout(async () => {
    try {
      const channel = await client.channels.fetch(ANIME_CHANNEL_ID);
      if (!channel) return;

      const score = Number(anime.score) || 0;

      const color =
        score >= 9 ? 0x1abc9c :
        score >= 8 ? 0x2ecc71 :
        score >= 7 ? 0xf1c40f :
        score >= 6 ? 0xe67e22 :
        score >= 5 ? 0xe74c3c :
        0x2c3e50;

      const embed = new EmbedBuilder()
        .setColor(color)
        .setTitle('🎉 Episode Terbaru Sudah Tayang!')
        .setDescription(
          `🎬 **${anime.title}**\n\n` +
          `📢 Episode terbaru **resmi tayang hari ini**.\n` +
          `Selamat menonton dan silakan diskusi dengan bijak!`
        )
        .setThumbnail(anime.images?.jpg?.image_url)
        .setURL(anime.url)
        .addFields(
          {
            name: '🕒 Waktu Tayang',
            value: `**${fmtWIB(airingUTC)} WIB**`,
            inline: true,
          },
          {
            name: '⭐ Rating MAL',
            value: anime.score ? `${anime.score} / 10` : 'Belum ada',
            inline: true,
          },
          {
            name: '📚 Source',
            value: formatSource(anime.source),
            inline: true,
          },
          {
            name: '🏢 Studio',
            value: anime.studios?.[0]?.name || 'Unknown',
            inline: true,
          },
          {
            name: '🏷️ Genre',
            value:
              anime.genres?.map(g => g.name).join(', ') || 'Unknown',
          }
        )
        .setFooter({ text: '📡 JLS Gaming • Anime Airing Reminder' })
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

/* ======================================================
   CLEANUP EXPIRED REMINDERS
====================================================== */

function cleanupExpiredReminders() {
  const now = Date.now();

  for (const key of scheduledReminders) {
    const airingUTC = Number(key.split('-')[1]);
    if (airingUTC < now) {
      scheduledReminders.delete(key);
    }
  }
}

/* ======================================================
   TIME UTILITIES
====================================================== */

function buildAiringUTC(broadcast) {
  const now = new Date();

  const utcDay = now.getUTCDay();
  const targetDay = DAY_INDEX[broadcast.day];
  if (targetDay === undefined) return null;

  let diff = targetDay - utcDay;
  if (diff < 0) diff += 7;

  const [hour, minute] = broadcast.time.split(':').map(Number);
  const utcHour = hour - 9; // JST → UTC

  return Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate() + diff,
    utcHour,
    minute,
    0
  );
}

function fmtWIB(ts) {
  return new Date(ts).toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: WIB,
  });
}

function formatSource(source) {
  if (!source || typeof source !== 'string') return 'Unknown';

  const map = {
    original: 'Original',
    manga: 'Manga',
    novel: 'Novel',
    light_novel: 'Light Novel',
    web_manga: 'Web Manga',
    web_novel: 'Web Novel',
    visual_novel: 'Visual Novel',
    game: 'Game',
    other: 'Other',
  };

  const key = source.toLowerCase().replace(/\s+/g, '_');
  return map[key] || source;
}
