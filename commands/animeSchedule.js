const {
  SlashCommandBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
} = require('discord.js');

const { getAiringAnime } = require('../helpers/anilistService');

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
    const rangeHours = waktu === 'hari' ? 24 : 168;
    let animeList;
    try {
      animeList = await getAiringAnime({ rangeHours });
    } catch {
      return reply(ctx, isSlash, {
        embeds: [modEmbed('❌ Error', 'Gagal mengambil data jadwal anime.')],
      });
    }

    // =========================
    // FILTER DATA
    // =========================
    let filtered = animeList.map(anime => ({
      anime,
      ts: anime.airingTimestamp,
    }));

    if (genre) {
      filtered = filtered.filter(a =>
        a.anime.genres?.some(g => g.toLowerCase().includes(genre))
      );
    }

    if (!filtered.length) {
      return reply(ctx, isSlash, {
        embeds: [modEmbed('📺 Jadwal Anime', 'Tidak ada anime ditemukan untuk kriteria ini.')],
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
          .setTitle(`${page * PER_PAGE + i + 1}. ${a.anime.title} (Ep. ${a.anime.episode})`)
          .setDescription(
            `⏰ **${formatTime(a.ts)} WIB**\n` +
            `📅 **${formatDate(a.ts)}**\n` +
            `⭐ **Rating:** ${a.anime.score}\n` +
            `🎭 **Genre:** ${a.anime.genres?.slice(0, 3).join(', ') || '—'}\n` +
            `🏢 **Studio:** ${a.anime.studios?.[0] || 'Unknown'}`
          )
          .setThumbnail(a.anime.image)
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

function formatDate(ts) {
  return new Date(ts).toLocaleDateString('id-ID', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    timeZone: 'Asia/Jakarta',
  });
}

function formatTime(ts) {
  return new Date(ts).toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Jakarta',
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