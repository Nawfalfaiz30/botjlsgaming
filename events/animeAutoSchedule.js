const cron = require('node-cron');
const { EmbedBuilder } = require('discord.js');
const { getAiringAnime } = require('../helpers/malService');

// CONFIG

const ANIME_CHANNEL_ID =
  process.env.ANIME_CHANNEL_ID || '1425803587526594621';
const ROLE_ID = '1425791942003789928';

const TEST_MODE = false;
const WIB = 'Asia/Jakarta';

// DAY MAP

const DAY_INDEX = {
  Sundays: 0,
  Mondays: 1,
  Tuesdays: 2,
  Wednesdays: 3,
  Thursdays: 4,
  Fridays: 5,
  Saturdays: 6,
};

// STATE

const scheduledReminders = new Set();

// EXPORT

module.exports = client => {

  // STARTUP SCAN
  setTimeout(() => {
    runScan(client, { sendList: false, label: 'Startup' });
  }, TEST_MODE ? 3000 : 5000);

  // HOURLY SCAN
  cron.schedule(
    '7 * * * *',
    () => runScan(client, { sendList: false, label: 'Hourly' }),
    { timezone: WIB }
  );

  // DAILY LIST
  cron.schedule(
    '00 8 * * *',
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

  const channel = await client.channels.fetch(ANIME_CHANNEL_ID);
  if (!channel) return;

  const animeList = await getAiringAnime();
  if (!animeList?.length) return;

  const now = Date.now();
  const next24h = now + 24 * 60 * 60 * 1000;

  const upcoming = [];

  for (const anime of animeList) {
    if (!isStillAiring(anime)) continue;

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

// ================= FILTER =================

function isStillAiring(anime) {
  if (!anime.aired_to) return true;

  const end = new Date(anime.aired_to).getTime();
  return end > Date.now();
}

// ================= EMBED LIST =================

async function sendScheduleEmbed(channel, upcoming) {
  const client = channel.client;
  if (!client?.user) return;

  upcoming.sort((a, b) => a.airingUTC - b.airingUTC);

  const embed = new EmbedBuilder()
    .setColor(0x5865F2)

    .setAuthor({
      name: '✨ JLS Anime Scheduler',
      iconURL: client.user.displayAvatarURL(),
    })

    .setTitle('📺 Airing Anime — Next 24 Hours')

    .setDescription(
      '```fix\nStay updated with the latest anime episodes airing soon!\n```'
    )

    .setThumbnail(client.user.displayAvatarURL({ size: 256 }))

    .setFooter({
      text: 'JLS Gaming Anime Schedule',
    })

    .setTimestamp();

  for (const { anime, airingUTC } of upcoming) {
    const unix = Math.floor(airingUTC / 1000);

    embed.addFields({
      name: `\n🎬 ${anime.title}`,
      value:
        `🕒 **${fmtWIB(airingUTC)} WIB** ⏳ <t:${unix}:R>\n` +
        `⭐ **${anime.score ?? 'N/A'}** | 📚 ${formatSource(anime.source)}\n` +
        `🏢 ${anime.studios?.[0] || 'Unknown'}\n` +
        `🎭 ${anime.genres?.slice(0, 3).join(', ') || '—'}\n` +
        `📅 ${anime.aired}\n`,
      inline: false,
    });
  }

  await channel.send({
    content: `<@&${ROLE_ID}>`,
    embeds: [embed],
  });
}

// ================= REMINDER =================

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

        .setAuthor({
          name: '🎉 Episode Released!',
        })

        .setTitle(anime.title)
        .setURL(anime.url)

        .setDescription(
          `✨ Episode terbaru sudah tayang!\n\n` +
          `🕒 **${fmtWIB(airingUTC)} WIB**`
        )

        // COVER IMAGE BESAR
        .setImage(anime.images?.jpg?.large_image_url)

        .addFields(
          {
            name: '⭐ Rating',
            value: anime.score ? `${anime.score}/10` : 'N/A',
            inline: true,
          },
          {
            name: '📚 Source',
            value: formatSource(anime.source),
            inline: true,
          },
          {
            name: '🏢 Studio',
            value: anime.studios?.[0] || 'Unknown',
            inline: true,
          },
          {
            name: '🎭 Genres',
            value: anime.genres?.join(', ') || 'Unknown',
          },
          {
            name: '📅 Aired',
            value: anime.aired || 'Unknown',
          }
        )

        .setFooter({
          text: 'JLS Anime Reminder • Enjoy your watch 🍿',
        })

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

// ================= TIME =================

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

// ================= FORMAT =================

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
