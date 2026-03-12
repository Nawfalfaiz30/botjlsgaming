// commands/pengumuman.js

const { SlashCommandBuilder } = require('discord.js');
const ANNOUNCEMENT_TEXT = require('../data/announcementText');
const { modEmbed } = require('../helpers/embed');
const { isStaff } = require('../helpers/staff');

module.exports = {
  name: 'pengumuman',
  description: 'Menampilkan pengumuman terbaru server (Staff Only)',

  slashBuilder: new SlashCommandBuilder()
    .setName('pengumuman')
    .setDescription('Menampilkan pengumuman terbaru server (Staff Only)'),

  /**
   * Handler untuk prefix (jls!pengumuman) dan slash (/pengumuman)
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
        description: 'Perintah ini hanya tersedia untuk **JLS Gaming Staff** atau **Admin**.',
        keterangan: 'Hubungi staff jika ada pertanyaan.'
      });

      if (isSlash) {
        return ctx.reply({ embeds: [denyEmbed], ephemeral: true });
      } else {
        return ctx.channel.send({ embeds: [denyEmbed] });
      }
    }

    // Embed pengumuman
    const announcementEmbed = modEmbed({
      title: '🎮 PENGUMUMAN RESMI JLS Gaming 🎮',
      color: 0x2941F2,
      description: ANNOUNCEMENT_TEXT,
      thumbnail: guild?.iconURL({ dynamic: true, size: 512 }),
      footer: { text: 'Tetap semangat di JLS Gaming! • Dibuat oleh Staff' },
      timestamp: true
    });

    announcementEmbed.addFields({
      name: '📢 Info Penting',
      value: 'Pastikan kalian baca sampai habis ya!\nJangan lupa invite teman wibu lainnya~',
      inline: false
    });

    // Kirim pesan
    if (isSlash) {
      await ctx.reply({
        content: '@everyone',
        embeds: [announcementEmbed]
      });
    } else {
      await ctx.channel.send({
        content: '@everyone',
        embeds: [announcementEmbed]
      });
    }

  },

  staffOnly: true,
  category: 'staff',
  cooldown: 300
};