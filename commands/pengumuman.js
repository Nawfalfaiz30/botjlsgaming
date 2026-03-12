module.exports = {
  name: "pengumuman",
  description: "pengumuman command",
  async execute(interaction) {
    await interaction.reply("pengumuman works!");
  }
};

// commands/pengumuman.js

const { SlashCommandBuilder } = require('discord.js');
const ANNOUNCEMENT_TEXT = require('../data/announcementText');
const { modEmbed } = require('../helpers/embed');
const { isStaff } = require('../helpers/staff');

module.exports = {
  name: 'pengumuman',

  description: 'Menampilkan pengumuman terbaru server (hanya untuk staff)',

  slashBuilder: new SlashCommandBuilder()
    .setName('pengumuman')
    .setDescription('Menampilkan pengumuman terbaru server (Staff Only)'),

  /**
   * Handler untuk prefix (jls!pengumuman) dan slash (/pengumuman)
   * @param {import('discord.js').Message | import('discord.js').ChatInputCommandInteraction} ctx
   */
  async execute(ctx) {
    const isSlash = ctx.isChatInputCommand?.() ?? false;
    const member = isSlash ? ctx.member : ctx.member;

    // Hanya staff yang boleh menggunakan command ini
    if (!isStaff(member)) {
      const denyEmbed = modEmbed({
        title: '❌ AKSES DITOLAK',
        color: 0xFF0000,
        description: 'Perintah ini hanya tersedia untuk **JLS Gaming Staff** atau **Admin**.',
        keterangan: 'Hubungi staff jika ada pertanyaan.'
      });

      if (isSlash) {
        return ctx.reply({ embeds: [denyEmbed], ephemeral: true });
      }
      return ctx.channel.send({ embeds: [denyEmbed] });
    }

    // Embed pengumuman dengan tampilan menarik
    const announcementEmbed = modEmbed({
      title: '🎮  PENGUMUMAN RESMI JLS Gaming 🎮 ',
      color: 0x2941F2, // pink tema utama
      description: ANNOUNCEMENT_TEXT,
      thumbnail: guild.iconURL({ dynamic: true, size: 512 }),
      footer: { text: 'Tetap semangat di JLS Gaming!  • Dibuat oleh Staff' },
      timestamp: true
    });

    // Tambahan field opsional jika ingin highlight sesuatu
    announcementEmbed.addFields(
      {
        name: '📢 Info Penting',
        value: 'Pastikan kalian baca sampai habis ya!\nJangan lupa invite temen wibu lainnya~',
        inline: false
      }
    );

    // Kirim pesan
    if (isSlash) {
      await ctx.reply({ embeds: [announcementEmbed], content: '@everyone' }); // ping everyone di slash
    } else {
      await ctx.channel.send({ embeds: [announcementEmbed], content: '@everyone' });
    }
  },

  // Metadata tambahan
  staffOnly: true,
  category: 'staff',
  cooldown: 300, // contoh: 5 menit cooldown (opsional, bisa ditambahkan logic di index.js nanti)
};