const {
  EmbedBuilder,
  ChannelType,
  PermissionsBitField,
} = require('discord.js');

const { getLogChannel } = require('./guildSettings');

/* =====================
   KONFIGURASI
===================== */

// Daftar nama role yang dianggap staff
// Cocok untuk multi-server (berdasarkan nama)
const STAFF_ROLE_NAMES = [
  'JLS',
  'Admin',
];

/* =====================
   STAFF CHECK
===================== */

/**
 * Mengecek apakah member adalah staff
 * @param {import('discord.js').GuildMember} member
 * @returns {boolean}
 */
function isStaff(member) {
  if (!member || !member.guild) return false;

  // Administrator = otomatis staff
  if (
    member.permissions.has(
      PermissionsBitField.Flags.Administrator
    )
  ) {
    return true;
  }

  // Cek role staff berdasarkan nama
  return member.roles.cache.some(role =>
    STAFF_ROLE_NAMES.includes(role.name)
  );
}

/* =====================
   LOG MODERATION
===================== */

/**
 * Mengirim embed log moderasi ke channel log server
 * @param {import('discord.js').Guild} guild
 * @param {EmbedBuilder} embed
 * @returns {Promise<void>}
 */
async function logModeration(guild, embed) {
  if (!guild || !embed) return;

  const channelId = getLogChannel(guild.id);

  // Jika server belum set log channel → skip tanpa error
  if (!channelId) return;

  try {
    const channel =
      guild.channels.cache.get(channelId);

    if (
      !channel ||
      channel.type !== ChannelType.GuildText
    ) {
      console.warn(
        `[LOG] Channel log tidak valid di guild ${guild.id}`
      );
      return;
    }

    await channel.send({ embeds: [embed] });
  } catch (error) {
    console.error(
      `[LOG] Gagal mengirim log di guild ${guild.id}:`,
      error
    );
  }
}

/* =====================
   EXPORT
===================== */

module.exports = {
  isStaff,
  logModeration,
};
