const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const config = require('../config');
const { ACTION_LABELS } = require('./actions');

function formatUser(user) {
  if (!user) {
    return 'Unknown executor';
  }

  const tag = user.tag || user.username || 'Unknown user';
  return `${tag} (${user.id})`;
}

function formatTarget(target) {
  if (!target) {
    return 'Unknown resource';
  }

  const name = target.name || target.tag || target.username || target.id || 'Unknown';
  return `${target.type || 'Resource'}: ${name}${target.id ? ` (${target.id})` : ''}`;
}

async function getLogChannel(client) {
  if (!config.logChannelId) {
    return null;
  }

  try {
    const cached = client.channels.cache.get(config.logChannelId);
    const channel = cached || await client.channels.fetch(config.logChannelId).catch(() => null);

    if (!channel || !channel.isTextBased()) {
      return null;
    }

    return channel;
  } catch (error) {
    console.error('[logger] Failed to resolve log channel:', error);
    return null;
  }
}

async function sendSecurityLog({
  client,
  guild,
  executor,
  actionType,
  target,
  status,
  description,
  count,
  threshold,
  color = 0xf59e0b,
}) {
  try {
    const channel = await getLogChannel(client);

    if (!channel) {
      return;
    }

    if (channel.guild) {
      const botMember = channel.guild.members.me || await channel.guild.members.fetchMe().catch(() => null);
      const permissions = botMember ? channel.permissionsFor(botMember) : null;

      if (!permissions?.has(PermissionFlagsBits.SendMessages)) {
        return;
      }
    }

    const embed = new EmbedBuilder()
      .setColor(color)
      .setTitle('Security Event')
      .setDescription(description || 'A protected server action was detected.')
      .addFields(
        { name: 'Server', value: guild ? `${guild.name} (${guild.id})` : 'Unknown server' },
        { name: 'Executor', value: formatUser(executor) },
        { name: 'Action', value: ACTION_LABELS[actionType] || actionType || 'Unknown action' },
        { name: 'Affected', value: formatTarget(target) },
        { name: 'Status', value: status || 'Logged' },
      )
      .setTimestamp(new Date());

    if (typeof count === 'number' && typeof threshold === 'number') {
      embed.addFields({ name: 'Window Count', value: `${count}/${threshold}` });
    }

    await channel.send({ embeds: [embed] });
  } catch (error) {
    console.error('[logger] Failed to send security log:', error);
  }
}

module.exports = {
  sendSecurityLog,
};
