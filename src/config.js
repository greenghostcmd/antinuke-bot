function parseList(value) {
  if (!value) {
    return [];
  }

  const trimmed = value.trim();

  if (!trimmed) {
    return [];
  }

  try {
    const parsed = JSON.parse(trimmed);

    if (Array.isArray(parsed)) {
      return parsed.map(String).map((entry) => entry.trim()).filter(Boolean);
    }
  } catch {
    // Fall back to comma-separated parsing below.
  }

  return trimmed.split(',').map((entry) => entry.trim()).filter(Boolean);
}

function parsePositiveInteger(value, fallback) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

const ownerId = process.env.OWNER_ID || '';
const whitelistIds = new Set([
  ownerId,
  ...parseList(process.env.WHITELIST_IDS || process.env.WHITELIST || ''),
].filter(Boolean));

const config = {
  token: process.env.TOKEN || '',
  ownerId,
  logChannelId: process.env.LOG_CHANNEL_ID || '',
  whitelistIds,
  security: {
    windowMs: parsePositiveInteger(process.env.ANTI_NUKE_WINDOW_MS, 10_000),
    thresholds: {
      CHANNEL_DELETE: parsePositiveInteger(process.env.CHANNEL_DELETE_THRESHOLD, 3),
      ROLE_DELETE: parsePositiveInteger(process.env.ROLE_DELETE_THRESHOLD, 3),
      MEMBER_BAN: parsePositiveInteger(process.env.MEMBER_BAN_THRESHOLD, 3),
      MEMBER_KICK: parsePositiveInteger(process.env.MEMBER_KICK_THRESHOLD, 3),
      CHANNEL_CREATE: parsePositiveInteger(process.env.CHANNEL_CREATE_THRESHOLD, 5),
      ROLE_CREATE: parsePositiveInteger(process.env.ROLE_CREATE_THRESHOLD, 5),
    },
  },
  validate() {
    const missing = [];

    if (!this.token) {
      missing.push('TOKEN');
    }

    if (!this.ownerId) {
      missing.push('OWNER_ID');
    }

    if (!this.logChannelId) {
      missing.push('LOG_CHANNEL_ID');
    }

    if (missing.length > 0) {
      throw new Error(`Missing required environment variable(s): ${missing.join(', ')}`);
    }
  },
};

module.exports = config;
