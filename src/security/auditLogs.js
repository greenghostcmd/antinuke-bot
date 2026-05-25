const { PermissionFlagsBits } = require('discord.js');

const AUDIT_LOG_DELAY_MS = 750;
const AUDIT_CACHE_TTL_MS = 1_500;
const DEFAULT_MAX_AGE_MS = 10_000;

const auditCache = new Map();
const inFlightFetches = new Map();

function wait(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function getCacheKey(guildId, type) {
  return `${guildId}:${type}`;
}

function entryMatchesTarget(entry, targetId) {
  if (!targetId) {
    return true;
  }

  return entry.targetId === targetId || entry.target?.id === targetId;
}

async function fetchAuditEntries(guild, type, limit = 6) {
  const cacheKey = getCacheKey(guild.id, type);
  const now = Date.now();
  const cached = auditCache.get(cacheKey);

  if (cached && now - cached.fetchedAt <= AUDIT_CACHE_TTL_MS) {
    return cached.entries;
  }

  if (inFlightFetches.has(cacheKey)) {
    return inFlightFetches.get(cacheKey);
  }

  const promise = (async () => {
    await wait(AUDIT_LOG_DELAY_MS);

    const logs = await guild.fetchAuditLogs({ type, limit });
    const entries = [...logs.entries.values()];

    auditCache.set(cacheKey, {
      entries,
      fetchedAt: Date.now(),
    });

    return entries;
  })().finally(() => {
    inFlightFetches.delete(cacheKey);
  });

  inFlightFetches.set(cacheKey, promise);
  return promise;
}

async function findAuditEntry(guild, type, targetId, options = {}) {
  const maxAgeMs = options.maxAgeMs || DEFAULT_MAX_AGE_MS;
  const limit = options.limit || 6;
  const allowTargetFallback = Boolean(options.allowTargetFallback);
  const clientUserId = options.clientUserId;

  try {
    const me = guild.members.me || await guild.members.fetchMe().catch(() => null);

    if (!me?.permissions.has(PermissionFlagsBits.ViewAuditLog)) {
      console.warn(`[audit] Missing View Audit Log permission in ${guild.name} (${guild.id}).`);
      return null;
    }

    const entries = await fetchAuditEntries(guild, type, limit);
    const now = Date.now();
    const isFresh = (entry) => now - entry.createdTimestamp <= maxAgeMs;
    const hasValidExecutor = (entry) => entry.executor && entry.executor.id !== clientUserId;

    const exactMatch = entries.find((entry) => (
      isFresh(entry)
      && hasValidExecutor(entry)
      && entryMatchesTarget(entry, targetId)
    ));

    if (exactMatch) {
      return exactMatch;
    }

    if (!allowTargetFallback) {
      return null;
    }

    return entries.find((entry) => (
      isFresh(entry)
      && hasValidExecutor(entry)
      && now - entry.createdTimestamp <= 3_500
    )) || null;
  } catch (error) {
    console.error(`[audit] Failed to fetch audit logs for ${guild.id}:`, error);
    return null;
  }
}

module.exports = {
  findAuditEntry,
};
