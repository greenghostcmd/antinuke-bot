const { AuditLogEvent, Events } = require('discord.js');
const { ACTIONS } = require('../security/actions');
const { findAuditEntry } = require('../security/auditLogs');
const { handleSecurityAction } = require('../security/antiNuke');

module.exports = {
  name: Events.ChannelCreate,
  async execute(channel, client) {
    try {
      if (!channel?.guild) {
        return;
      }

      const auditEntry = await findAuditEntry(channel.guild, AuditLogEvent.ChannelCreate, channel.id, {
        allowTargetFallback: true,
        clientUserId: client.user?.id,
      });

      if (!auditEntry?.executor) {
        return;
      }

      await handleSecurityAction({
        guild: channel.guild,
        executor: auditEntry.executor,
        actionType: ACTIONS.CHANNEL_CREATE,
        target: {
          id: channel.id,
          name: `#${channel.name}`,
          type: 'Channel',
        },
        client,
      });
    } catch (error) {
      console.error('[channelCreate] Failed to process event:', error);
    }
  },
};
