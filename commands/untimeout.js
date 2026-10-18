module.exports = {
  name: "untimeout",
  description: "untimeout command",
  async execute(interaction) {
    await interaction.reply("untimeout works!");
  }
};


const { SlashCommandBuilder, PermissionsBitField } = require('discord.js');
const { modEmbed } = require('../helpers/embed');
const { isStaff, logModeration } = require('../helpers/staff');

module.exports = {
  name: 'untimeout',

  description: 'Mencabut timeout (unmute) dari seorang member (Staff Only)',

  slashBuilder: new SlashCommandBuilder()
    .setName('untimeout')
    .setDescription('Cabut timeout dari member (Staff Only)')
    .addUserOption(option =>
      option
        .setName('user')
        .setDescription('Member yang timeout-nya akan dicabut')
        .setRequired(true)
    )
    .addStringOption(option =>
      option
        .setName('alasan')
        .setDescription('Alasan mencabut timeout (opsional)')
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
      const mentionedUsers = ctx.mentions.users;
      if (mentionedUsers.size === 0) {
        const errorEmbed = modEmbed({
          title: '❌ Format Salah',
          color: 0xFF0000,
          description: 'Gunakan: `jls!untimeout @user [alasan]`\nContoh: `jls!untimeout @user Sudah cukup`',
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

    // Cek apakah member memang sedang di-timeout
    if (!targetMember.isCommunicationDisabled()) {
      const notTimedOutEmbed = modEmbed({
        title: 'ℹ️ Tidak Ada Timeout Aktif',
        color: 0xFFFF00,
        description: `${targetUser.tag} tidak sedang di-timeout saat ini.`,
      });
      return isSlash 
        ? ctx.reply({ embeds: [notTimedOutEmbed], ephemeral: true }) 
        : ctx.channel.send({ embeds: [notTimedOutEmbed] });
    }

    // Proteksi: tidak bisa untimeout bot (meski bot jarang di-timeout)
    if (targetMember.user.bot) {
      const botEmbed = modEmbed({
        title: '⚠️ Tidak Bisa Untimeout Bot',
        color: 0xFFA500,
        description: 'Bot tidak perlu di-untimeout menggunakan perintah ini.',
      });
      return isSlash 
        ? ctx.reply({ embeds: [botEmbed], ephemeral: true }) 
        : ctx.channel.send({ embeds: [botEmbed] });
    }

    // Cek izin bot & user
    if (!ctx.guild.members.me.permissions.has(PermissionsBitField.Flags.ModerateMembers)) {
      const permEmbed = modEmbed({
        title: '❌ Bot Tidak Punya Izin',
        color: 0xFF0000,
        description: 'Bot tidak memiliki izin **Moderate Members** (Timeout).',
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
      // Cabut timeout (set timeout ke null)
      await targetMember.timeout(null, `Timeout dicabut oleh ${ctx.member.user.tag} | Alasan: ${reason}`);

      const successEmbed = modEmbed({
  title: '🔊 Timeout Dicabut',
  color: 0x2ECC71, 
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
      name: '📌 Alasan',
      value: reason,
      inline: false,
    },
  ],
  thumbnail: targetUser.displayAvatarURL({ dynamic: true, size: 512 }),
  footer: {
    text: 'JLS Gaming Moderation System • Member dapat berbicara kembali',
  },
  timestamp: true,
});


      // Kirim konfirmasi ke channel
      const reply = isSlash
        ? await ctx.reply({ embeds: [successEmbed] })
        : await ctx.channel.send({ embeds: [successEmbed] });

      // Log ke channel moderation
      await logModeration(ctx.guild, successEmbed);

    } catch (error) {
      console.error('Gagal mencabut timeout:', error);

      const failEmbed = modEmbed({
        title: '❌ Gagal Mencabut Timeout',
        color: 0xFF0000,
        description: 'Terjadi kesalahan saat mencabut timeout.\n' +
                     'Pastikan bot memiliki izin **Moderate Members** dan role bot lebih tinggi dari target.',
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
  usage_prefix: 'jls!untimeout @user [alasan]',
  usage_slash: '/untimeout user:@user [alasan]',
};