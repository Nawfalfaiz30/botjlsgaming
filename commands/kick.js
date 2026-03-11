// commands/kick.js

const { SlashCommandBuilder, PermissionsBitField } = require('discord.js');
const { modEmbed } = require('../helpers/embed');
const { isStaff, logModeration } = require('../helpers/staff');

module.exports = {
  name: 'kick',
  description: 'Mengeluarkan (kick) seorang member dari server (Staff Only)',

  slashBuilder: new SlashCommandBuilder()
    .setName('kick')
    .setDescription('Kick member dari server (Staff Only)')
    .addUserOption(option =>
      option
        .setName('user')
        .setDescription('Member yang akan di-kick')
        .setRequired(true)
    )
    .addStringOption(option =>
      option
        .setName('alasan')
        .setDescription('Alasan kick (opsional)')
        .setRequired(false)
    ),

  /**
   * @param {import('discord.js').Message | import('discord.js').ChatInputCommandInteraction} ctx
   */
  async execute(ctx) {
    const isSlash = ctx.isChatInputCommand?.() ?? false;

    let targetUser;
    let reason = 'Tidak disebutkan';

    /* ===============================
       AMBIL TARGET & ALASAN
    =============================== */
    if (isSlash) {
      targetUser = ctx.options.getUser('user');
      reason = ctx.options.getString('alasan')?.trim() || reason;
    } else {
      // PREFIX: jls!kick @user alasan
      if (!ctx.mentions.users.size) {
        const embed = modEmbed({
          title: '❌ Format Salah',
          color: 0xFF0000,
          description: 'Gunakan:\n`jls!kick @user [alasan]`',
        });
        return ctx.channel.send({ embeds: [embed] });
      }

      targetUser = ctx.mentions.users.first();

      /**
       * Ambil teks SETELAH mention
       * Contoh:
       * jls!kick @user spam iklan
       * => spam iklan
       */
      const args = ctx.content
        .split(/\s+/)
        .slice(2); // buang "jls!kick" dan "@user"

      if (args.length) {
        reason = args.join(' ');
      }
    }

    /* ===============================
       FETCH MEMBER
    =============================== */
    let targetMember;
    try {
      targetMember = await ctx.guild.members.fetch(targetUser.id);
    } catch {
      const embed = modEmbed({
        title: '❌ Member Tidak Ditemukan',
        color: 0xFF0000,
        description: 'Member tersebut tidak ada di server.',
      });
      return isSlash
        ? ctx.reply({ embeds: [embed], ephemeral: true })
        : ctx.channel.send({ embeds: [embed] });
    }

    /* ===============================
       VALIDASI TARGET
    =============================== */
    if (targetMember.user.bot) {
      const embed = modEmbed({
        title: '⚠️ Tidak Bisa Kick Bot',
        color: 0xFFA500,
        description: 'Bot tidak dapat di-kick.',
      });
      return isSlash
        ? ctx.reply({ embeds: [embed], ephemeral: true })
        : ctx.channel.send({ embeds: [embed] });
    }

    if (
      isStaff(targetMember) &&
      !ctx.member.permissions.has(PermissionsBitField.Flags.Administrator)
    ) {
      const embed = modEmbed({
        title: '⚠️ Target Dilindungi',
        color: 0xFF4500,
        description: 'Hanya **Administrator** yang dapat kick sesama staff.',
      });
      return isSlash
        ? ctx.reply({ embeds: [embed], ephemeral: true })
        : ctx.channel.send({ embeds: [embed] });
    }

    /* ===============================
       CEK IZIN
    =============================== */
    if (!isStaff(ctx.member)) {
      const embed = modEmbed({
        title: '❌ Akses Ditolak',
        color: 0xFF0000,
        description: 'Perintah ini hanya untuk **Staff / Admin**.',
      });
      return isSlash
        ? ctx.reply({ embeds: [embed], ephemeral: true })
        : ctx.channel.send({ embeds: [embed] });
    }

    if (
      !ctx.guild.members.me.permissions.has(
        PermissionsBitField.Flags.KickMembers
      )
    ) {
      const embed = modEmbed({
        title: '❌ Bot Tidak Punya Izin',
        color: 0xFF0000,
        description: 'Bot tidak memiliki izin **Kick Members**.',
      });
      return isSlash
        ? ctx.reply({ embeds: [embed], ephemeral: true })
        : ctx.channel.send({ embeds: [embed] });
    }

    /* ===============================
       EKSEKUSI KICK
    =============================== */
    try {
      await targetMember.kick(
        `Kick oleh ${ctx.member.user.tag} | Alasan: ${reason}`
      );

      const successEmbed = modEmbed({
        title: '👢 Member Di-Kick',
        color: 0xE67E22,
        fields: [
          {
            name: '👤 Target',
            value: `<@${targetUser.id}>`,
            inline: true,
          },
          {
            name: '🛡️ Moderator',
            value: `<@${ctx.member.id}>`,
            inline: true,
          },
          {
            name: '📌 Alasan',
            value: reason,
            inline: false,
          },
        ],
        thumbnail: targetUser.displayAvatarURL({ dynamic: true, size: 512 }),
        footer: {
          text: 'JLS Gaming Moderation System',
        },
        timestamp: true,
      });

      if (isSlash) {
        await ctx.reply({ embeds: [successEmbed] });
      } else {
        await ctx.channel.send({ embeds: [successEmbed] });
      }

      await logModeration(ctx.guild, successEmbed);
    } catch (err) {
      console.error('Kick error:', err);

      const embed = modEmbed({
        title: '❌ Kick Gagal',
        color: 0xFF0000,
        description:
          'Terjadi kesalahan saat melakukan kick.\nPastikan role bot lebih tinggi dari target.',
      });

      if (isSlash) {
        await ctx.reply({ embeds: [embed], ephemeral: true });
      } else {
        await ctx.channel.send({ embeds: [embed] });
      }
    }
  },

  staffOnly: true,
  category: 'moderation',
  usage_prefix: 'jls!kick @user [alasan]',
  usage_slash: '/kick user:@user [alasan]',
};
