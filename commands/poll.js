module.exports = {
  name: "poll",
  description: "poll command",
  async execute(interaction) {
    await interaction.reply("poll works!");
  }
};

// commands/poll.js

const { SlashCommandBuilder } = require('discord.js');
const { modEmbed } = require('../helpers/embed');
const { isStaff, logModeration } = require('../helpers/staff');

module.exports = {
  name: 'poll',

  description: 'Membuat polling interaktif untuk komunitas (Staff Only)',

  slashBuilder: new SlashCommandBuilder()
    .setName('poll')
    .setDescription('Buat polling dengan opsi pilihan (Staff Only)')
    .addStringOption(option =>
      option
        .setName('pertanyaan')
        .setDescription('Pertanyaan polling')
        .setRequired(true)
    )
    .addStringOption(option =>
      option
        .setName('opsi')
        .setDescription('Opsi jawaban, dipisah koma (min 2, max 10). Contoh: Ya,Tidak,Mungkin')
        .setRequired(true)
    ),

  /**
   * Handler untuk prefix (jls!poll) dan slash (/poll)
   * @param {import('discord.js').Message | import('discord.js').ChatInputCommandInteraction} ctx
   * @param {import('discord.js').Client} client - Diperlukan untuk menyimpan data polling ke Collection
   */
  async execute(ctx, client) {
    const isSlash = ctx.isChatInputCommand?.() ?? false;
    const member = isSlash ? ctx.member : ctx.member;

    // Hanya staff yang boleh buat poll
    if (!isStaff(member)) {
      const denyEmbed = modEmbed({
        title: '❌ AKSES DITOLAK',
        color: 0xFF0000,
        description: 'Perintah ini hanya bisa digunakan oleh **JLS Gaming Staff** atau **Admin**.',
      });

      if (isSlash) {
        return ctx.reply({ embeds: [denyEmbed], ephemeral: true });
      }
      return ctx.channel.send({ embeds: [denyEmbed] });
    }

    // Ambil input pertanyaan & opsi
    let question, optionsStr;

    if (isSlash) {
      question = ctx.options.getString('pertanyaan')?.trim();
      optionsStr = ctx.options.getString('opsi')?.trim();
    } else {
      // Prefix: jls!poll Apa pendapatmu tentang season terbaru? Ya,Tidak,Suka banget
      const args = ctx.content.slice('jls!poll'.length).trim().split('|'); // gunakan | sebagai pemisah pertanyaan-opsi jika mau lebih rapi, atau parsing sederhana
      if (args.length < 2) {
        const errorEmbed = modEmbed({
          title: '❌ Format Salah',
          color: 0xFF0000,
          description: 'Gunakan: `jls!poll <pertanyaan> <opsi1,opsi2,opsi3,...>`\n' +
                       'Contoh: `jls!poll Anime favorit musim ini? JJK,One Piece,Frieren`',
        });
        return ctx.channel.send({ embeds: [errorEmbed] });
      }
      question = args[0].trim();
      optionsStr = args.slice(1).join(' ').trim();
    }

    if (!question || !optionsStr) {
      const errorEmbed = modEmbed({
        title: '❌ Input Tidak Lengkap',
        color: 0xFF0000,
        description: 'Pertanyaan dan opsi harus diisi!',
      });
      return isSlash 
        ? ctx.reply({ embeds: [errorEmbed], ephemeral: true }) 
        : ctx.channel.send({ embeds: [errorEmbed] });
    }

    // Parse opsi (pisah koma, trim, filter kosong)
    const options = optionsStr.split(',').map(o => o.trim()).filter(o => o.length > 0);

    if (options.length < 2 || options.length > 10) {
      const limitEmbed = modEmbed({
        title: '❌ Jumlah Opsi Invalid',
        color: 0xFF0000,
        description: 'Opsi harus antara **2 sampai 10** (dipisah koma).',
      });
      return isSlash 
        ? ctx.reply({ embeds: [limitEmbed], ephemeral: true }) 
        : ctx.channel.send({ embeds: [limitEmbed] });
    }

    // Buat embed polling yang eye-catching
    const pollEmbed = modEmbed({
      title: '📊 POLLING KOMUNITAS JLS Gaming 🎮 ',
      color: 0xFF69B4,
      description: `**Pertanyaan:**\n${question}\n\n` +
                   `Silakan vote dengan menekan reaksi di bawah ini!\n\n` +
                   `**Opsi:**\n${options.map((opt, i) => `${i + 1}. ${opt}`).join('\n')}`,
      footer: { text: `Dibuat oleh ${ctx.member.user.tag} • Voting berakhir dalam 24 jam • Jangan lupa vote ya! ` },
      timestamp: Date.now() + 24 * 60 * 60 * 1000, // tampilkan timestamp akhir polling
    });

    // Kirim pesan polling
    let pollMessage;
    if (isSlash) {
      pollMessage = await ctx.channel.send({ embeds: [pollEmbed] });
      await ctx.reply({ content: 'Polling berhasil dibuat! ✅', ephemeral: true });
    } else {
      pollMessage = await ctx.channel.send({ embeds: [pollEmbed] });
    }

    // Tambahkan reaksi sesuai jumlah opsi (1️⃣ sampai 🔟)
    const emojiNumbers = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟'];
    for (let i = 0; i < options.length; i++) {
      await pollMessage.react(emojiNumbers[i]);
    }

    // Simpan data polling ke Collection global (untuk tracking vote jika mau nanti)
    client.activePolls.set(pollMessage.id, {
      question,
      options,
      votes: new Map(),           // bisa diisi di event reactionAdd nanti
      endTime: Date.now() + 24 * 60 * 60 * 1000,
      channelId: ctx.channel.id,
      creator: ctx.member.user.id,
      messageId: pollMessage.id
    });

    // Log ke channel moderation
    const logEmbed = modEmbed({
      title: '📊 Polling Baru Dibuat',
      color: 0x9B59B6, // ungu untuk fitur komunitas
      description: `Staff **${ctx.member.user.tag}** membuat polling baru.\n` +
                   `Pertanyaan: ${question}\n` +
                   `Jumlah opsi: ${options.length}`,
      footer: { text: `Message ID: ${pollMessage.id}` },
      timestamp: true
    });

    await logModeration(ctx.guild, logEmbed);
  },

  staffOnly: true,
  category: 'staff',
  usage_prefix: 'jls!poll <pertanyaan> <opsi1,opsi2,...>',
  usage_slash: '/poll pertanyaan:<teks> opsi:<opsi1,opsi2,...>',
};