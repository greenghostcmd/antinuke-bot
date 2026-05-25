require('dotenv').config();

const fs = require('node:fs');
const path = require('node:path');
const { Client, GatewayIntentBits } = require('discord.js');
const config = require('./config');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildBans,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

client.config = config;

function loadEvents() {
  const eventsPath = path.join(__dirname, 'events');
  const eventFiles = fs.readdirSync(eventsPath).filter((file) => file.endsWith('.js'));

  for (const file of eventFiles) {
    const filePath = path.join(eventsPath, file);
    const event = require(filePath);

    if (!event.name || typeof event.execute !== 'function') {
      console.warn(`[events] Skipping ${file}: missing name or execute().`);
      continue;
    }

    const runner = async (...args) => {
      try {
        await event.execute(...args, client);
      } catch (error) {
        console.error(`[events] ${event.name} failed:`, error);
      }
    };

    if (event.once) {
      client.once(event.name, runner);
    } else {
      client.on(event.name, runner);
    }

    console.log(`[events] Loaded ${file}`);
  }
}

async function start() {
  try {
    config.validate();
    loadEvents();
    await client.login(config.token);
  } catch (error) {
    console.error('[startup] Bot failed to start:', error.message);
    process.exitCode = 1;
  }
}

process.on('unhandledRejection', (error) => {
  console.error('[process] Unhandled rejection:', error);
});

process.on('uncaughtException', (error) => {
  console.error('[process] Uncaught exception:', error);
});

start();
