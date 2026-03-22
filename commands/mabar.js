const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  PermissionFlagsBits,
} = require('discord.js');

module.exports = {
  name: 'mabar',
  description: 'Ajak teman-teman untuk main bareng (mabar)',

  // SLASH COMMAND 
  slashBuilder: new SlashCommandBuilder()
    .setName('mabar')
    .setDescription('Ajak teman-teman untuk main bareng (mabar)')
    .addStringOption(o =>
      o.setName('game')
        .setDescription('Nama game')
        .setRequired(true)
    )
    .addIntegerOption(o =>
      o.setName('jumlah')
        .setDescription('Jumlah pemain')
        .setMinValue(1)
        .setMaxValue(20)
    )
    .addRoleOption(o =>
      o.setName('role')
        .setDescription('Role yang ingin di-ping')
    ),

  // EXECUTE 
  async execute(ctx) {
    const isSlash = ctx.isChatInputCommand?.() ?? false;

    let game, jumlah, role;
    let user, channel, client, guild;

    // SLASH 
    if (isSlash) {
      if (!ctx.deferred && !ctx.replied) {
        await ctx.deferReply({ flags: 64 });
      }

      game = ctx.options.getString('game', true);
      jumlah = ctx.options.getInteger('jumlah');
      role = ctx.options.getRole('role');

      user = ctx.user;
      channel = ctx.channel;
      client = ctx.client;
      guild = ctx.guild;
    }

    // PREFIX 
    else {
      const message = ctx;

      user = message.author;
      channel = message.channel;
      client = message.client;
      guild = message.guild;

      role = message.mentions.roles.first() || null;

      const args = message.content
        .slice(message.content.indexOf(' ') + 1)
        .trim()
        .split(/\s+/)
        .filter(a => !a.startsWith('<@&'));

      if (!args.length) {
        return message.reply({
          content:
            'Format: `jls!mabar <game> [jumlah] [@role]`\n' +
            'Contoh: `jls!mabar valorant 5 @Valorant`',
          allowedMentions: { repliedUser: false },
        });
      }

      game = args[0];
      const parsed = parseInt(args[1]);
      jumlah = !isNaN(parsed) && parsed > 0 && parsed <= 20 ? parsed : null;
    }

    // DATA
    const gameName = game.toUpperCase();
    const slotText = jumlah ? `${jumlah} SLOT` : 'OPEN SLOT';

    // BADGES
    const badges = [];
    if (jumlah && jumlah <= 3) badges.push('🔥 HOT LOBBY');
    badges.push('🎙️ VC READY');
    badges.push('⚡ FAST JOIN');

    // MAIN ANNOUNCEMENT EMBED 
    const announceEmbed = new EmbedBuilder()
      .setColor(0xE10600)
      .setAuthor({
        name: '🎉 MABAR ALERT!',
        iconURL: user.displayAvatarURL({ dynamic: true }),
      })
      .setTitle(`🎮 ${gameName} — PARTY OPEN`)
      .setThumbnail(
        client.user.displayAvatarURL({ dynamic: true, size: 512 })
      ) // LOGO BOT (KANAN ATAS)
      .setDescription(
        `${badges.join(' • ')}\n\n` +
        `🔥 **Lobby sedang dibuka!**\n` +
        `Ayo gas mabar bareng sebelum penuh!\n\n` +
        `👤 **Host:** ${user}\n` +
        `🏷️ **Role:** ${role ?? 'Tidak ada'}`
      )
      .addFields(
        {
          name: '🎯 GAME',
          value: `**${gameName}**`,
          inline: true,
        },
        {
          name: '👥 SLOT',
          value: `**${slotText}**`,
          inline: true,
        },
        {
          name: '⏰ STATUS LOBBY',
          value: '🟢 OPEN • First Come First Serve',
          inline: false,
        },
        {
          name: '📍 CARA GABUNG',
          value:
            '1️⃣ Join voice channel mana saja\n' +
            '2️⃣ Klik tombol **JOIN VOICE** di bawah\n' +
            '3️⃣ Langsung dipindahkan ke VC host',
          inline: false,
        }
      )
      .setFooter({
        text: 'JLS Gaming Community • Play Hard, Have Fun',
        iconURL: client.user.displayAvatarURL(),
      })
      .setTimestamp();

    // BUTTON 
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`mabar_join_${user.id}`)
        .setLabel('🎙️ JOIN VOICE')
        .setStyle(ButtonStyle.Success)
    );

    const sentMessage = isSlash
      ? await ctx.editReply({ embeds: [announceEmbed], components: [row] })
      : await channel.send({ embeds: [announceEmbed], components: [row] });

    // COLLECTOR 
    const collector = sentMessage.createMessageComponentCollector({
      time: 15 * 60 * 1000,
      filter: i =>
        i.isButton() &&
        i.customId === `mabar_join_${user.id}`,
    });

    collector.on('collect', async i => {
      const member = await guild.members.fetch(i.user.id);
      const host = await guild.members.fetch(user.id);

      const hostVC = host.voice.channel;
      if (!hostVC) {
        return i.reply({
          content: '❌ Host belum berada di voice channel.',
          flags: 64,
        });
      }

      // USER BELUM DI VC 
      if (!member.voice.channel) {
        const notInVCEmbed = new EmbedBuilder()
          .setColor(0xF1C40F)
          .setTitle('🎧 Belum Terhubung ke Voice')
          .setDescription(
            'Kamu belum berada di **voice channel mana pun**.\n\n' +
            '**Langkah cepat:**\n' +
            '1️⃣ Join VC mana saja\n' +
            '2️⃣ Klik **JOIN VOICE** lagi\n\n' +
            'Aku akan langsung memindahkanmu 🚀'
          )
          .setFooter({
            text: 'Tips: VC kosong atau VC umum paling cepat',
          });

        return i.reply({
          embeds: [notInVCEmbed],
          flags: 64,
        });
      }

      // SUDAH DI VC HOST 
      if (member.voice.channelId === hostVC.id) {
        return i.reply({
          content: '⚠️ Kamu sudah berada di voice channel host.',
          flags: 64,
        });
      }

      // PERMISSION 
      const bot = await guild.members.fetch(client.user.id);
      const perms = hostVC.permissionsFor(bot);

      if (
        !perms.has(PermissionFlagsBits.Connect) ||
        !perms.has(PermissionFlagsBits.MoveMembers)
      ) {
        return i.reply({
          content: '❌ Aku tidak punya izin memindahkan member ke VC host.',
          flags: 64,
        });
      }

      // SUCCESS 
      try {
        await member.voice.setChannel(hostVC);

        const successEmbed = new EmbedBuilder()
          .setColor(0x2ECC71)
          .setTitle('🎉 Welcome to the Party!')
          .setDescription(
            'Kamu berhasil masuk ke lobby mabar!\n' +
            'Siapkan mic, fokus game, dan have fun 🔥\n\n' +
            `🎧 **Voice Channel:** **${hostVC.name}**\n` +
            `🎮 **Game:** **${gameName}**`
          )
          .setFooter({
            text: 'Good luck & have fun! 🚀',
          })
          .setTimestamp();

        await i.reply({
          embeds: [successEmbed],
          flags: 64,
        });
      } catch (err) {
        console.error(err);
        await i.reply({
          content: '❌ Gagal memindahkan kamu ke voice channel.',
          flags: 64,
        });
      }
    });

    collector.on('end', async () => {
      try {
        await sentMessage.edit({ components: [] });
      } catch {}
    });
  },

  category: 'fun',
  staffOnly: false,
};
