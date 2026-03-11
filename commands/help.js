// commands/help.js

const {
  SlashCommandBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require('discord.js');

const { modEmbed } = require('../helpers/embed');
const { isStaff } = require('../helpers/staff');

/* ========= UTIL ========= */
function splitToChunks(arr, maxLength = 900) {
  const chunks = [];
  let current = '';

  for (const item of arr) {
    if ((current + '\n\n' + item).length > maxLength) {
      chunks.push(current);
      current = item;
    } else {
      current += (current ? '\n\n' : '') + item;
    }
  }

  if (current) chunks.push(current);
  return chunks;
}

module.exports = {
  name: 'help',
  description: 'Menampilkan daftar lengkap perintah bot JLS Gaming',

  slashBuilder: new SlashCommandBuilder()
    .setName('help')
    .setDescription('Daftar lengkap perintah bot JLS Gaming'),

  async execute(ctx, client) {
    const isSlash = ctx.isChatInputCommand?.() ?? false;
    const member = ctx.member;

    if (isSlash && !ctx.replied && !ctx.deferred) {
      await ctx.deferReply();
    }

    const commands = client.commands;

    /* ========= KATEGORI ========= */
    const umum = [];
    const funGame = [];
    const staff = [];

    commands.forEach(cmd => {
      const name = cmd.name;
      const desc = cmd.description || 'Tidak ada deskripsi';
      const prefix = `jls!${name}`;
      const slash = `/${name}`;

      const line =
        `**${prefix}** / **${slash}**\n` +
        `└ ${desc}`;

      if (cmd.staffOnly) staff.push(line);
      else if ([''].includes(cmd.category))
        funGame.push(line);
      else umum.push(line);
    });

    /* ========= PAGE 1 : GENERAL ========= */
    const page1 = modEmbed({
      title: '🎮 JLS GAMING COMMUNITY — HELP MENU',
      color: 0x5865F2, // Discord Blurple
      description:
        '**Selamat datang di JLS Gaming Bot!**\n\n' +
        'Gunakan **Prefix** `jls!` atau **Slash Command** `/`\n' +
        'Tekan tombol di bawah untuk berpindah halaman.',
      thumbnail: client.user.displayAvatarURL({ dynamic: true, size: 512 }),
      footer: {
        text: 'Page 1 / 2 • JLS Gaming Community',
      },
      timestamp: true,
    });

    splitToChunks(umum).forEach((chunk, i) => {
      page1.addFields({
        name: i === 0 ? '🎯 GENERAL COMMANDS' : '🎯 GENERAL COMMANDS (CONT.)',
        value: chunk,
        inline: false,
      });
    });

    splitToChunks(funGame).forEach((chunk, i) => {
      page1.addFields({
        name: i === 0 ? '🔥 FUN & GAME FEATURES' : '🔥 FUN & GAME FEATURES (CONT.)',
        value: chunk,
        inline: false,
      });
    });

    /* ========= PAGE 2 : STAFF ========= */
    const page2 = modEmbed({
      title: '🛡️ JLS GAMING — STAFF COMMANDS',
      color: 0x2F3136, // Dark admin theme
      description:
        '**Panel Perintah Staff & Admin**\n\n' +
        'Perintah di halaman ini hanya tersedia untuk **Staff Resmi**.',
      thumbnail: client.user.displayAvatarURL({ dynamic: true, size: 512 }),
      footer: {
        text: 'Page 2 / 2 • Staff Control Panel',
      },
      timestamp: true,
    });

    if (isStaff(member)) {
      splitToChunks(staff).forEach((chunk, i) => {
        page2.addFields({
          name: i === 0
            ? '🛡️ STAFF / ADMIN TOOLS'
            : '🛡️ STAFF / ADMIN TOOLS (CONT.)',
          value: chunk,
          inline: false,
        });
      });
    } else {
      page2.addFields({
        name: '🔒 RESTRICTED ACCESS',
        value:
          'Kamu tidak memiliki izin untuk melihat perintah staff.\n' +
          'Hubungi admin jika diperlukan.',
        inline: false,
      });
    }

    page2.addFields({
      name: 'ℹ️ COMMUNITY INFO',
      value:
        '• Gunakan `/help` kapan saja\n' +
        '• Laporkan bug / abuse ke Staff\n' +
        '• Jaga sportifitas & enjoy gaming 🎮',
      inline: false,
    });

    /* ========= BUTTON ========= */
    const rowPage1 = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('help_next')
        .setLabel('Adminhelp ▶')
        .setStyle(ButtonStyle.Primary)
    );

    const rowPage2 = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('help_back')
        .setLabel('◀ Back')
        .setStyle(ButtonStyle.Secondary)
    );

    const message = isSlash
      ? await ctx.editReply({ embeds: [page1], components: [rowPage1] })
      : await ctx.channel.send({ embeds: [page1], components: [rowPage1] });

    /* ========= COLLECTOR ========= */
    const collector = message.createMessageComponentCollector({
      time: 120000,
    });

    collector.on('collect', async i => {
      if (i.user.id !== ctx.author?.id && i.user.id !== ctx.user?.id) {
        return i.reply({
          content: '❌ Kamu tidak bisa menggunakan tombol ini.',
          ephemeral: true,
        });
      }

      if (i.customId === 'help_next') {
        await i.update({ embeds: [page2], components: [rowPage2] });
      }

      if (i.customId === 'help_back') {
        await i.update({ embeds: [page1], components: [rowPage1] });
      }
    });

    collector.on('end', async () => {
      try {
        await message.edit({ components: [] });
      } catch {}
    });
  },

  /* ========= META ========= */
  staffOnly: false,
  category: 'utility',
  usage_prefix: 'jls!help',
  usage_slash: '/help',
};
