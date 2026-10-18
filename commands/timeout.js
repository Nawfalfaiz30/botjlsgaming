const { SlashCommandBuilder, PermissionsBitField } = require('discord.js');
const { modEmbed } = require('../helpers/embed');
const { isStaff, logModeration } = require('../helpers/staff');

function parseDuration(input) {
  if (!input) return null;

  const match = input.toLowerCase().match(/^(\d+)(m|h|d|w)$/);
  if (!match) return null;

  const value = parseInt(match[1]);
  const unit = match[2];

  const map = {
    m: { ms: 60 * 1000, label: 'menit' },
    h: { ms: 60 * 60 * 1000, label: 'jam' },
    d: { ms: 24 * 60 * 60 * 1000, label: 'hari' },
    w: { ms: 7 * 24 * 60 * 60 * 1000, label: 'minggu' },
  };

  return {
    ms: value * map[unit].ms,
    readable: `${value} ${map[unit].label}`,
    raw: `${value}${unit}`,
  };
}

module.exports = {
  name: 'timeout',
  description: 'Melakukan timeout (mute sementara) terhadap member (Staff Only)',

  slashBuilder: new SlashCommandBuilder()
    .setName('timeout')
    .setDescription('Timeout member dengan durasi fleksibel (Staff Only)')
    .addUserOption(option =>
      option
        .setName('user')
        .setDescription('Member yang akan di-timeout')
        .setRequired(true)
    )
    .addStringOption(option =>
      option
        .setName('durasi')
        .setDescription('Durasi timeout (contoh: 30m, 2h, 1d, 1w)')
        .setRequired(true)
    )
    .addStringOption(option =>
      option
        .setName('alasan')
        .setDescription('Alasan timeout (opsional)')
        .setRequired(false)
    ),

  /**
   * @param {import('discord.js').Message | import('discord.js').ChatInputCommandInteraction} ctx
   */
  async execute(ctx) {
    const isSlash = ctx.isChatInputCommand?.() ?? false;

    let targetUser, durationInput, reason = 'Tidak disebutkan';

    // AMBIL INPUT
    if (isSlash) {
      targetUser = ctx.options.getUser('user');
      durationInput = ctx.options.getString('durasi');
      reason = ctx.options.getString('alasan')?.trim() || 'Tidak disebutkan';
    } else {
      const mentionedUsers = ctx.mentions.users;
      if (mentionedUsers.size === 0) {
        return ctx.channel.send({
          embeds: [modEmbed({
            title: '❌ Format Salah',
            color: 0xFF0000,
            description:
              'Gunakan:\n' +
              '`jls!timeout @user <durasi> [alasan]`\n\n' +
              'Contoh:\n' +
              '`jls!timeout @user 2h Spam chat`',
          })],
        });
      }

      targetUser = mentionedUsers.first();
      const args = ctx.content
        .split(/<@!?\d+>/)
        .slice(1)
        .join(' ')
        .trim()
        .split(/\s+/);

      durationInput = args.shift();
      reason = args.join(' ') || 'Tidak disebutkan';
    }

    const duration = parseDuration(durationInput);
    if (!duration) {
      return (isSlash ? ctx.reply : ctx.channel.send).call(ctx, {
        embeds: [modEmbed({
          title: '❌ Durasi Tidak Valid',
          color: 0xFF0000,
          description:
            'Format durasi tidak valid.\n\n' +
            '**Format yang didukung:**\n' +
            '`10m` = 10 menit\n' +
            '`2h`  = 2 jam\n' +
            '`1d`  = 1 hari\n' +
            '`1w`  = 1 minggu',
        })],
        ephemeral: isSlash,
      });
    }

    // FETCH MEMBER
    let targetMember;
    try {
      targetMember = await ctx.guild.members.fetch(targetUser.id);
    } catch {
      return (isSlash ? ctx.reply : ctx.channel.send).call(ctx, {
        embeds: [modEmbed({
          title: '❌ Member Tidak Ditemukan',
          color: 0xFF0000,
          description: 'Member tidak ada di server.',
        })],
        ephemeral: isSlash,
      });
    }

    // VALIDASI
    if (targetMember.user.bot) {
      return (isSlash ? ctx.reply : ctx.channel.send).call(ctx, {
        embeds: [modEmbed({
          title: '⚠️ Tidak Bisa Timeout Bot',
          color: 0xFFA500,
          description: 'Bot tidak bisa di-timeout.',
        })],
        ephemeral: isSlash,
      });
    }

    if (!ctx.guild.members.me.permissions.has(PermissionsBitField.Flags.ModerateMembers)) {
      return (isSlash ? ctx.reply : ctx.channel.send).call(ctx, {
        embeds: [modEmbed({
          title: '❌ Bot Tidak Punya Izin',
          color: 0xFF0000,
          description: 'Bot tidak memiliki izin **Moderate Members**.',
        })],
        ephemeral: isSlash,
      });
    }

    if (!isStaff(ctx.member)) {
      return (isSlash ? ctx.reply : ctx.channel.send).call(ctx, {
        embeds: [modEmbed({
          title: '❌ AKSES DITOLAK',
          color: 0xFF0000,
          description: 'Hanya **Staff / Admin** yang dapat menggunakan perintah ini.',
        })],
        ephemeral: isSlash,
      });
    }

    // EXECUTE TIMEOUT
    try {
      await targetMember.timeout(
        duration.ms,
        `Timeout oleh ${ctx.member.user.tag} | ${reason}`
      );

      const successEmbed = modEmbed({
        title: '🔇 Member Di-Timeout',
        color: 0xF1C40F,
        fields: [
          {
            name: '👤 Target',
            value: `**${targetUser}**\n\`${targetUser.username}\``,
            inline: true,
          },
          {
            name: '🛡️ Moderator',
            value: `**${ctx.member}**\n\`${ctx.member.user.username}\``,
            inline: true,
          },
          {
            name: '⏳ Durasi',
            value: `**${duration.readable}**`,
            inline: false,
          },
          {
            name: '📌 Alasan',
            value: reason,
            inline: false,
          },
        ],
        thumbnail: targetUser.displayAvatarURL({ dynamic: true, size: 512 }),
        footer: {
          text: 'JLS Gaming Moderation System • Timeout Bersifat Sementara',
        },
        timestamp: true,
      });

      isSlash
        ? await ctx.reply({ embeds: [successEmbed] })
        : await ctx.channel.send({ embeds: [successEmbed] });

      await logModeration(ctx.guild, successEmbed);

    } catch (err) {
      console.error(err);
      return (isSlash ? ctx.reply : ctx.channel.send).call(ctx, {
        embeds: [modEmbed({
          title: '❌ Gagal Melakukan Timeout',
          color: 0xFF0000,
          description:
            'Timeout gagal.\n' +
            '⚠️ Discord membatasi maksimal timeout (±28 hari).',
        })],
        ephemeral: isSlash,
      });
    }
  },

  staffOnly: true,
  category: 'moderation',
  usage_prefix: 'jls!timeout @user <durasi> [alasan]',
  usage_slash: '/timeout user:@user durasi:<m|h|d|w> [alasan]',
};
