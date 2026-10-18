const {
  SlashCommandBuilder,
  PermissionsBitField,
  EmbedBuilder,
} = require('discord.js');

const { isStaff, logModeration } = require('../helpers/staff');
const { modEmbed } = require('../helpers/embed');

module.exports = {
  name: 'removerole',
  description: 'Menghapus role dari seorang member (Staff Only)',

  slashBuilder: new SlashCommandBuilder()
    .setName('removerole')
    .setDescription('Menghapus role dari seorang member (Staff Only)')
    .addUserOption(option =>
      option
        .setName('user')
        .setDescription('Member yang akan dihapus rolenya')
        .setRequired(true)
    )
    .addRoleOption(option =>
      option
        .setName('role')
        .setDescription('Role yang akan dihapus')
        .setRequired(true)
    )
    .addStringOption(option =>
      option
        .setName('alasan')
        .setDescription('Alasan penghapusan role')
        .setRequired(false)
    ),

  async execute(ctx) {
    const isSlash = ctx.isChatInputCommand?.() ?? false;

    //  Ambil Input
    let targetUser;
    let role;
    let reason = 'Tidak ada alasan';

    if (isSlash) {
      targetUser = ctx.options.getUser('user');
      role = ctx.options.getRole('role');
      reason = ctx.options.getString('alasan')?.trim() || reason;
    } else {
      const mentionedUsers = ctx.mentions.users;
      const mentionedRoles = ctx.mentions.roles;

      if (!mentionedUsers.size || !mentionedRoles.size) {
        return ctx.channel.send({
          embeds: [
            modEmbed({
              title: '❌ Format Salah',
              description: 'Gunakan:\n`jls!removerole @user @role [alasan]`',
              color: 0xff3b3b,
            }),
          ],
        });
      }

      targetUser = mentionedUsers.first();
      role = mentionedRoles.first();
      reason =
        ctx.content
          .split(role.toString())
          .slice(1)
          .join(' ')
          .trim() || reason;
    }

    // Validasi Staff
    if (!isStaff(ctx.member)) {
      return ctx.reply?.({
        embeds: [
          modEmbed({
            title: '🚫 Akses Ditolak',
            description:
              'Perintah ini hanya dapat digunakan oleh **Admin / Staff JLS Gaming**.',
            color: 0xff0000,
          }),
        ],
        ephemeral: true,
      });
    }

    // Fetch Member
    let targetMember;
    try {
      targetMember = await ctx.guild.members.fetch(targetUser.id);
    } catch {
      return ctx.reply?.({
        embeds: [
          modEmbed({
            title: '❌ Member Tidak Ditemukan',
            description: 'Member tidak ada di server ini.',
            color: 0xff0000,
          }),
        ],
        ephemeral: true,
      });
    }

    // Permission Check
    const botMember = ctx.guild.members.me;

    if (!botMember.permissions.has(PermissionsBitField.Flags.ManageRoles)) {
      return ctx.reply?.({
        embeds: [
          modEmbed({
            title: '❌ Izin Bot Tidak Cukup',
            description:
              'Bot membutuhkan izin **Manage Roles** untuk menjalankan perintah ini.',
            color: 0xff0000,
          }),
        ],
        ephemeral: true,
      });
    }

    if (role.position >= botMember.roles.highest.position) {
      return ctx.reply?.({
        embeds: [
          modEmbed({
            title: '⚠️ Role Terlalu Tinggi',
            description:
              'Role tersebut lebih tinggi atau sama dengan role tertinggi bot.',
            color: 0xff9900,
          }),
        ],
        ephemeral: true,
      });
    }

    if (!targetMember.roles.cache.has(role.id)) {
      return ctx.reply?.({
        embeds: [
          modEmbed({
            title: 'ℹ️ Role Tidak Dimiliki',
            description: `${targetMember} tidak memiliki role **${role.name}**.`,
            color: 0xffcc00,
          }),
        ],
        ephemeral: true,
      });
    }

    // Hapus Role
    try {
      await targetMember.roles.remove(
        role,
        `REMOVEROLE oleh ${ctx.member.user.tag} | Alasan: ${reason}`
      );

      // Embed Sukses (Modern)
      const successEmbed = new EmbedBuilder()
        .setColor(0x3498db)
        .setTitle('🗑️ Role Berhasil Dihapus')
        .setDescription(
          `Role **${role.name}** telah berhasil dihapus dari member berikut:`
        )
        .addFields(
          {
            name: '👤 Target',
            value: `${targetMember}\n\`${targetUser.tag}\``,
            inline: true,
          },
          {
            name: '🛡️ Admin',
            value: `${ctx.member}\n\`${ctx.member.user.tag}\``,
            inline: true,
          },
          {
            name: '📌 Alasan',
            value: reason,
            inline: false,
          }
        )
        .setThumbnail(targetUser.displayAvatarURL({ dynamic: true }))
        .setTimestamp()
        .setFooter({
          text: 'JLS Gaming Moderation System',
        });

      if (isSlash) {
        await ctx.reply({ embeds: [successEmbed] });
      } else {
        await ctx.channel.send({ embeds: [successEmbed] });
      }

      /* =============================
       *  Log Moderasi
       * ============================= */
      await logModeration(ctx.guild, successEmbed);
    } catch (err) {
      console.error('[REMOVEROLE ERROR]', err);

      const failEmbed = modEmbed({
        title: '❌ Gagal Menghapus Role',
        description:
          'Terjadi kesalahan saat menghapus role.\nPastikan role berada di bawah role bot.',
        color: 0xff0000,
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
  usage_prefix: 'jls!removerole @user @role [alasan]',
  usage_slash: '/removerole user:@user role:@role [alasan]',
};
