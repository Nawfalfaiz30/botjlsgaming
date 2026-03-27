const cron = require('node-cron');
const { EmbedBuilder } = require('discord.js');
const { getAiringAnime } = require('../helpers/malService');

// ================= CONFIG =================

const ANIME_CHANNEL_ID =
  process.env.ANIME_CHANNEL_ID || '1425803587526594621';
const ROLE_ID = '1425791942003789928';

const WIB = 'Asia/Jakarta';
const JST_OFFSET = 9;

// ================= STATE =================

const scheduledReminders = new Set();
let cachedChannel = null;

// ================= EXPORT =================

module.exports = client => {

  setTimeout(() => {
    runScan(client, { sendList: false, label: 'Startup' });
  }, 5000);

  cron.schedule(
    '7 * * * *',
    () => runScan(client, { sendList: false, label: 'Hourly' }),
    { timezone: WIB }
  );

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

async function runScan(client, { sendList = false, label = 'Scan' } = {}) {
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

  const now = Date.now();
  const next24h = now + 24 * 60 * 60 * 1000;

  const upcoming = [];

  for (const anime of animeList) {
    if (!isStillAiring(anime)) continue;
    if (!anime.broadcast?.day || !anime.broadcast?.time) continue;

    const airingUTC = getNextAiringUTC(anime.broadcast);
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

// ================= TIME =================

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

  while (result.getUTCDay() !== targetDay) {
    result.setUTCDate(result.getUTCDate() + 1);
  }

  const [hour, minute] = broadcast.time.split(':').map(Number);

  result.setUTCHours(hour - JST_OFFSET, minute, 0, 0);

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

// ================= LIST EMBED =================

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
    .setFooter({ text: 'JLS Gaming Anime Schedule' })
    .setTimestamp();

  for (const { anime, airingUTC } of upcoming) {
    const unix = Math.floor(airingUTC / 1000);

    embed.addFields({
      name: `\n🎬 ${anime.title}`,
      value:
        `🕒 **${fmtWIB(airingUTC)} WIB** ⏳ <t:${unix}:R>\n` +
        `⭐ **${anime.score ?? 'N/A'}** | 📚 ${formatSource(anime.source)}\n` +
        `🏢 ${anime.studios?.[0]?.name || 'Unknown'}\n` +
        `🎭 ${formatGenres(anime.genres)}\n` +
        `📅 ${formatAired(anime.aired)}\n`,
      inline: false,
    });
  }

  await channel.send({
    content: `<@&${ROLE_ID}>`,
    embeds: [embed],
  });
}

// ================= REMINDER (UPDATED UI) =================

function scheduleReminder(client, anime, airingUTC) {
  const delay = airingUTC - Date.now();
  if (delay <= 0) return;

  setTimeout(async () => {
    try {
      const channel = await getChannel(client);
      if (!channel) return;

      const now = Date.now();

      const embed = new EmbedBuilder()
        .setColor(0x2ecc71)

        .setAuthor({
          name: '🎉 Episode Released!',
        })

        .setTitle(anime.title)
        .setURL(anime.url)

        .setDescription(`✨ Episode terbaru sudah tayang!\n\n🕒 ${fmtWIB(airingUTC)} WIB`)

        // INFO UTAMA (3 kolom)
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
            value: anime.studios?.[0]?.name || 'Unknown',
            inline: true,
          },

          {
            name: '🎭 Genres',
            value: formatGenres(anime.genres),
          },
          {
            name: '📅 Aired',
            value: formatAired(anime.aired),
          }
        )

        .setFooter({
          text: `JLS Anime Reminder • Enjoy your watch 🍿 • ${formatNowWIB(now)}`,
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

// ================= UTIL =================

async function getChannel(client) {
  if (cachedChannel) return cachedChannel;
  cachedChannel = await client.channels.fetch(ANIME_CHANNEL_ID);
  return cachedChannel;
}

function fmtWIB(ts) {
  return new Date(ts).toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: WIB,
  });
}

function formatNowWIB(ts) {
  return new Date(ts).toLocaleString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: WIB,
  });
}

function formatGenres(genres) {
  if (!genres || !genres.length) return '—';
  return genres.slice(0, 3).map(g => g.name || g).join(', ');
}

function formatAired(aired) {
  if (!aired) return 'Unknown';

  if (typeof aired === 'string') return aired;

  const from = aired.from ? aired.from.split('T')[0] : null;
  const to = aired.to ? aired.to.split('T')[0] : null;

  if (from && to) return `${from} to ${to}`;
  if (from) return from;

  return 'Unknown';
}

function formatSource(source) {
  if (!source) return 'Unknown';

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

  return map[source.toLowerCase().replace(/\s+/g, '_')] || source;
}
