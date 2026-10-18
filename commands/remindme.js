module.exports = {
  name: "remindme",
  description: "remindme command",
  async execute(interaction) {
    await interaction.reply("remindme works!");
  }
};

const { SlashCommandBuilder } = require('discord.js');
const { modEmbed } = require('../helpers/embed');

module.exports = {
  name: 'remindme',

  description: 'Minta bot untuk mengingatkanmu tentang sesuatu setelah waktu tertentu',

  slashBuilder: new SlashCommandBuilder()
    .setName('remindme')
    .setDescription('Atur pengingat pribadi (maks 24 jam)')
    .addStringOption(option =>
      option
        .setName('waktu')
        .setDescription('Waktu pengingat (contoh: 30m, 2h, 1h30m)')
        .setRequired(true)
    )
    .addStringOption(option =>
      option
        .setName('pesan')
        .setDescription('Pesan yang ingin diingatkan')
        .setRequired(true)
    ),

  /**
   * 
   * @param {import('discord.js').Message | import('discord.js').ChatInputCommandInteraction} ctx
   * @param {import('discord.js').Client} client
   */
  async execute(ctx, client) {
    const isSlash = ctx.isChatInputCommand?.() ?? false;

    let waktuStr, pesan;

    if (isSlash) {
      waktuStr = ctx.options.getString('waktu')?.trim();
      pesan = ctx.options.getString('pesan')?.trim();
    } else {
      const args = ctx.content.slice('jls!remindme'.length).trim().split(' ');
      if (args.length < 2) {
        const errorEmbed = modEmbed({
          title: '❌ Format Salah',
          color: 0xFF0000,
          description: 'Contoh penggunaan:\n' +
                       '• `jls!remindme 30m Nonton episode baru`\n' +
                       '• `jls!remindme 2h Istirahat belajar`\n' +
                       'Format waktu: angka + m (menit) atau h (jam), contoh: 45m, 3h, 1h30m',
        });
        return ctx.channel.send({ embeds: [errorEmbed] });
      }

      waktuStr = args[0];
      pesan = args.slice(1).join(' ');
    }

    if (!waktuStr || !pesan) {
      const errorEmbed = modEmbed({
        title: '❌ Input Tidak Lengkap',
        color: 0xFF0000,
        description: 'Waktu dan pesan pengingat harus diisi.',
      });
      return isSlash 
        ? ctx.reply({ embeds: [errorEmbed], ephemeral: true }) 
        : ctx.channel.send({ embeds: [errorEmbed] });
    }

    const timeRegex = /^(\d+)(?:h)?(\d+)?m?$/i;
    const match = waktuStr.match(timeRegex);

    if (!match) {
      const formatEmbed = modEmbed({
        title: '❌ Format Waktu Salah',
        color: 0xFF0000,
        description: 'Gunakan format: angka + satuan (m = menit, h = jam)\n' +
                     'Contoh valid: `30m`, `2h`, `1h45m`, `90m`',
      });
      return isSlash 
        ? ctx.reply({ embeds: [formatEmbed], ephemeral: true }) 
        : ctx.channel.send({ embeds: [formatEmbed] });
    }

    let totalMinutes = 0;
    const hours = parseInt(match[1] || '0');
    const minutes = parseInt(match[2] || '0');

    if (waktuStr.toLowerCase().includes('h')) {
      totalMinutes = (hours * 60) + minutes;
    } else {
      totalMinutes = hours; 
    }

    if (totalMinutes < 1 || totalMinutes > 1440) { // maks 24 jam
      const rangeEmbed = modEmbed({
        title: '❌ Durasi Tidak Valid',
        color: 0xFF0000,
        description: 'Waktu pengingat harus antara **1 menit** sampai **24 jam**.',
      });
      return isSlash 
        ? ctx.reply({ embeds: [rangeEmbed], ephemeral: true }) 
        : ctx.channel.send({ embeds: [rangeEmbed] });
    }

    const waktuMs = totalMinutes * 60 * 1000;
    const waktuTeks = totalMinutes >= 60 
      ? `${Math.floor(totalMinutes / 60)} jam ${totalMinutes % 60 ? totalMinutes % 60 + ' menit' : ''}`.trim()
      : `${totalMinutes} menit`;

    // Konfirmasi pengingat diset
    const setEmbed = modEmbed({
      title: '⏰ Pengingat Telah Ditetapkan!',
      color: 0x00BFFF,
      description: `Saya akan mengingatkanmu dalam **${waktuTeks}**.\n` +
                   `**Pesan:** ${pesan}\n\n` +
                   `Pengingat akan dikirim via DM (jika DM terbuka).`,
      footer: { text: 'Ketik jls!remindme lagi jika ingin pengingat baru!' },
      timestamp: Date.now() + waktuMs,
    });

    if (isSlash) {
      await ctx.reply({ embeds: [setEmbed] });
    } else {
      await ctx.channel.send({ embeds: [setEmbed] });
    }

    // Set timeout pengingat
    const timeoutId = setTimeout(async () => {
      try {
        const user = await client.users.fetch(ctx.user?.id || ctx.author.id);

        const reminderEmbed = modEmbed({
          title: '⏰ Pengingat dari ' + (ctx.member?.displayName || ctx.author.username),
          color: 0xFFD700, 
          description: `**Pesan yang kamu minta ingatkan:**\n${pesan}`,
          footer: { text: 'Dari JLS Gaming Bot • Jangan lupa kerjakan ya! 🎮 ' },
          timestamp: true
        });

        await user.send({ embeds: [reminderEmbed] });

      } catch (err) {
        console.error('Gagal kirim DM pengingat:', err);

        // Fallback: kirim ke channel asal (jika masih ada)
        const fallbackEmbed = modEmbed({
          title: '⏰ Pengingat Gagal Terkirim via DM',
          color: 0xFF4500,
          description: `<@${ctx.user?.id || ctx.author.id}>, pengingatmu:\n**${pesan}**\n\n` +
                       `(DM gagal dikirim, mungkin DM kamu tertutup)`,
        });

        try {
          await ctx.channel.send({ embeds: [fallbackEmbed] });
        } catch {
          // jika channel sudah tidak bisa diakses, abaikan
        }
      }
    }, waktuMs);

    // Simpan timeout agar bisa dibatalkan jika perlu (opsional)
    if (!client.remindTimeouts) client.remindTimeouts = new Map();
    client.remindTimeouts.set(ctx.user?.id || ctx.author.id, timeoutId);
  },

  // Metadata
  staffOnly: false,
  category: 'utility',
  cooldown: 15,
  usage_prefix: 'jls!remindme <waktu> <pesan>',
  usage_slash: '/remindme waktu:<waktu> pesan:<pesan>',
};