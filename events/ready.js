const { Events, ActivityType } = require('discord.js');
const animeAutoSchedule = require('../events/animeAutoSchedule');

module.exports = {
  name: Events.ClientReady,
  once: true,

  /**
   * @param {import('discord.js').Client} client
   */
  execute(client) {
    console.log(`╔════════════════════════════════════════════════════╗`);
    console.log(`║             BOT JLS Gaming TELAH ONLINE              ║`);
    console.log(`╠════════════════════════════════════════════════════╣`);
    console.log(`║ Logged in as: ${client.user.tag}           ║`);
    console.log(`║ Client ID   : ${client.user.id}            ║`);
    console.log(`║ Server count: ${client.guilds.cache.size} server     ║`);
    console.log(`║ Member count: ${client.guilds.cache.reduce((acc, g) => acc + g.memberCount, 0).toLocaleString('id-ID')} member     ║`);
    console.log(`╚════════════════════════════════════════════════════╝`);

    console.log('Bot siap melayani komunitas JLS Gaming! 🎮 ');

    /* =====================
       AKTIFKAN AUTO ANIME
    ===================== */
    animeAutoSchedule(client);

    /* =====================
       STATUS ROTATION
    ===================== */
    const activities = [
      { name: 'jls!help untuk bantuan', type: ActivityType.Listening },
      { name: `di ${client.guilds.cache.size} server gaming`, type: ActivityType.Playing },
      { name: 'jadwal anime hari ini', type: ActivityType.Watching },
      { name: 'ranked & custom match', type: ActivityType.Playing },
      { name: 'mabar rame-rame 🎮', type: ActivityType.Playing },
      { name: 'turnamen & scrim', type: ActivityType.Competing },
    ];

    let activityIndex = 0;
    setInterval(() => {
      const activity = activities[activityIndex];
      client.user.setActivity(activity.name, { type: activity.type });
      activityIndex = (activityIndex + 1) % activities.length;
    }, 30000);
  },
};
