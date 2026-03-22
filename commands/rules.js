// commands/rules.js

const { SlashCommandBuilder } = require('discord.js');
const RULES_TEXT = require('../data/rulesText');
const { modEmbed } = require('../helpers/embed');
const { isStaff } = require('../helpers/staff');

module.exports = {
  name: 'rules',
  description: 'Menampilkan peraturan server (Staff Only)',

  slashBuilder: new SlashCommandBuilder()
    .setName('rules')
    .setDescription('Menampilkan peraturan server (Staff Only)'),

  /**
   * 
   * @param {import('discord.js').Message | import('discord.js').ChatInputCommandInteraction} ctx
   */
  async execute(ctx) {

    const isSlash = typeof ctx.isChatInputCommand === "function";
    const member = ctx.member;
    const guild = ctx.guild;

    // Cek apakah user staff
    if (!isStaff(member)) {

      const denyEmbed = modEmbed({
        title: '❌ AKSES DITOLAK',
        color: 0xFF0000,
        description: 'Perintah ini hanya bisa digunakan oleh **JLS Gaming Staff** atau **Admin**.',
        keterangan: 'Jika kamu merasa ini kesalahan, hubungi staff.'
      });

      if (isSlash) {
        return ctx.reply({ embeds: [denyEmbed], ephemeral: true });
      } else {
        return ctx.channel.send({ embeds: [denyEmbed] });
      }
    }

    // Embed rules
    const rulesEmbed = modEmbed({
      title: '📜 Aturan Server JLS Gaming',
      color: 0x2941F2,
      description: RULES_TEXT,
      thumbnail: guild?.iconURL({ dynamic: true, size: 512 }),
      footer: { text: 'Dibaca dan dipatuhi ya, biar server tetap nyaman! 🎮' },
      timestamp: true
    });

    // Kirim pesan
    if (isSlash) {
      await ctx.reply({
        embeds: [rulesEmbed]
      });
    } else {
      await ctx.channel.send({
        embeds: [rulesEmbed]
      });
    }

  },

  requiredPermissions: ['ManageGuild'],
  staffOnly: true
};