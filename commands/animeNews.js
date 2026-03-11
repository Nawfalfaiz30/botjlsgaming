module.exports = {
  name: "animeNews",
  description: "animeNews command",
  async execute(interaction) {
    await interaction.reply("animeNews works!");
  }
};

// commands/animeNews.js

const { SlashCommandBuilder } = require('discord.js');
const axios = require('axios');
const { modEmbed } = require('../helpers/embed');

const ANN_RSS_URL = 'https://www.animenewsnetwork.com/news/rss.xml'; // RSS resmi ANN

module.exports = {
  name: 'animenews',

  description: 'Menampilkan 5 berita anime terbaru dari Anime News Network',

  slashBuilder: new SlashCommandBuilder()
    .setName('animenews')
    .setDescription('Dapatkan update berita anime terbaru'),

  /**
   * Handler untuk prefix (jls!animenews) dan slash (/animenews)
   * @param {import('discord.js').Message | import('discord.js').ChatInputCommandInteraction} ctx
   */
  async execute(ctx) {
    const isSlash = ctx.isChatInputCommand?.() ?? false;

    await (isSlash ? ctx.deferReply() : ctx.channel.sendTyping?.()); // agar user tahu bot sedang load

    try {
      const response = await axios.get(ANN_RSS_URL, { timeout: 10000 });
      const xml = response.data;

      // Parse RSS sederhana (cari item terbaru)
      const items = xml.match(/<item>([\s\S]*?)<\/item>/g) || [];
      const news = [];

      for (let i = 0; i < Math.min(5, items.length); i++) {
        const item = items[i];
        const titleMatch = item.match(/<title>(.*?)<\/title>/);
        const linkMatch = item.match(/<link>(.*?)<\/link>/);
        const descMatch = item.match(/<description>([\s\S]*?)<\/description>/);
        const pubDateMatch = item.match(/<pubDate>(.*?)<\/pubDate>/);

        if (titleMatch && linkMatch) {
          const title = titleMatch[1].replace(/<!\[CDATA\[(.*?)\]\]>/, '$1').trim();
          const link = linkMatch[1].trim();
          const descRaw = descMatch ? descMatch[1].replace(/<!\[CDATA\[(.*?)\]\]>/, '$1').trim() : '';
          const desc = descRaw.length > 150 ? descRaw.substring(0, 147) + '...' : descRaw;

          const dateStr = pubDateMatch ? new Date(pubDateMatch[1]).toLocaleDateString('id-ID', {
            day: 'numeric', month: 'short', year: 'numeric'
          }) : 'Baru saja';

          news.push(`**${dateStr}**\n[${title}](${link})\n${desc}\n`);
        }
      }

      if (news.length === 0) {
        throw new Error('Tidak ada berita yang bisa di-parse');
      }

      const newsEmbed = modEmbed({
        title: '📰 Berita Anime Terbaru (Anime News Network)',
        color: 0xFF69B4,
        description: news.join('\n─────────────────\n') || 'Tidak ada berita baru saat ini.',
        thumbnail: 'https://i.imgur.com/ANN-logo.png', // ganti dengan URL logo ANN jika punya, atau hapus baris ini
        footer: { text: 'Sumber: animenewsnetwork.com • Update otomatis via RSS' },
        timestamp: true
      });

      newsEmbed.addFields({
        name: '🔗 Baca Selengkapnya',
        value: '[Kunjungi Anime News Network](https://www.animenewsnetwork.com/)',
        inline: false
      });

      if (isSlash) {
        await ctx.editReply({ embeds: [newsEmbed] });
      } else {
        await ctx.channel.send({ embeds: [newsEmbed] });
      }

    } catch (error) {
      console.error('Gagal fetch anime news:', error.message);

      const errorEmbed = modEmbed({
        title: '❌ Gagal Memuat Berita',
        color: 0xFF0000,
        description: 'Tidak bisa mengambil berita dari Anime News Network saat ini.\nCoba lagi nanti atau cek koneksi internet bot.',
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
  cooldown: 60,       // 1 menit cooldown agar tidak spam API/RSS
  usage_prefix: 'jls!animenews',
  usage_slash: '/animenews',
};