require('dotenv').config();
const { Client, GatewayIntentBits, Partials, Collection, REST, Routes, ActivityType } = require('discord.js');
const fs = require('fs');
const path = require('path');
const animeAutoSchedule = require('./events/animeAutoSchedule');


const TOKEN = process.env.TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;

if (!TOKEN || !CLIENT_ID) {
  console.error('TOKEN atau CLIENT_ID tidak ditemukan di file .env!');
  process.exit(1);
}

// Inisialisasi client dengan intents yang diperlukan
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMessageReactions,
    GatewayIntentBits.GuildPresences,
    GatewayIntentBits.GuildVoiceStates,
  ],
  partials: [
    Partials.Message,
    Partials.Channel,
    Partials.Reaction,
    Partials.User,
    Partials.GuildMember,
  ],
});

// Koleksi global
client.commands = new Collection();
client.afkStatus = new Collection();           // untuk fitur AFK
client.activePolls = new Collection();         // untuk polling
client.remindTimeouts = new Collection();      // untuk remindme (timeout ID)

// Load helper functions (supaya bisa diakses global jika perlu)
const { modEmbed, formatDuration } = require('./helpers/embed');
const { isStaff, logModeration } = require('./helpers/staff');
const utils = require('./helpers/utils');

client.modEmbed = modEmbed;
client.formatDuration = formatDuration;
client.isStaff = isStaff;
client.logModeration = logModeration;
Object.assign(client, utils); // optional: semua fungsi utils jadi client.truncateText, dll.

// LOAD COMMANDS

const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
  const filePath = path.join(commandsPath, file);
  const command = require(filePath);

  // Set command ke collection (gunakan name dari command)
  if ('name' in command && 'execute' in command) {
    client.commands.set(command.name, command);
  } else {
    console.warn(`Command di ${filePath} tidak memiliki properti "name" atau "execute".`);
  }
}

// REGISTER SLASH COMMANDS

const rest = new REST({ version: '10' }).setToken(TOKEN);

(async () => {
  try {
    console.log(`Started refreshing ${client.commands.size} application (/) commands.`);

    const commandsData = client.commands.map(cmd => cmd.slashBuilder?.toJSON()).filter(Boolean);

    await rest.put(
      Routes.applicationCommands(CLIENT_ID),
      { body: commandsData },
    );

    console.log(`Successfully reloaded ${commandsData.length} application (/) commands.`);
  } catch (error) {
    console.error('Error saat register slash commands:', error);
  }
})();

// LOAD EVENTS

const eventsPath = path.join(__dirname, 'events');
const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.js'));

for (const file of eventFiles) {
  const filePath = path.join(eventsPath, file);
  const event = require(filePath);

  if (event.once) {
    client.once(event.name, (...args) => event.execute(...args, client));
  } else {
    client.on(event.name, (...args) => event.execute(...args, client));
  }
}

// ERROR HANDLING GLOBAL

process.on('unhandledRejection', error => {
  console.error('Unhandled Promise Rejection:', error);
});

process.on('uncaughtException', error => {
  console.error('Uncaught Exception:', error);
  // Optional: process.exit(1); jika ingin bot mati saat crash fatal
});

// LOGIN BOT

client.login(TOKEN).catch(error => {
  console.error('Gagal login:', error);
  process.exit(1);
});