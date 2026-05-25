# Antinuke Bot

A modular Discord security bot built with `discord.js` v14. It watches destructive audit-log-backed actions, tracks repeated actions in a short time window, logs every detection, and bans non-whitelisted executors when thresholds are reached.

## Features

- Mass channel delete protection
- Mass role delete protection
- Mass member ban protection
- Mass member kick protection
- Rapid channel creation protection
- Rapid role creation protection
- Owner and whitelist immunity
- Audit log executor detection
- Configured security log channel
- Defensive permission checks and try/catch handling

## Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Create `.env` from `.env.example` and fill in the required values:

   ```env
   TOKEN=
   OWNER_ID=
   LOG_CHANNEL_ID=
   ```

   Optional config:

   ```env
   WHITELIST_IDS=
   ANTI_NUKE_WINDOW_MS=10000
   CHANNEL_DELETE_THRESHOLD=3
   ROLE_DELETE_THRESHOLD=3
   MEMBER_BAN_THRESHOLD=3
   MEMBER_KICK_THRESHOLD=3
   CHANNEL_CREATE_THRESHOLD=5
   ROLE_CREATE_THRESHOLD=5
   ```

   `WHITELIST_IDS` accepts either comma-separated IDs or a JSON array.

3. In the Discord Developer Portal, enable the privileged `SERVER MEMBERS INTENT` and `MESSAGE CONTENT INTENT`.

4. Invite the bot with at least these server permissions:

   - View Audit Log
   - Ban Members
   - Send Messages
   - View Channels

5. Keep the bot role above roles it should be able to punish.

6. Start the bot:

   ```bash
   npm start
   ```

## Project Structure

```text
src/
  events/
    channelCreate.js
    channelDelete.js
    guildBanAdd.js
    guildMemberRemove.js
    ready.js
    roleCreate.js
    roleDelete.js
  security/
    actions.js
    antiNuke.js
    auditLogs.js
    logger.js
  config.js
  index.js
index.js
```

## Notes

- `.env` is intentionally ignored by git. Commit `.env.example`, never real tokens.
- The bot must have `View Audit Log` to identify executors.
- The bot must have `Ban Members`, and its role must be above users it should punish.
- The server owner and configured owner/whitelisted users are immune from automatic punishment.
