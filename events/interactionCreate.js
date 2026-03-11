module.exports = {
  name: "interactionCreate",
  async execute(interaction, client) {
    if (!interaction.isChatInputCommand()) return;
    const command = client.commands.get(interaction.commandName);
    if (!command) return;
    await command.execute(interaction);
  }
};

// events/interactionCreate.js

const { Events, InteractionType } = require('discord.js');

module.exports = {
  name: Events.InteractionCreate,

  /**
   * @param {import('discord.js').Interaction} interaction
   * @param {import('discord.js').Client} client
   */
  async execute(interaction, client) {
    // Hanya tangani chat input command (slash commands)
    if (!interaction.isChatInputCommand()) return;

    // Ambil nama command dari interaction
    const commandName = interaction.commandName;
    const command = client.commands.get(commandName);

    // Jika command tidak ditemukan di collection
    if (!command) {
      console.error(`Tidak menemukan command: ${commandName}`);
      const errorEmbed = client.modEmbed({
        title: '❌ Command Tidak Ditemukan',
        color: 0xFF0000,
        description: `Command \`${commandName}\` tidak terdaftar atau gagal dimuat.`,
      });
      return interaction.reply({ embeds: [errorEmbed], ephemeral: true });
    }

    try {
      // Jalankan handler command
      await command.execute(interaction, client);

    } catch (error) {
      console.error(`Error saat menjalankan command ${commandName}:`, error);

      const errorEmbed = client.modEmbed({
        title: '❌ Terjadi Kesalahan',
        color: 0xFF0000,
        description: 'Terjadi kesalahan saat menjalankan perintah ini.\n' +
                     'Mohon coba lagi atau laporkan ke staff jika terus berulang.',
      });

      // Coba reply, jika sudah reply sebelumnya gunakan followUp
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp({ embeds: [errorEmbed], ephemeral: true }).catch(() => {});
      } else {
        await interaction.reply({ embeds: [errorEmbed], ephemeral: true }).catch(() => {});
      }
    }
  },
};