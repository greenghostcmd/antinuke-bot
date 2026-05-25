const { Events } = require('discord.js');

module.exports = {
  name: Events.ClientReady,
  once: true,
  execute(client) {
    console.log(`[ready] Logged in as ${client.user.tag}. Protecting ${client.guilds.cache.size} guild(s).`);
  },
};
