const { SlashCommandBuilder } = require('discord.js');
const { modEmbed } = require('../helpers/embed');
const { isStaff } = require('../helpers/staff');

module.exports = {
  name: 'event',
  description: 'Mengumumkan event komunitas (Staff Only)',

  slashBuilder: new SlashCommandBuilder()
    .setName('event')
    .setDescription('Umumkan event baru di server (Staff Only)')
    .addStringOption(o =>
      o.setName('judul')
        .setDescription('Judul event')
        .setRequired(true)
    )
    .addStringOption(o =>
      o.setName('deskripsi')
        .setDescription('Deskripsi lengkap event')
        .setRequired(true)
    )
    .addStringOption(o =>
      o.setName('waktu')
        .setDescription('Waktu event (opsional)')
        .setRequired(false)
    )
    .addStringOption(o =>
      o.setName('info_penting')
        .setDescription('Info penting (opsional)')
        .setRequired(false)
    )
    .addRoleOption(o =>
      o.setName('ping_role')
        .setDescription('Role yang ingin di-ping')
        .setRequired(false)
    ),

  async execute(ctx) {
    const isSlash = ctx.isChatInputCommand?.() ?? false;
    const member = ctx.member;

    // STAFF CHECK 
    if (!isStaff(member)) {
      const denyEmbed = modEmbed({
        title: '❌ Akses Ditolak',
        description: 'Command ini hanya dapat digunakan oleh **Staff / Admin**.',
        color: 0xFF0000,
      });

      return isSlash
        ? ctx.reply({ embeds: [denyEmbed], ephemeral: true })
        : ctx.channel.send({ embeds: [denyEmbed] });
    }

    // INPUT 
    let judul, deskripsi, waktu, infoPenting, pingRole;

    if (isSlash) {
      judul = ctx.options.getString('judul')?.trim();
      deskripsi = ctx.options.getString('deskripsi')?.trim();
      waktu = ctx.options.getString('waktu')?.trim();
      infoPenting = ctx.options.getString('info_penting')?.trim();
      pingRole = ctx.options.getRole('ping_role');
    } else {
      const raw = ctx.content.slice('jls!event'.length).trim();

      if (!raw.includes('|')) {
        return ctx.channel.send({
          embeds: [
            modEmbed({
              title: '❌ Format Salah',
              color: 0xFF0000,
              description:
                '**Format benar:**\n' +
                '`jls!event <judul> | <deskripsi> | <waktu> | <info> | <role>`\n\n' +
                '**Minimal:**\n' +
                '`jls!event <judul> | <deskripsi>`',
            }),
          ],
        });
      }

      const parts = raw.split('|').map(p => p.trim());

      judul = parts[0];
      deskripsi = parts[1];
      waktu = parts[2];
      infoPenting = parts[3];

      if (ctx.mentions.roles.size > 0) {
        pingRole = ctx.mentions.roles.first();
      }
    }

    if (!judul || !deskripsi) {
      const errorEmbed = modEmbed({
        title: '❌ Data Tidak Lengkap',
        description: 'Judul dan deskripsi **wajib diisi**.',
        color: 0xFF0000,
      });

      return isSlash
        ? ctx.reply({ embeds: [errorEmbed], ephemeral: true })
        : ctx.channel.send({ embeds: [errorEmbed] });
    }

    // DEFAULT INFO 
    const defaultInfo =
      '• Datang tepat waktu\n' +
      '• Ikuti arahan panitia\n' +
      '• Jaga sikap & suasana\n' +
      '• Ajak teman biar makin rame 🎉';

    //EMBED 
    const botAvatar = ctx.client.user.displayAvatarURL({ dynamic: true, size: 256 });

    const eventEmbed = modEmbed({
      title: `🎉 ${judul}`,
      description: `**📖 Deskripsi Event**\n${deskripsi}`,
      color: 0x2941F2,
      thumbnail: botAvatar,
      image: 'https://i.imgur.com/MZxKQYB.png',
      footer: {
        text: `Diumumkan oleh ${member.user.tag}`,
      },
      timestamp: true,
    });

    if (waktu) {
      eventEmbed.addFields({
        name: '🕒 Waktu Pelaksanaan',
        value: waktu,
        inline: false,
      });
    }

    eventEmbed.addFields(
      {
        name: '📌 Info Penting',
        value: infoPenting || defaultInfo,
        inline: false,
      },
      {
        name: '✨ Partisipasi',
        value: 'React dengan ✅ jika ikut\nKetik **ikut** di chat',
        inline: false,
      }
    );

    // SEND 
    const pingText = pingRole ? `${pingRole}` : '@everyone';

    await ctx.channel.send({
      content: pingText,
      embeds: [eventEmbed],
      allowedMentions: { parse: ['roles'] },
    });

    if (isSlash) {
      await ctx.reply({
        embeds: [
          modEmbed({
            title: '✅ Event Berhasil Dipost',
            description: `Event **${judul}** telah diumumkan.`,
            color: 0x00FF7F,
          }),
        ],
        ephemeral: true,
      });
    }
  },

  staffOnly: true,
  category: 'staff',
  usage_prefix: 'jls!event <judul> | <deskripsi>',
  usage_slash: '/event judul:<judul> deskripsi:<teks>',
};
