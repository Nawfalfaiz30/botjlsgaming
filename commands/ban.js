module.exports = {
  name: "ban",
  description: "ban command",
  async execute(interaction) {
    await interaction.reply("ban works!");
  }
};

const { SlashCommandBuilder, PermissionsBitField } = require('discord.js');
const { modEmbed } = require('../helpers/embed');
const { isStaff, logModeration } = require('../helpers/staff');

module.exports = {
  name: 'ban',

  description: 'Melakukan ban permanen terhadap seorang member (Staff Only)',

  slashBuilder: new SlashCommandBuilder()
    .setName('ban')
    .setDescription('Ban permanen seorang member dari server (Staff Only)')
    .addUserOption(option =>
      option
        .setName('user')
        .setDescription('Member yang akan di-ban')
        .setRequired(true)
    )
    .addStringOption(option =>
      option
        .setName('alasan')
        .setDescription('Alasan melakukan ban (opsional, tapi sangat disarankan)')
        .setRequired(false)
    ),

  /**
   * 
   * @param {import('discord.js').Message | import('discord.js').ChatInputCommandInteraction} ctx
   */
  async execute(ctx) {
    const isSlash = ctx.isChatInputCommand?.() ?? false;

    // Ambil data target dan alasan
    let targetUser, reason = 'Tidak disebutkan';

    if (isSlash) {
      targetUser = ctx.options.getUser('user');
      reason = ctx.options.getString('alasan')?.trim() || 'Tidak disebutkan';
    } else {
      // Prefix: jls!ban @user [alasan]
      const mentionedUsers = ctx.mentions.users;
      if (mentionedUsers.size === 0) {
        const errorEmbed = modEmbed({
          title: '❌ Format Salah',
          color: 0xFF0000,
          description: 'Gunakan: `jls!ban @user [alasan]`',
        });
        return ctx.channel.send({ embeds: [errorEmbed] });
      }

      targetUser = mentionedUsers.first();
      // Ambil teks setelah mention sebagai alasan
      const mentionStr = `<@${targetUser.id}>`;
      reason = ctx.content.split(mentionStr).slice(1).join(' ').trim() || 'Tidak disebutkan';
    }

    // Cek apakah target ada di server
    let targetMember;
    try {
      targetMember = await ctx.guild.members.fetch(targetUser.id);
    } catch {
      const errorEmbed = modEmbed({
        title: '❌ Member Tidak Ditemukan',
        color: 0xFF0000,
        description: 'Member tersebut tidak ada di server atau sudah keluar.',
      });
      return isSlash 
        ? ctx.reply({ embeds: [errorEmbed], ephemeral: true }) 
        : ctx.channel.send({ embeds: [errorEmbed] });
    }

    // Cek apakah target adalah bot atau staff (proteksi)
    if (targetMember.user.bot) {
      const botEmbed = modEmbed({
        title: '⚠️ Tidak Bisa Ban Bot',
        color: 0xFFA500,
        description: 'Bot tidak bisa di-ban menggunakan perintah ini.',
      });
      return isSlash 
        ? ctx.reply({ embeds: [botEmbed], ephemeral: true }) 
        : ctx.channel.send({ embeds: [botEmbed] });
    }

    if (isStaff(targetMember) && !ctx.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
      const staffProtectEmbed = modEmbed({
        title: '⚠️ Tidak Bisa Ban Staff',
        color: 0xFF4500,
        description: 'Hanya **Administrator** yang boleh ban member dengan role staff.',
      });
      return isSlash 
        ? ctx.reply({ embeds: [staffProtectEmbed], ephemeral: true }) 
        : ctx.channel.send({ embeds: [staffProtectEmbed] });
    }

    // Cek izin bot & user
    if (!ctx.guild.members.me.permissions.has(PermissionsBitField.Flags.BanMembers)) {
      const permEmbed = modEmbed({
        title: '❌ Bot Tidak Punya Izin',
        color: 0xFF0000,
        description: 'Bot tidak memiliki izin **Ban Members**.',
      });
      return isSlash 
        ? ctx.reply({ embeds: [permEmbed], ephemeral: true }) 
        : ctx.channel.send({ embeds: [permEmbed] });
    }

    if (!isStaff(ctx.member)) {
      const denyEmbed = modEmbed({
        title: '❌ AKSES DITOLAK',
        color: 0xFF0000,
        description: 'Hanya **JLS Gaming Staff** atau **Admin** yang dapat menggunakan perintah ini.',
      });
      return isSlash 
        ? ctx.reply({ embeds: [denyEmbed], ephemeral: true }) 
        : ctx.channel.send({ embeds: [denyEmbed] });
    }

    try {
      // Lakukan ban
      await ctx.guild.bans.create(targetUser.id, {
        reason: `Diban oleh ${ctx.member.user.tag} | Alasan: ${reason}`,
        deleteMessageSeconds: 604800 
      });

      const successEmbed = modEmbed({
        title: '🔨 Member Telah Di-Ban Permanen',
        color: 0xFF0000, 
        target: targetUser.tag,
        moderator: ctx.member.user.tag,
        reason: reason,
        thumbnail: targetUser.displayAvatarURL({ dynamic: true, size: 512 }),
        footer: { text: 'Ban permanen • Tidak bisa di-unban kecuali manual' },
        timestamp: true
      });

      // Kirim konfirmasi ke channel
      const reply = isSlash
        ? await ctx.reply({ embeds: [successEmbed] })
        : await ctx.channel.send({ embeds: [successEmbed] });

      // Log ke channel moderation
      await logModeration(ctx.guild, successEmbed);

    } catch (error) {
      console.error('Gagal melakukan ban:', error);

      const failEmbed = modEmbed({
        title: '❌ Gagal Melakukan Ban',
        color: 0xFF0000,
        description: 'Terjadi kesalahan saat melakukan ban.\n' +
                     'Pastikan bot memiliki izin **Ban Members** dan role bot lebih tinggi dari target.',
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
  usage_prefix: 'jls!ban @user [alasan]',
  usage_slash: '/ban user:@user [alasan]',
};