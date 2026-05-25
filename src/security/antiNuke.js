const { PermissionFlagsBits } = require('discord.js');
const config = require('../config');
const { sendSecurityLog } = require('./logger');

const actionTracker = new Map();
const punishmentCooldowns = new Map();

function getPunishmentKey(guildId, userId) {
  return `${guildId}:${userId}`;
}

function pruneLogs(logs, now) {
  return logs.filter((log) => now - log.timestamp <= config.security.windowMs);
}

function isImmune({ guild, executor, client }) {
  if (!executor?.id) {
    return true;
  }

  return (
    executor.id === client.user?.id
    || executor.id === guild.ownerId
    || executor.id === config.ownerId
    || config.whitelistIds.has(executor.id)
  );
}

async function canBanExecutor(guild, executor) {
  try {
    const me = guild.members.me || await guild.members.fetchMe().catch(() => null);

    if (!me?.permissions.has(PermissionFlagsBits.BanMembers)) {
      return {
        allowed: false,
        reason: 'Bot is missing Ban Members permission.',
      };
    }

    if (executor.id === guild.ownerId) {
      return {
        allowed: false,
        reason: 'Executor is the server owner.',
      };
    }

    const targetMember = await guild.members.fetch(executor.id).catch(() => null);

    if (targetMember && !targetMember.bannable) {
      return {
        allowed: false,
        reason: 'Executor is not bannable due to role hierarchy or permissions.',
      };
    }

    return {
      allowed: true,
      reason: 'Executor is bannable.',
    };
  } catch (error) {
    console.error(`[anti-nuke] Failed to check ban permissions in ${guild.id}:`, error);
    return {
      allowed: false,
      reason: 'Failed to validate ban permissions.',
    };
  }
}

async function punishExecutor({ guild, executor, actionType, target, client, count, threshold }) {
  const punishmentKey = getPunishmentKey(guild.id, executor.id);
  const lastPunishment = punishmentCooldowns.get(punishmentKey) || 0;
  const now = Date.now();

  if (now - lastPunishment <= config.security.windowMs) {
    return false;
  }

  punishmentCooldowns.set(punishmentKey, now);

  const banCheck = await canBanExecutor(guild, executor);

  if (!banCheck.allowed) {
    await sendSecurityLog({
      client,
      guild,
      executor,
      actionType,
      target,
      count,
      threshold,
      color: 0xef4444,
      status: `Punishment failed: ${banCheck.reason}`,
      description: 'Anti-nuke threshold reached, but the bot could not ban the executor.',
    });
    return false;
  }

  try {
    await guild.bans.create(executor.id, {
      reason: `Anti-nuke: ${actionType} threshold reached (${count}/${threshold}).`,
    });

    actionTracker.delete(executor.id);

    await sendSecurityLog({
      client,
      guild,
      executor,
      actionType,
      target,
      count,
      threshold,
      color: 0x22c55e,
      status: 'Executor banned',
      description: 'Anti-nuke threshold reached and the executor was automatically banned.',
    });

    return true;
  } catch (error) {
    console.error(`[anti-nuke] Failed to ban ${executor.id} in ${guild.id}:`, error);

    await sendSecurityLog({
      client,
      guild,
      executor,
      actionType,
      target,
      count,
      threshold,
      color: 0xef4444,
      status: 'Punishment failed: ban request errored',
      description: 'Anti-nuke threshold reached, but Discord rejected the ban request.',
    });

    return false;
  }
}

async function handleSecurityAction({ guild, executor, actionType, target, client }) {
  try {
    if (!guild || !executor?.id || !actionType) {
      return;
    }

    const threshold = config.security.thresholds[actionType];

    if (!threshold) {
      console.warn(`[anti-nuke] Unknown action type: ${actionType}`);
      return;
    }

    if (isImmune({ guild, executor, client })) {
      await sendSecurityLog({
        client,
        guild,
        executor,
        actionType,
        target,
        color: 0x38bdf8,
        status: 'Ignored: owner or whitelisted user',
        description: 'A protected action was detected from an immune executor.',
      });
      return;
    }

    const now = Date.now();
    const currentLogs = pruneLogs(actionTracker.get(executor.id) || [], now);

    currentLogs.push({
      guildId: guild.id,
      actionType,
      targetId: target?.id || null,
      timestamp: now,
    });

    actionTracker.set(executor.id, currentLogs);

    const count = currentLogs.filter((log) => (
      log.guildId === guild.id && log.actionType === actionType
    )).length;

    await sendSecurityLog({
      client,
      guild,
      executor,
      actionType,
      target,
      count,
      threshold,
      status: 'Tracked',
      description: 'A protected action was detected and added to the anti-nuke window.',
    });

    if (count >= threshold) {
      await punishExecutor({
        guild,
        executor,
        actionType,
        target,
        client,
        count,
        threshold,
      });
    }
  } catch (error) {
    console.error('[anti-nuke] Failed to handle security action:', error);
  }
}

module.exports = {
  actionTracker,
  handleSecurityAction,
  isImmune,
};
