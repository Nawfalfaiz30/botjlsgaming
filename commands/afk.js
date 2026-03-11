// commands/afk.js

const { SlashCommandBuilder } = require('discord.js');
const { modEmbed, formatDuration } = require('../helpers/embed');

module.exports = {
  name: 'afk',

  description: 'Mengatur atau menghapus status AFK kamu',

  slashBuilder: new SlashCommandBuilder()
    .setName('afk')
    .setDescription('Kelola status AFK kamu')
    .addSubcommand(subcommand =>
      subcommand
        .setName('set')
        .setDescription('Set status AFK dengan alasan (opsional)')
        .addStringOption(option =>
          option
            .setName('alasan')
            .setDescription('Alasan kamu AFK (opsional)')
            .setRequired(false)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('unafk')
        .setDescription('Hapus status AFK kamu')
    ),

  /**
   * Handler untuk prefix (jls!afk / jls!unafk) dan slash (/afk set atau /afk unafk)
   * @param {import('discord.js').Message | import('discord.js').ChatInputCommandInteraction} ctx
   * @param {import('discord.js').Client} client - Diperlukan untuk akses Collection afkStatus
   */
  async execute(ctx, client) {
    const isSlash = ctx.isChatInputCommand?.() ?? false;

    // Ambil user ID dan member
    const userId = isSlash ? ctx.user.id : ctx.author.id;
    const member = isSlash ? ctx.member : ctx.member;

    // Tentukan apakah ini unafk atau set
    let isUnafk = false;
    let reason = 'Tidak ada alasan';

    if (isSlash) {
      const subcommand = ctx.options.getSubcommand(false);
      isUnafk = subcommand === 'unafk';

      if (!isUnafk) {
        reason = ctx.options.getString('alasan')?.trim() || 'Tidak ada alasan';
      }
    } else {
      // Prefix: cek apakah jls!unafk atau jls!afk
      const lowerContent = ctx.content.toLowerCase();
      isUnafk = lowerContent.startsWith('jls!unafk');

      if (!isUnafk) {
        // Ambil alasan setelah "jls!afk "
        const args = ctx.content.slice('jls!afk'.length).trim();
        reason = args || 'Tidak ada alasan';
      }
    }

    if (isUnafk) {
      // ───────────────────── UNAFK ─────────────────────
      if (!client.afkStatus.has(userId)) {
        const notAfkEmbed = modEmbed({
          title: 'ℹ️ Kamu Tidak Sedang AFK',
          color: 0xFFFF00,
          description: 'Status AFK kamu sudah tidak aktif atau belum pernah diatur.',
        });

        if (isSlash) {
          return ctx.reply({ embeds: [notAfkEmbed], ephemeral: true });
        }
        return ctx.channel.send({ embeds: [notAfkEmbed] });
      }

      // Ambil data sebelum hapus
      const afkData = client.afkStatus.get(userId);
      const durationMs = Date.now() - afkData.timestamp;
      const durationStr = formatDuration(durationMs);

      // Embed selamat kembali
      const welcomeBackEmbed = modEmbed({
        title: '✅ Kamu Sudah Kembali! 🎮 ',
        color: 0x00FF7F,
        description: `**${member.displayName}** telah kembali dari AFK!\n` +
                     `Durasi AFK: **${durationStr}**\n` +
                     `Total mention selama AFK: **${afkData.mentions.length}**`,
        thumbnail: member.displayAvatarURL({ dynamic: true }),
      });

      if (afkData.mentions.length > 0) {
        welcomeBackEmbed.addFields({
          name: 'Mention Terakhir (maks 5)',
          value: afkData.mentions.slice(-5).join('\n') || 'Tidak ada data mention',
          inline: false
        });
      }

      // Hapus status AFK
      client.afkStatus.delete(userId);

      if (isSlash) {
        await ctx.reply({ embeds: [welcomeBackEmbed] });
      } else {
        await ctx.channel.send({ embeds: [welcomeBackEmbed] });
      }

    } else {
      // ───────────────────── SET AFK ─────────────────────
      // Simpan ke Collection global
      client.afkStatus.set(userId, {
        reason,
        timestamp: Date.now(),
        mentions: [] // diisi nanti saat ada mention (di messageCreate.js)
      });

      const afkSetEmbed = modEmbed({
        title: '🌙 Status AFK Diaktifkan',
        color: 0x9B59B6, // ungu soft untuk "away"
        description: `**${member.displayName}** sekarang **AFK**.\n` +
                     `Alasan: **${reason}**\n\n` +
                     `Bot akan memberitahu saat kamu di-mention.`,
        thumbnail: member.displayAvatarURL({ dynamic: true }),
        footer: { text: 'Ketik jls!unafk atau /afk unafk untuk keluar dari AFK' }
      });

      if (isSlash) {
        await ctx.reply({ embeds: [afkSetEmbed] });
      } else {
        await ctx.channel.send({ embeds: [afkSetEmbed] });
      }
    }
  },

  // Metadata
  staffOnly: false,
  category: 'utility',
  usage_prefix: 'jls!afk [alasan]   atau   jls!unafk',
  usage_slash: '/afk set [alasan]   atau   /afk unafk',
};