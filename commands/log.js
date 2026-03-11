const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  ChannelType,
} = require('discord.js');

const {
  setLogChannel,
  getLogChannel,
  removeLogChannel,
} = require('../helpers/guildSettings');

const { modEmbed } = require('../helpers/embed');
const { isStaff } = require('../helpers/staff');

module.exports = {
  name: 'log',
  description: 'Mengatur channel log moderasi server (Admin / Staff Only)',

  /* =====================
     SLASH COMMAND
  ===================== */
  slashBuilder: new SlashCommandBuilder()
    .setName('log')
    .setDescription('Atur channel log moderasi server')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand(sub =>
      sub
        .setName('set')
        .setDescription('Set channel log moderasi')
        .addChannelOption(opt =>
          opt
            .setName('channel')
            .setDescription('Channel text untuk log moderasi')
            .addChannelTypes(ChannelType.GuildText)
            .setRequired(true)
        )
    )
    .addSubcommand(sub =>
      sub
        .setName('info')
        .setDescription('Lihat channel log moderasi saat ini')
    )
    .addSubcommand(sub =>
      sub
        .setName('remove')
        .setDescription('Hapus channel log moderasi')
    ),

  /* =====================
     EXECUTE
  ===================== */
  async execute(ctx) {
    const isSlash = ctx.isChatInputCommand?.() ?? false;
    const guild = ctx.guild;
    const guildId = guild.id;
    const member = ctx.member;

    /* =====================
       AKSES KONTROL (WAJIB)
    ===================== */
    if (
      !member.permissions.has(PermissionFlagsBits.Administrator) &&
      !isStaff(member)
    ) {
      const denyEmbed = modEmbed({
        title: '❌ AKSES DITOLAK',
        description:
          'Perintah ini hanya dapat digunakan oleh **JLS** atau **Staff Server**.',
        color: 0xff0000,
      });

      return isSlash
        ? ctx.reply({ embeds: [denyEmbed], ephemeral: true })
        : ctx.channel.send({ embeds: [denyEmbed] });
    }

    let sub;
    let channel;

    /* =====================
       INPUT HANDLING
    ===================== */
    if (isSlash) {
      sub = ctx.options.getSubcommand();
      channel = ctx.options.getChannel('channel');
    } else {
      const args = ctx.content.trim().split(/\s+/).slice(1);
      sub = args[0]?.toLowerCase();

      if (sub === 'set') {
        channel =
          ctx.mentions.channels.first() ||
          guild.channels.cache.get(args[1]);
      }
    }

    /* =====================
       VALIDASI SUBCOMMAND
    ===================== */
    if (!['set', 'info', 'remove'].includes(sub)) {
      const formatEmbed = modEmbed({
        title: '❌ Format Salah',
        description:
          '**Gunakan:**\n' +
          '`jls!log set #channel`\n' +
          '`jls!log info`\n' +
          '`jls!log remove`',
      });

      return isSlash
        ? ctx.reply({ embeds: [formatEmbed], ephemeral: true })
        : ctx.channel.send({ embeds: [formatEmbed] });
    }

    /* =====================
       SET
    ===================== */
    if (sub === 'set') {
      if (!channel || channel.type !== ChannelType.GuildText) {
        const errorEmbed = modEmbed({
          title: '❌ Channel Tidak Valid',
          description:
            'Sertakan **text channel** yang valid untuk log moderasi.',
        });

        return isSlash
          ? ctx.reply({ embeds: [errorEmbed], ephemeral: true })
          : ctx.channel.send({ embeds: [errorEmbed] });
      }

      setLogChannel(guildId, channel.id);

      return ctx.reply({
        embeds: [
          modEmbed({
            title: '✅ Log Channel Diset',
            description:
              `Log moderasi server akan dikirim ke ${channel}`,
          }),
        ],
      });
    }

    /* =====================
       INFO
    ===================== */
    if (sub === 'info') {
      const channelId = getLogChannel(guildId);

      if (!channelId) {
        return ctx.reply({
          embeds: [
            modEmbed({
              title: 'ℹ️ Log Moderasi',
              description:
                'Belum ada channel log moderasi yang diset.',
            }),
          ],
          ephemeral: true,
        });
      }

      const logChannel = guild.channels.cache.get(channelId);

      return ctx.reply({
        embeds: [
          modEmbed({
            title: 'ℹ️ Log Moderasi',
            description: logChannel
              ? `Channel log saat ini: ${logChannel}`
              : 'Channel log tersimpan tetapi tidak ditemukan.',
          }),
        ],
        ephemeral: true,
      });
    }

    /* =====================
       REMOVE
    ===================== */
    if (sub === 'remove') {
      const existing = getLogChannel(guildId);

      if (!existing) {
        return ctx.reply({
          embeds: [
            modEmbed({
              title: '⚠️ Tidak Ada Log',
              description:
                'Belum ada channel log moderasi untuk dihapus.',
            }),
          ],
          ephemeral: true,
        });
      }

      removeLogChannel(guildId);

      return ctx.reply({
        embeds: [
          modEmbed({
            title: '🗑️ Log Channel Dihapus',
            description:
              'Channel log moderasi telah berhasil dihapus.',
          }),
        ],
      });
    }
  },

  /* =====================
     METADATA
  ===================== */
  staffOnly: true,
  category: 'moderation',
  usage_prefix: 'jls!log <set|info|remove> [#channel]',
  usage_slash: '/log set|info|remove',
};
