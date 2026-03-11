module.exports = {
  name: "rules",
  description: "rules command",
  async execute(interaction) {
    await interaction.reply("rules works!");
  }
};

// commands/rules.js

const { SlashCommandBuilder } = require('discord.js');
const RULES_TEXT = require('../data/rulesText');
const { modEmbed } = require('../helpers/embed');
const { isStaff } = require('../helpers/staff');

module.exports = {
  // Nama command (dipakai untuk prefix jls!rules dan slash /rules)
  name: 'rules',

  // Deskripsi untuk help command dan slash command registration
  description: 'Menampilkan peraturan server (hanya untuk staff)',

  // Builder untuk slash command
  slashBuilder: new SlashCommandBuilder()
    .setName('rules')
    .setDescription('Menampilkan peraturan server (Staff Only)'),

  /**
   * Handler utama yang bisa dipanggil baik dari prefix maupun slash
   * @param {import('discord.js').Message | import('discord.js').ChatInputCommandInteraction} ctx
   * @param {import('discord.js').Client} client (opsional, jika butuh akses global)
   */
  async execute(ctx) {
    // Deteksi apakah ini slash command atau prefix command
    const isSlash = ctx.isChatInputCommand?.() ?? false;

    // Ambil member (berbeda cara aksesnya tergantung tipe ctx)
    const member = isSlash ? ctx.member : ctx.member;

    // Cek apakah user adalah staff
    if (!isStaff(member)) {
      const denyEmbed = modEmbed({
        title: '❌ AKSES DITOLAK',
        color: 0xFF0000,
        description: 'Perintah ini hanya bisa digunakan oleh **JLS Gaming Staff** atau **Admin**.',
        keterangan: 'Jika kamu merasa ini kesalahan, hubungi staff melalui DM.'
      });

      if (isSlash) {
        return ctx.reply({ embeds: [denyEmbed], ephemeral: true });
      } else {
        return ctx.channel.send({ embeds: [denyEmbed] });
      }
    }

    // Embed rules yang menarik
    const rulesEmbed = modEmbed({
      title: '📜 Aturan Server JLS Gaming',
      color: 0xFF69B4,           // warna pink tema sakura
      description: RULES_TEXT,
      thumbnail: 'https://i.imgur.com/0ZxYk.gif', // contoh GIF sakura (ganti sesuai selera)
      footer: { text: 'Dibaca dan dipatuhi ya, biar server tetap nyaman! 🎮 ' }
    });

    // Kirim balasan
    if (isSlash) {
      await ctx.reply({ embeds: [rulesEmbed] });
    } else {
      await ctx.channel.send({ embeds: [rulesEmbed] });
    }
  },

  // Opsional: permission yang dibutuhkan (untuk dokumentasi atau auto-check di masa depan)
  requiredPermissions: ['ManageGuild'], // hanya contoh, sesuaikan kebutuhan
  staffOnly: true,
};