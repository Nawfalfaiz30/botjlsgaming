module.exports = {
  name: "purge",
  description: "purge command",
  async execute(interaction) {
    await interaction.reply("purge works!");
  }
};

const { SlashCommandBuilder, PermissionsBitField } = require('discord.js');
const { modEmbed } = require('../helpers/embed');
const { isStaff, logModeration } = require('../helpers/staff');

module.exports = {
  name: 'purge',

  description: 'Menghapus sejumlah pesan terbaru di channel (Staff Only)',

  slashBuilder: new SlashCommandBuilder()
    .setName('purge')
    .setDescription('Hapus banyak pesan sekaligus (maks 100) (Staff Only)')
    .addIntegerOption(option =>
      option
        .setName('jumlah')
        .setDescription('Jumlah pesan yang ingin dihapus (1-100)')
        .setRequired(true)
        .setMinValue(1)
        .setMaxValue(100)
    ),

  /**
   * 
   * @param {import('discord.js').Message | import('discord.js').ChatInputCommandInteraction} ctx
   */
  async execute(ctx) {
    const isSlash = ctx.isChatInputCommand?.() ?? false;
    const member = isSlash ? ctx.member : ctx.member;

    // Hanya staff yang boleh purge
    if (!isStaff(member)) {
      const denyEmbed = modEmbed({
        title: '❌ AKSES DITOLAK',
        color: 0xFF0000,
        description: 'Perintah ini hanya bisa digunakan oleh **JLS Gaming Staff** atau **Admin**.',
      });

      if (isSlash) {
        return ctx.reply({ embeds: [denyEmbed], ephemeral: true });
      }
      return ctx.channel.send({ embeds: [denyEmbed] });
    }

    // Cek izin bot
    if (!ctx.guild.members.me.permissions.has(PermissionsBitField.Flags.ManageMessages)) {
      const permEmbed = modEmbed({
        title: '❌ Bot Tidak Punya Izin',
        color: 0xFF0000,
        description: 'Bot tidak memiliki izin **Manage Messages** untuk melakukan purge.',
      });
      return isSlash 
        ? ctx.reply({ embeds: [permEmbed], ephemeral: true }) 
        : ctx.channel.send({ embeds: [permEmbed] });
    }

    // Ambil jumlah pesan yang ingin dihapus
    let amount;
    if (isSlash) {
      amount = ctx.options.getInteger('jumlah');
    } else {
      const args = ctx.content.slice('jls!purge'.length).trim();
      amount = parseInt(args);
      if (isNaN(amount) || amount < 1 || amount > 100) {
        const errorEmbed = modEmbed({
          title: '❌ Jumlah Invalid',
          color: 0xFF0000,
          description: 'Masukkan jumlah pesan yang valid (1-100).\nContoh: `jls!purge 50`',
        });
        return ctx.channel.send({ embeds: [errorEmbed] });
      }
    }

    try {
      // Hapus pesan (bulkDelete menghapus pesan + pesan command itu sendiri, jadi +1)
      const deletedMessages = await ctx.channel.bulkDelete(amount + 1, true); 

      const successEmbed = modEmbed({
        title: '🧹 Purge Selesai',
        color: 0xFF4500, 
        description: `Berhasil menghapus **${deletedMessages.size - 1}** pesan.`,
        footer: { text: `Dilakukan oleh ${ctx.member.user.tag} • Pesan lebih tua dari 14 hari tidak terhapus` },
        timestamp: true
      });

      // Kirim konfirmasi (sementara, auto-hapus setelah 5 detik)
      let replyMsg;
      if (isSlash) {
        replyMsg = await ctx.reply({ embeds: [successEmbed], fetchReply: true });
      } else {
        replyMsg = await ctx.channel.send({ embeds: [successEmbed] });
      }

      // Auto-hapus pesan konfirmasi setelah 5 detik
      setTimeout(async () => {
        try {
          await replyMsg.delete().catch(() => {});
        } catch {
          // abaikan jika sudah terhapus atau error
        }
      }, 5000);

      // Log ke channel moderation
      const logEmbed = modEmbed({
        title: '🗑️ Purge Dilakukan',
        color: 0xFF4500,
        moderator: ctx.member.user.tag,
        keterangan: `Menghapus **${deletedMessages.size - 1}** pesan di <#${ctx.channel.id}>`,
        timestamp: true
      });

      await logModeration(ctx.guild, logEmbed);

    } catch (error) {
      console.error('Gagal purge:', error);

      const failEmbed = modEmbed({
        title: '❌ Gagal Melakukan Purge',
        color: 0xFF0000,
        description: 'Terjadi kesalahan saat menghapus pesan.\n' +
                     'Pastikan bot punya izin **Manage Messages** dan pesan tidak lebih tua dari 14 hari.',
      });

      if (isSlash) {
        await ctx.reply({ embeds: [failEmbed], ephemeral: true });
      } else {
        await ctx.channel.send({ embeds: [failEmbed] });
      }
    }
  },

  staffOnly: true,
  category: 'moderation',
  usage_prefix: 'jls!purge <jumlah>   (contoh: jls!purge 30)',
  usage_slash: '/purge jumlah:<angka 1-100>',
};