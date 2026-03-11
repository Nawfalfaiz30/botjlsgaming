module.exports = {
  name: "ping",
  description: "ping command",
  async execute(interaction) {
    await interaction.reply("ping works!");
  }
};

// commands/ping.js

const { SlashCommandBuilder } = require('discord.js');
const { modEmbed } = require('../helpers/embed');

module.exports = {
  name: 'ping',

  description: 'Cek latensi bot dan koneksi ke Discord',

  slashBuilder: new SlashCommandBuilder()
    .setName('ping')
    .setDescription('Cek latensi bot (ping/pong)'),

  /**
   * Handler untuk prefix (jls!ping) dan slash (/ping)
   * @param {import('discord.js').Message | import('discord.js').ChatInputCommandInteraction} ctx
   */
  async execute(ctx) {
    const isSlash = ctx.isChatInputCommand?.() ?? false;

    // Kirim pesan sementara untuk menghitung latency
    const loadingEmbed = modEmbed({
      title: '🏓 Menghitung...',
      color: 0xFF69B4,
      description: 'Sedang mengukur kecepatan bot...',
      thumbnail: 'https://i.imgur.com/ping-loading.gif' // GIF loading bola pingpong atau anime-themed (opsional)
    });

    let msg;
    if (isSlash) {
      await ctx.deferReply();
      msg = await ctx.editReply({ embeds: [loadingEmbed] });
    } else {
      msg = await ctx.channel.send({ embeds: [loadingEmbed] });
    }

    // Hitung latency
    const latency = msg.createdTimestamp - (isSlash ? ctx.createdTimestamp : ctx.createdTimestamp);
    const websocketPing = ctx.client.ws.ping;

    // Embed hasil akhir
    const pingEmbed = modEmbed({
      title: '🏓 Pong! Bot Online & Responsif 🎮 ',
      color: 0x00FF7F, // hijau cerah = bagus
      description: `**Latency Pesan:** \`${latency}ms\`\n` +
                   `**WebSocket Ping:** \`${websocketPing}ms\``,
      footer: { text: 'Semakin rendah nilainya, semakin cepat bot merespons!' },
      timestamp: true
    });

    // Tambahkan status kualitas koneksi
    let statusText = 'Baik sekali!';
    let statusColor = 0x00FF00;

    if (websocketPing > 200 || latency > 300) {
      statusText = 'Sedikit lambat, mungkin koneksi sedang tidak stabil.';
      statusColor = 0xFFA500; // oranye
    }
    if (websocketPing > 400 || latency > 600) {
      statusText = 'Koneksi sedang bermasalah!';
      statusColor = 0xFF0000; // merah
    }

    pingEmbed.addFields({
      name: 'Status Koneksi',
      value: statusText,
      inline: false
    });

    // Update embed dengan hasil
    if (isSlash) {
      await ctx.editReply({ embeds: [pingEmbed] });
    } else {
      await msg.edit({ embeds: [pingEmbed] });
    }
  },

  // Metadata
  staffOnly: false,
  category: 'utility',
  cooldown: 5,          // sangat cepat, cooldown pendek saja
  usage_prefix: 'jls!ping',
  usage_slash: '/ping',
};