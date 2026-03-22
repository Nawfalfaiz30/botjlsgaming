const fs = require("fs");
const path = require("path");

const baseDir = "bot-JLS Gaming";

const structure = {
  ".env": "DISCORD_TOKEN=your_token_here\nCLIENT_ID=your_client_id\nGUILD_ID=your_guild_id",
  "package.json": JSON.stringify({
    name: "bot-JLS Gaming",
    version: "1.0.0",
    main: "index.js",
    type: "commonjs",
    scripts: {
      start: "node index.js"
    },
    dependencies: {
      "discord.js": "^14.14.1",
      "dotenv": "^16.3.1"
    }
  }, null, 2),
  "index.js": `require("dotenv").config();
const { Client, GatewayIntentBits, Collection } = require("discord.js");
const fs = require("fs");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessageReactions
  ]
});

client.commands = new Collection();

// Load commands
const commandFiles = fs.readdirSync("./commands").filter(f => f.endsWith(".js"));
for (const file of commandFiles) {
  const command = require(\`./commands/\${file}\`);
  client.commands.set(command.name, command);
}

// Load events
const eventFiles = fs.readdirSync("./events").filter(f => f.endsWith(".js"));
for (const file of eventFiles) {
  const event = require(\`./events/\${file}\`);
  if (event.once) {
    client.once(event.name, (...args) => event.execute(...args, client));
  } else {
    client.on(event.name, (...args) => event.execute(...args, client));
  }
}

client.login(process.env.DISCORD_TOKEN);
`,
  commands: {
    "ping.js": basicCommand("ping"),
    "help.js": basicCommand("help"),
    "info.js": basicCommand("info"),
    "rules.js": basicCommand("rules"),
    "pengumuman.js": basicCommand("pengumuman"),
    "rekomen.js": basicCommand("rekomen"),
    "say.js": basicCommand("say"),
    "event.js": basicCommand("event"),
    "purge.js": basicCommand("purge"),
    "afk.js": basicCommand("afk"),
    "remindme.js": basicCommand("remindme"),
    "poll.js": basicCommand("poll"),
    "kick.js": basicCommand("kick"),
    "ban.js": basicCommand("ban"),
    "timeout.js": basicCommand("timeout"),
    "untimeout.js": basicCommand("untimeout"),
    "addrole.js": basicCommand("addrole"),
    "removerole.js": basicCommand("removerole"),
    "adminhelp.js": basicCommand("adminhelp"),
    "quote.js": basicCommand("quote"),
    "trivia.js": basicCommand("trivia"),
    "waifu.js": basicCommand("waifu"),
    "fanart.js": basicCommand("fanart"),
    "animeNews.js": basicCommand("animeNews"),
    "episodeTracker.js": basicCommand("episodeTracker"),
  },
  helpers: {
    "embed.js": `module.exports = {
  modEmbed(title, description) {
    return {
      embeds: [{ title, description, color: 0x2f3136 }]
    };
  },
  formatDuration(ms) {
    return \`\${Math.floor(ms / 1000)}s\`;
  }
};`,
    "staff.js": `module.exports = {
  isStaff(member) {
    return member.permissions.has("Administrator");
  },
  logModeration(action, user) {
    console.log(\`[MOD] \${action} - \${user.tag}\`);
  }
};`,
    "utils.js": `module.exports = {
  getRandom(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  }
};`
  },
  data: {
    "quotes.js": "module.exports = ['Anime quote 1', 'Anime quote 2'];",
    "waifus.js": "module.exports = ['Rem', 'Asuna', 'Mikasa'];",
    "trivia.js": "module.exports = [{ q: 'Siapa MC Naruto?', a: 'Naruto' }];",
    "rulesText.js": "module.exports = ['No toxic', 'No spam'];",
    "announcementText.js": "module.exports = ['Welcome to the server!'];"
  },
  events: {
    "ready.js": `module.exports = {
  name: "ready",
  once: true,
  execute(client) {
    console.log(\`Logged in as \${client.user.tag}\`);
  }
};`,
    "messageCreate.js": `module.exports = {
  name: "messageCreate",
  execute(message) {
    if (message.author.bot) return;
  }
};`,
    "interactionCreate.js": `module.exports = {
  name: "interactionCreate",
  async execute(interaction, client) {
    if (!interaction.isChatInputCommand()) return;
    const command = client.commands.get(interaction.commandName);
    if (!command) return;
    await command.execute(interaction);
  }
};`,
    "reactionAdd.js": `module.exports = {
  name: "messageReactionAdd",
  execute(reaction, user) {
    if (user.bot) return;
  }
};`
  }
};

function basicCommand(name) {
  return `module.exports = {
  name: "${name}",
  description: "${name} command",
  async execute(interaction) {
    await interaction.reply("${name} works!");
  }
};`;
}

function createStructure(base, obj) {
  for (const key in obj) {
    const target = path.join(base, key);
    if (typeof obj[key] === "string") {
      fs.writeFileSync(target, obj[key]);
    } else {
      fs.mkdirSync(target, { recursive: true });
      createStructure(target, obj[key]);
    }
  }
}

fs.mkdirSync(baseDir, { recursive: true });
createStructure(baseDir, structure);

console.log("✅ bot-JLS Gaming berhasil dibuat!");
