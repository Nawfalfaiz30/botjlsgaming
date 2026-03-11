// commands/say.js

const { SlashCommandBuilder } = require('discord.js');
const { modEmbed } = require('../helpers/embed');

module.exports = {
  name: 'say',
  description: 'Bot akan menyampaikan pesan dari kamu dengan tampilan embed yang rapi',

  slashBuilder: new SlashCommandBuilder()
    .setName('say')
    .setDescription('Bot akan mengatakan pesan yang kamu inginkan')
    .addStringOption(option =>
      option
        .setName('pesan')
        .setDescription('Pesan yang ingin disampaikan oleh bot')
        .setRequired(true)
    ),

  /**
   * Handler prefix (jls!say) & slash (/say)
   * @param {import('discord.js').Message | import('discord.js').ChatInputCommandInteraction} ctx
   */
  async execute(ctx) {
    const isSlash = ctx.isChatInputCommand?.() ?? false;

    let pesan;

    // =======================
    // Ambil Pesan
    // =======================
    if (isSlash) {
      pesan = ctx.options.getString('pesan')?.trim();
    } else {
      const args = ctx.content.slice('jls!say'.length).trim();
      if (!args) {
        const errorEmbed = modEmbed({
          title: '❌ Pesan Tidak Ditemukan',
          color: 0xFF4C4C,
          description:
            '**Cara penggunaan:**\n' +
            '• `jls!say Halo semuanya!`\n' +
            '• `/say pesan:Halo jangan lupa event malam ini!`',
        });

        return ctx.channel.send({ embeds: [errorEmbed] });
      }
      pesan = args;
    }

    if (!pesan) {
      const errorEmbed = modEmbed({
        title: '⚠️ Pesan Kosong',
        color: 0xFF4C4C,
        description: 'Kamu harus menuliskan pesan yang ingin disampaikan oleh bot.',
      });

      return isSlash
        ? ctx.reply({ embeds: [errorEmbed], ephemeral: true })
        : ctx.channel.send({ embeds: [errorEmbed] });
    }

    // =======================
    // Identitas Pengirim
    // =======================
    const senderName =
      ctx.member?.displayName ||
      ctx.user?.username ||
      'Unknown User';

    const senderAvatar =
      ctx.member?.displayAvatarURL({ dynamic: true }) ||
      ctx.user?.displayAvatarURL({ dynamic: true });

    // =======================
    // Embed SAY (Aesthetic)
    // =======================
    const sayEmbed = modEmbed({
      color: 0xFF69B4,
      description: `💬 **Pesan:**\n\n${pesan}`,
      author: {
        name: 'JLS Gaming Announcement',
        iconURL: ctx.client.user.displayAvatarURL({ dynamic: true }),
      },
      footer: {
        text: `Diminta oleh ${senderName} • JLS Gaming 🎮`,
        iconURL: senderAvatar,
      },
      timestamp: true,
    });

    // Optional field biar lebih rapi
    sayEmbed.addFields({
      name: '👤 Pengirim',
      value: ctx.member?.toString() || ctx.user?.toString(),
      inline: true,
    });

    // =======================
    // Kirim Pesan
    // =======================
    if (isSlash) {
      await ctx.reply({ embeds: [sayEmbed] });
    } else {
      await ctx.channel.send({ embeds: [sayEmbed] });

      // Hapus command prefix agar channel bersih
      try {
        await ctx.delete();
      } catch {
        // abaikan jika tidak punya permission
      }
    }
  },

  // =======================
  // Metadata
  // =======================
  staffOnly: false,
  category: 'fun',
  cooldown: 10,
  usage_prefix: 'jls!say <pesan>',
  usage_slash: '/say pesan:<teks>',
};
