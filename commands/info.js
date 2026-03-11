// commands/info.js

const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { modEmbed } = require('../helpers/embed');

module.exports = {
  name: 'info',
  description: 'Menampilkan informasi lengkap tentang server JLS Gaming',

  slashBuilder: new SlashCommandBuilder()
    .setName('info')
    .setDescription('Menampilkan informasi lengkap server'),

  /**
   * Handler untuk prefix dan slash command
   * @param {import('discord.js').Message | import('discord.js').ChatInputCommandInteraction} ctx
   */
  async execute(ctx) {
    const isSlash = ctx.isChatInputCommand?.() ?? false;
    const guild = ctx.guild;

    // =============================
    // VALIDASI GUILD
    // =============================
    if (!guild) {
      const errorEmbed = modEmbed({
        title: '❌ Gagal Mengambil Informasi',
        description: 'Perintah ini hanya dapat digunakan di dalam server.',
        color: 0xE74C3C,
      });

      return isSlash
        ? ctx.reply({ embeds: [errorEmbed], ephemeral: true })
        : ctx.channel.send({ embeds: [errorEmbed] });
    }

    // =============================
    // DATA SERVER
    // =============================
    const owner = await guild.fetchOwner().catch(() => null);

    const textChannels = guild.channels.cache.filter(
      ch => ch.isTextBased() && !ch.isVoiceBased()
    ).size;

    const voiceChannels = guild.channels.cache.filter(
      ch => ch.isVoiceBased()
    ).size;

    const totalChannels = textChannels + voiceChannels;

    const createdAt = Math.floor(guild.createdTimestamp / 1000);

    // =============================
    // EMBED UTAMA
    // =============================
    const infoEmbed = modEmbed({
      title: `💠 INFORMASI SERVER 💠`,
      description:
        `✨ **${guild.name}** ✨\n\n` +
        `Selamat datang di komunitas **JLS Gaming**!\n` +
        `Tempat berkumpulnya para gamer untuk bermain, berbagi, dan bersenang-senang 🎮\n\n` +
        `> **Enjoy & respect each other!** 🤍`,
      color: 0xFF69B4,
      thumbnail: guild.iconURL({ dynamic: true, size: 512 }),
      footer: {
        text: `Server ID • ${guild.id}`,
      },
      timestamp: true,
    });

    // =============================
    // FIELD INFORMASI
    // =============================
    infoEmbed.addFields(
      {
        name: '👑 Owner Server',
        value: owner ? owner.user.tag : 'Tidak diketahui',
        inline: true,
      },
      {
        name: '👥 Total Member',
        value: `\`${guild.memberCount.toLocaleString('id-ID')}\``,
        inline: true,
      },
      {
        name: '🚀 Total Boost',
        value: `\`${guild.premiumSubscriptionCount || 0}\``,
        inline: true,
      },
      {
        name: '📊 Channel',
        value:
          `📝 Text : **${textChannels}**\n` +
          `🔊 Voice : **${voiceChannels}**\n` +
          `📦 Total : **${totalChannels}**`,
        inline: true,
      },
      {
        name: '⚙️ Prefix & Command',
        value: '`jls!` atau `/` (Slash Command)',
        inline: true,
      },
      {
        name: '📅 Server Dibuat',
        value: `<t:${createdAt}:F>\n<t:${createdAt}:R>`,
        inline: false,
      }
    );

    // =============================
    // PREMIUM INFO
    // =============================
    if (guild.premiumSubscriptionCount > 0) {
      infoEmbed.addFields({
        name: '✨ Server Premium',
        value:
          `Server ini telah di-boost sebanyak **${guild.premiumSubscriptionCount} kali**!\n` +
          `Terima kasih untuk semua booster 💖`,
        inline: false,
      });
    }

    // =============================
    // INVITE LINK (JIKA ADA IZIN)
    // =============================
    if (guild.members.me.permissions.has(PermissionFlagsBits.CreateInstantInvite)) {
      try {
        const channel =
          guild.systemChannel ||
          guild.channels.cache.find(ch => ch.isTextBased());

        if (channel) {
          const invite = await guild.invites.create(channel.id, {
            maxAge: 0,
            maxUses: 0,
            unique: true,
          });

          infoEmbed.addFields({
            name: '🔗 Invite Temanmu',
            value: `[Klik di sini untuk bergabung 🚀](${invite.url})`,
            inline: false,
          });
        }
      } catch {
        // gagal buat invite, abaikan
      }
    }

    // =============================
    // KIRIM PESAN
    // =============================
    if (isSlash) {
      await ctx.reply({ embeds: [infoEmbed] });
    } else {
      await ctx.channel.send({ embeds: [infoEmbed] });
    }
  },

  // =============================
  // METADATA COMMAND
  // =============================
  category: 'utility',
  staffOnly: false,
  cooldown: 30,
  usage_prefix: 'jls!info',
  usage_slash: '/info',
};
