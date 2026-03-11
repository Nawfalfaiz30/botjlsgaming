module.exports = {
  name: "messageReactionAdd",
  execute(reaction, user) {
    if (user.bot) return;
  }
};

// events/messageReactionAdd.js

const { Events } = require('discord.js');
const { modEmbed } = require('../helpers/embed');

module.exports = {
  name: Events.MessageReactionAdd,

  /**
   * @param {import('discord.js').MessageReaction} reaction
   * @param {import('discord.js').User} user
   * @param {import('discord.js').Client} client
   */
  async execute(reaction, user, client) {
    // Abaikan reaksi dari bot sendiri
    if (user.bot) return;

    // Cek apakah pesan ini adalah polling aktif
    const pollData = client.activePolls?.get(reaction.message.id);
    if (!pollData) return;

    // Daftar emoji angka yang valid untuk polling (1️⃣ sampai 🔟)
    const emojiNumbers = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟'];

    // Cek apakah reaksi yang ditambahkan adalah salah satu emoji polling
    const index = emojiNumbers.indexOf(reaction.emoji.name);
    if (index === -1 || index >= pollData.options.length) {
      // Jika reaksi bukan bagian dari polling, hapus reaksi tersebut
      await reaction.users.remove(user.id).catch(() => {});
      return;
    }

    // Cek apakah user sudah pernah vote (mencegah double vote)
    if (pollData.votes.has(user.id)) {
      // Hapus reaksi lama user jika mencoba vote lagi
      const oldReaction = reaction.message.reactions.cache.find(r => 
        emojiNumbers.includes(r.emoji.name) && r.users.cache.has(user.id)
      );

      if (oldReaction && oldReaction.emoji.name !== reaction.emoji.name) {
        await oldReaction.users.remove(user.id).catch(() => {});
      }

      // Beri notifikasi bahwa sudah pernah vote
      const alreadyVotedEmbed = modEmbed({
        title: '🗳️ Kamu Sudah Vote!',
        color: 0xFFFF00,
        description: `Kamu sudah memilih **${pollData.options[pollData.votes.get(user.id)]}** sebelumnya.\n` +
                     `Vote hanya bisa dilakukan sekali ya~`,
      });

      const dmChannel = await user.createDM().catch(() => null);
      if (dmChannel) {
        await dmChannel.send({ embeds: [alreadyVotedEmbed] }).catch(() => {});
      } else {
        // Jika DM gagal, kirim di channel (tapi ephemeral-like)
        await reaction.message.channel.send({
          content: `${user}, kamu sudah vote sebelumnya!`,
          embeds: [alreadyVotedEmbed],
        }).then(msg => setTimeout(() => msg.delete().catch(() => {}), 8000));
      }

      return;
    }

    // Catat vote user
    pollData.votes.set(user.id, index);

    // Beri feedback vote berhasil
    const voteSuccessEmbed = modEmbed({
      title: '🗳️ Vote Kamu Tercatat!',
      color: 0x00FF7F,
      description: `Terima kasih ${user}! Kamu memilih:\n` +
                   `**${pollData.options[index]}**\n\n` +
                   `Polling: "${pollData.question}"`,
      footer: { text: 'Voting masih berlangsung sampai 24 jam setelah dibuat • Jangan lupa ajak teman vote!' },
      timestamp: true,
    });

    const dmChannel = await user.createDM().catch(() => null);
    if (dmChannel) {
      await dmChannel.send({ embeds: [voteSuccessEmbed] }).catch(() => {});
    } else {
      // Fallback ke channel jika DM tertutup
      const msg = await reaction.message.channel.send({
        content: `${user}`,
        embeds: [voteSuccessEmbed],
      });
      setTimeout(() => msg.delete().catch(() => {}), 10000);
    }
  },
};