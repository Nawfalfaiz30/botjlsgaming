module.exports = {
  name: "episodeTracker",
  description: "episodeTracker command",
  async execute(interaction) {
    await interaction.reply("episodeTracker works!");
  }
};

// commands/episodeTracker.js

const { SlashCommandBuilder } = require('discord.js');
const axios = require('axios');
const { modEmbed, formatDuration } = require('../helpers/embed');

const ANILIST_GRAPHQL_URL = 'https://graphql.anilist.co';

module.exports = {
  name: 'episodetracker',

  description: 'Cek jadwal rilis episode terbaru / selanjutnya dari anime tertentu',

  slashBuilder: new SlashCommandBuilder()
    .setName('episodetracker')
    .setDescription('Cek jadwal episode anime selanjutnya')
    .addStringOption(option =>
      option
        .setName('judul')
        .setDescription('Nama anime yang ingin dicek (bahasa apa saja)')
        .setRequired(true)
    ),

  /**
   * Handler untuk prefix (jls!episodetracker) dan slash (/episodetracker)
   * @param {import('discord.js').Message | import('discord.js').ChatInputCommandInteraction} ctx
   */
  async execute(ctx) {
    const isSlash = ctx.isChatInputCommand?.() ?? false;

    // Ambil judul anime
    let animeTitle;
    if (isSlash) {
      animeTitle = ctx.options.getString('judul')?.trim();
    } else {
      // Prefix: jls!episodetracker One Piece
      animeTitle = ctx.content.slice('jls!episodetracker'.length).trim();
    }

    if (!animeTitle) {
      const errorEmbed = modEmbed({
        title: '❌ Judul Anime Dibutuhkan',
        color: 0xFF0000,
        description: 'Contoh penggunaan:\n' +
                     '• `/episodetracker judul: Jujutsu Kaisen`\n' +
                     '• `jls!episodetracker Jujutsu Kaisen`',
      });
      return isSlash 
        ? ctx.reply({ embeds: [errorEmbed], ephemeral: true }) 
        : ctx.channel.send({ embeds: [errorEmbed] });
    }

    await (isSlash ? ctx.deferReply() : ctx.channel.sendTyping?.());

    try {
      // Query GraphQL AniList
      const query = `
        query ($search: String) {
          Media(search: $search, type: ANIME, sort: POPULARITY_DESC) {
            id
            title {
              romaji
              english
              native
            }
            status
            nextAiringEpisode {
              episode
              airingAt
              timeUntilAiring
            }
            episodes
            coverImage {
              large
            }
            siteUrl
          }
        }
      `;

      const variables = { search: animeTitle };
      const response = await axios.post(ANILIST_GRAPHQL_URL, { query, variables }, {
        headers: { 'Content-Type': 'application/json' },
        timeout: 10000
      });

      const data = response.data.data.Media;

      if (!data) {
        const notFoundEmbed = modEmbed({
          title: '❌ Anime Tidak Ditemukan',
          color: 0xFF0000,
          description: `Tidak menemukan anime dengan judul "${animeTitle}".\nCoba ketik judul yang lebih tepat atau gunakan nama romaji/inggris.`,
        });
        return isSlash 
          ? ctx.editReply({ embeds: [notFoundEmbed] }) 
          : ctx.channel.send({ embeds: [notFoundEmbed] });
      }

      const title = data.title.english || data.title.romaji || data.title.native || 'Unknown Title';
      const cover = data.coverImage?.large;
      const status = data.status;
      const totalEpisodes = data.episodes || '?';
      const nextEp = data.nextAiringEpisode;

      let description = `**${title}**\n`;

      if (nextEp) {
        const timeLeftMs = nextEp.timeUntilAiring * 1000;
        const timeLeftStr = formatDuration(timeLeftMs);

        description += `\n**Episode selanjutnya**: ${nextEp.episode}/${totalEpisodes}\n` +
                       `Rilis dalam: **${timeLeftStr}**\n` +
                       `Tanggal tayang: <t:${nextEp.airingAt}:F> (<t:${nextEp.airingAt}:R>)`;
      } else {
        if (status === 'FINISHED') {
          description += `\n**Anime sudah selesai** (${totalEpisodes} episode)`;
        } else if (status === 'NOT_YET_RELEASED') {
          description += `\n**Belum tayang** (belum ada episode yang rilis)`;
        } else {
          description += `\n**Tidak ada info episode selanjutnya saat ini** (mungkin sudah tamat atau hiatus)`;
        }
      }

      const trackerEmbed = modEmbed({
        title: '⏰ Episode Tracker - AniList',
        color: 0xFF69B4,
        description: description,
        thumbnail: cover || 'https://i.imgur.com/default-anime-cover.jpg', // fallback jika tidak ada cover
        url: data.siteUrl || 'https://anilist.co',
        footer: { text: 'Data dari AniList • Update real-time' },
        timestamp: true
      });

      trackerEmbed.addFields(
        { name: 'Status', value: status.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, c => c.toUpperCase()), inline: true },
        { name: 'Total Episode', value: totalEpisodes.toString(), inline: true }
      );

      if (isSlash) {
        await ctx.editReply({ embeds: [trackerEmbed] });
      } else {
        await ctx.channel.send({ embeds: [trackerEmbed] });
      }

    } catch (error) {
      console.error('Gagal fetch episode tracker:', error.message);

      const errorEmbed = modEmbed({
        title: '❌ Gagal Memuat Data',
        color: 0xFF0000,
        description: 'Terjadi kesalahan saat mengambil data dari AniList.\nCoba lagi nanti atau periksa koneksi bot.',
      });

      if (isSlash) {
        await ctx.editReply({ embeds: [errorEmbed] });
      } else {
        await ctx.channel.send({ embeds: [errorEmbed] });
      }
    }
  },

  // Metadata
  staffOnly: false,
  category: 'anime',
  cooldown: 15,         // 15 detik cooldown agar tidak spam API
  usage_prefix: 'jls!episodetracker <judul anime>',
  usage_slash: '/episodetracker judul:<judul anime>',
};