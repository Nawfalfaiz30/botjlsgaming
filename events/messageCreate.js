module.exports = {
  name: "messageCreate",
  execute(message) {
    if (message.author.bot) return;
  }
};

// events/messageCreate.js

const { Events, Collection } = require('discord.js');
const { modEmbed, formatDuration } = require('../helpers/embed');
const { isStaff } = require('../helpers/staff');

module.exports = {
  name: Events.MessageCreate,

  /**
   * @param {import('discord.js').Message} message
   * @param {import('discord.js').Client} client
   */
  async execute(message, client) {
    // Abaikan pesan dari bot sendiri
    if (message.author.bot) return;

    const lowerContent = message.content.toLowerCase();

    
    // FITUR AFK - MENTION HANDLING

    // Jika ada mention ke user yang sedang AFK
    for (const mentionedUser of message.mentions.users.values()) {
      if (client.afkStatus.has(mentionedUser.id)) {
        const afkData = client.afkStatus.get(mentionedUser.id);
        const mentionEntry = `<@${message.author.id}> di <#${message.channel.id}> pada <t:${Math.floor(Date.now()/1000)}:R>`;
        afkData.mentions.push(mentionEntry);

        const afkNoticeEmbed = modEmbed({
          title: '🌙 Pengguna Sedang AFK',
          color: 0x9B59B6,
          description: `**${mentionedUser.tag}** sedang AFK.\n` +
                       `**Alasan:** ${afkData.reason || 'Tidak ada alasan'}\n` +
                       `**Sejak:** <t:${Math.floor(afkData.timestamp / 1000)}:R>`,
          thumbnail: mentionedUser.displayAvatarURL({ dynamic: true }),
        });

        await message.channel.send({ embeds: [afkNoticeEmbed] }).catch(() => {});
      }
    }

    // Jika user yang sedang AFK mengirim pesan → auto unafk
    if (client.afkStatus.has(message.author.id)) {
      const afkData = client.afkStatus.get(message.author.id);
      const durationMs = Date.now() - afkData.timestamp;
      const durationText = formatDuration(durationMs); // fungsi ini harus ada di helpers/embed.js

      client.afkStatus.delete(message.author.id);

      const welcomeBackEmbed = modEmbed({
        title: '✅ Kamu Sudah Kembali!',
        color: 0x00FF7F,
        description: `**${message.author.tag}** telah kembali dari AFK!\n` +
                     `Durasi AFK: **${durationText}**\n` +
                     `Total mention selama AFK: **${afkData.mentions.length}**`,
        thumbnail: message.author.displayAvatarURL({ dynamic: true }),
      });

      if (afkData.mentions.length > 0) {
        welcomeBackEmbed.addFields({
          name: 'Mention Terakhir (maks 5)',
          value: afkData.mentions.slice(-5).join('\n') || 'Tidak ada',
          inline: false,
        });
      }

      await message.channel.send({ embeds: [welcomeBackEmbed] }).catch(() => {});
    }

    // PREFIX COMMAND HANDLING

    const PREFIX = 'jls!';
    if (!lowerContent.startsWith(PREFIX.toLowerCase())) return;

    const args = message.content.slice(PREFIX.length).trim().split(/ +/);
    const commandName = args.shift()?.toLowerCase();

    if (!commandName) return;

    const command = client.commands.get(commandName);

    // Jika command tidak ditemukan
    if (!command) {
      const notFoundEmbed = modEmbed({
        title: '❌ Command Tidak Ditemukan',
        color: 0xFF0000,
        description: `Perintah \`${PREFIX}${commandName}\` tidak ada.\n` +
                     `Coba ketik \`${PREFIX}help\` untuk melihat daftar command.`,
      });
      return message.channel.send({ embeds: [notFoundEmbed] });
    }

    // Cek apakah command ini staff-only
    const staffCommands = [
      'rules', 'pengumuman', 'event', 'purge', 'poll', 'kick', 'ban',
      'timeout', 'untimeout', 'addrole', 'removerole', 'adminhelp'
    ];

    if (staffCommands.includes(commandName) && !isStaff(message.member)) {
      const denyEmbed = modEmbed({
        title: '❌ AKSES DITOLAK',
        color: 0xFF0000,
        description: 'Perintah ini hanya bisa digunakan oleh **JLS Gaming Staff** atau **Admin**.',
      });
      return message.channel.send({ embeds: [denyEmbed] });
    }

    try {
      // Jalankan handler command
      await command.execute(message, client);

    } catch (error) {
      console.error(`Error saat menjalankan prefix command ${commandName}:`, error);

      const errorEmbed = modEmbed({
        title: '❌ Terjadi Kesalahan',
        color: 0xFF0000,
        description: 'Terjadi kesalahan saat menjalankan perintah ini.\n' +
                     'Mohon coba lagi atau laporkan ke staff jika terus berulang.',
      });

      await message.channel.send({ embeds: [errorEmbed] }).catch(() => {});
    }
  },
};