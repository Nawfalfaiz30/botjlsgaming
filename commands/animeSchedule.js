const {
  SlashCommandBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
} = require('discord.js');

const { getAiringAnime } = require('../helpers/malService');

const PER_PAGE = 5;

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
          embeds: [modEmbed('❌ Format Salah', '`jls!schedule hari`\n`jls!schedule minggu`\n`jls!schedule minggu action`')],
        });
      }
    }

    // =========================
    // FETCH DATA
    // =========================
    let animeList;
    try {
      animeList = await getAiringAnime();
    } catch {
      return reply(ctx, isSlash, {
        embeds: [modEmbed('❌ Error', 'Gagal mengambil data.')],
      });
    }

    const now = Date.now();
    const range = waktu === 'hari' ? 24 * 60 * 60 * 1000 : 7 * 24 * 60 * 60 * 1000;
    const end = now + range;

    // =========================
    // FILTER DATA
    // =========================
    let filtered = animeList
      .map(anime => {
        const ts = buildAiringWIB(anime.broadcast);
        return ts ? { anime, ts } : null;
      })
      .filter(Boolean)
      .filter(a => {
        const { anime, ts } = a;
        if (ts < now || ts > end) return false;

        if (anime.aired_from) {
          const start = new Date(anime.aired_from).getTime();
          if (start > now) return false;
        }

        if (anime.aired_to) {
          const endAired = new Date(anime.aired_to).getTime();
          if (endAired < now) return false;
        }

        return true;
      });

    if (genre) {
      filtered = filtered.filter(a =>
        a.anime.genres?.some(g => g.toLowerCase().includes(genre))
      );
    }

    filtered.sort((a, b) => a.ts - b.ts);

    if (!filtered.length) {
      return reply(ctx, isSlash, {
        embeds: [modEmbed('📺 Jadwal Anime', 'Tidak ada anime ditemukan.')],
      });
    }

    // =========================
    // PAGINATION
    // =========================
    const pages = [];
    for (let i = 0; i < filtered.length; i += PER_PAGE) {
      pages.push(filtered.slice(i, i + PER_PAGE));
    }

    let page = 0;

    function buildEmbeds() {
      return pages[page].map((a, i) =>
        new EmbedBuilder()
          .setTitle(`${i + 1}. ${a.anime.title}`)
          .setDescription(
            `⏰ ${formatTime(a.ts)} WIB\n` +
            `📅 ${formatDate(a.ts)}\n` +
            `⭐ ${a.anime.score ?? 'N/A'}\n` +
            `🎭 ${a.anime.genres?.slice(0, 2).join(', ') || '—'}\n` +
            `🏢 ${a.anime.studios?.[0] || 'Unknown'}`
          )
          .setThumbnail(a.anime.image) // POSTER SEBAGAI THUMBNAIL
          .setColor(0x1abc9c)
          .setTimestamp()
      );
    }

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

    const msg = await reply(ctx, isSlash, {
      embeds: buildEmbeds(),
      components: [row],
      fetchReply: true,
    });

    const collector = msg.createMessageComponentCollector({ time: 120000 });

    collector.on('collect', async i => {
      if (i.user.id !== (isSlash ? ctx.user.id : ctx.author.id)) {
        return i.reply({ content: '❌ Bukan untukmu', ephemeral: true });
      }

      if (i.customId === 'next') page++;
      if (i.customId === 'prev') page--;

      page = Math.max(0, Math.min(page, pages.length - 1));

      row.components[0].setDisabled(page === 0);
      row.components[1].setDisabled(page === pages.length - 1);

      await i.update({ embeds: buildEmbeds(), components: [row] });
    });

    collector.on('end', async () => {
      row.components.forEach(btn => btn.setDisabled(true));
      try { await msg.edit({ components: [row] }); } catch {}
    });
  },
};

// =========================
// HELPERS
// =========================

function reply(ctx, isSlash, payload) {
  return isSlash ? ctx.editReply(payload) : ctx.reply(payload);
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

  const targetDay = dayMap[broadcast.day];
  if (targetDay === undefined) return null;

  const now = new Date();
  const date = new Date(now);

  const diff = (targetDay - date.getDay() + 7) % 7;
  date.setDate(date.getDate() + diff);

  let [hour, minute] = broadcast.time.split(':').map(Number);

  // JST ➜ WIB
  hour -= 2;
  if (hour < 0) {
    hour += 24;
    date.setDate(date.getDate() - 1);
  }

  date.setHours(hour, minute, 0, 0);

  return date.getTime();
}

function formatDate(ts) {
  return new Date(ts).toLocaleDateString('id-ID', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
  });
}

function formatTime(ts) {
  return new Date(ts).toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

// =========================
// MOD EMBED HELPER
// =========================
function modEmbed(title, description) {
  return new EmbedBuilder()
    .setTitle(title)
    .setDescription(description)
    .setColor(0xe74c3c)
    .setTimestamp();
}