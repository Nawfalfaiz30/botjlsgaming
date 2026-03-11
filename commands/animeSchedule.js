const {
  SlashCommandBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require('discord.js');

const { modEmbed } = require('../helpers/embed');
const { getAiringAnime } = require('../helpers/malService');

const PER_PAGE = 5;
const WIB = 'Asia/Jakarta';
const JST = 'Asia/Tokyo';

module.exports = {
  name: 'schedule',
  description: 'Menampilkan jadwal anime yang sedang tayang',

  slashBuilder: new SlashCommandBuilder()
    .setName('schedule')
    .setDescription('Jadwal anime ongoing')
    .addStringOption(opt =>
      opt
        .setName('waktu')
        .setDescription('Rentang waktu')
        .setRequired(true)
        .addChoices(
          { name: '24 jam ke depan', value: 'hari' },
          { name: '7 hari ke depan', value: 'minggu' }
        )
    )
    .addStringOption(opt =>
      opt
        .setName('genre')
        .setDescription('Filter genre (opsional)')
        .setRequired(false)
    ),

  async execute(ctx) {
    const isSlash = ctx.isChatInputCommand?.() ?? false;
    let waktu, genre;

    if (isSlash) {
      waktu = ctx.options.getString('waktu');
      genre = ctx.options.getString('genre')?.toLowerCase();
      await ctx.deferReply();
    } else {
      const args = ctx.content.trim().split(/\s+/);
      waktu = args[1]?.toLowerCase();
      genre = args[2]?.toLowerCase();

      if (!['hari', 'minggu'].includes(waktu)) {
        return ctx.reply({
          embeds: [
            modEmbed({
              title: '❌ Format Salah',
              description:
                '`jls!schedule hari`\n' +
                '`jls!schedule minggu`\n' +
                '`jls!schedule minggu action`',
            }),
          ],
        });
      }
    }

    let animeList;
    try {
      animeList = await getAiringAnime();
    } catch {
      return (isSlash ? ctx.editReply : ctx.reply).call(ctx, {
        embeds: [
          modEmbed({
            title: '❌ Error',
            description: 'Gagal mengambil data dari MyAnimeList.',
          }),
        ],
      });
    }

    /* =====================
       TIME WINDOW (WIB)
    ===================== */

    const nowWIB = nowIn(WIB);
    const range =
      waktu === 'hari'
        ? 24 * 60 * 60 * 1000
        : 7 * 24 * 60 * 60 * 1000;

    const end = nowWIB + range;

    /* =====================
       FILTER
    ===================== */

    let filtered = animeList
      .map(anime => {
        const airingWIB = buildAiringWIB(anime.broadcast);
        return airingWIB ? { anime, airingWIB } : null;
      })
      .filter(Boolean)
      .filter(a => a.airingWIB >= nowWIB && a.airingWIB <= end);

    if (genre) {
      filtered = filtered.filter(a =>
        a.anime.genres?.some(g =>
          g.name.toLowerCase().includes(genre)
        )
      );
    }

    filtered.sort((a, b) => a.airingWIB - b.airingWIB);

    if (!filtered.length) {
      return (isSlash ? ctx.editReply : ctx.reply).call(ctx, {
        embeds: [
          modEmbed({
            title: '📺 Jadwal Anime',
            description: 'Tidak ada anime dalam rentang waktu ini.',
          }),
        ],
      });
    }

    /* =====================
       PAGINATION
    ===================== */

    const pages = [];
    for (let i = 0; i < filtered.length; i += PER_PAGE) {
      pages.push(filtered.slice(i, i + PER_PAGE));
    }

    let page = 0;

    const buildEmbed = () =>
      modEmbed({
        title:
          waktu === 'hari'
            ? '📡 Anime 24 Jam Ke Depan'
            : '🗓️ Anime 7 Hari Ke Depan',
        description: pages[page]
          .map(a => formatAnime(a.anime, a.airingWIB))
          .join('\n\n'),
        footer: {
          text: `Halaman ${page + 1}/${pages.length} • WIB`,
        },
        timestamp: true,
      });

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('prev')
        .setEmoji('⬅️')
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(true),
      new ButtonBuilder()
        .setCustomId('next')
        .setEmoji('➡️')
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(pages.length <= 1)
    );

    const msg = isSlash
      ? await ctx.editReply({
          embeds: [buildEmbed()],
          components: [row],
          fetchReply: true,
        })
      : await ctx.reply({
          embeds: [buildEmbed()],
          components: [row],
        });

    const collector = msg.createMessageComponentCollector({
      time: 120000,
    });

    collector.on('collect', async i => {
      if (i.user.id !== (isSlash ? ctx.user.id : ctx.author.id)) {
        return i.reply({ content: '❌ Bukan untukmu', ephemeral: true });
      }

      if (i.customId === 'next') page++;
      if (i.customId === 'prev') page--;

      row.components[0].setDisabled(page === 0);
      row.components[1].setDisabled(page === pages.length - 1);

      await i.update({
        embeds: [buildEmbed()],
        components: [row],
      });
    });
  },
};

/* =====================
   TIME HELPERS
===================== */

function nowIn(tz) {
  return new Date(
    new Date().toLocaleString('en-US', { timeZone: tz })
  ).getTime();
}

function buildAiringWIB(broadcast) {
  if (!broadcast?.day || !broadcast?.time) return null;

  const dayMap = {
    Sundays: 0,
    Mondays: 1,
    Tuesdays: 2,
    Wednesdays: 3,
    Thursdays: 4,
    Fridays: 5,
    Saturdays: 6,
  };

  const nowJST = new Date(
    new Date().toLocaleString('en-US', { timeZone: JST })
  );

  const targetDay = dayMap[broadcast.day];
  if (targetDay === undefined) return null;

  const date = new Date(nowJST);
  const diff = (targetDay - date.getDay() + 7) % 7;
  date.setDate(date.getDate() + diff);

  let [hour, minute] = broadcast.time.split(':').map(Number);

  // JST ➜ WIB
  hour -= 2;
  if (hour < 0) {
    hour += 24;
    date.setDate(date.getDate() - 1);
  }

  const wib = new Date(
    date.toLocaleString('en-US', { timeZone: WIB })
  );

  wib.setHours(hour, minute, 0, 0);
  return wib.getTime();
}

/* =====================
   FORMAT
===================== */

function formatAnime(a, ts) {
  return (
    `🎬 **${a.title}**\n` +
    `📅 ${formatDate(ts)}\n` +
    `⏰ ${formatTime(ts)} WIB\n` +
    `🏷️ ${a.genres?.slice(0, 3).map(g => g.name).join(', ') || '—'}\n` +
    `🏢 Studio: ${a.studios?.[0]?.name || '—'}\n` +
    `⭐ Score: ${a.score || 'N/A'}`
  );
}

function formatDate(ts) {
  return new Date(ts).toLocaleDateString('id-ID', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    timeZone: WIB,
  });
}

function formatTime(ts) {
  return new Date(ts).toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: WIB,
  });
}
