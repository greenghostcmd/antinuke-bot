const { AuditLogEvent, Events } = require('discord.js');
const { ACTIONS } = require('../security/actions');
const { findAuditEntry } = require('../security/auditLogs');
const { handleSecurityAction } = require('../security/antiNuke');

module.exports = {
  name: Events.ChannelDelete,
  async execute(channel, client) {
    try {
      if (!channel?.guild) {
        return;
      }

      const auditEntry = await findAuditEntry(channel.guild, AuditLogEvent.ChannelDelete, channel.id, {
        allowTargetFallback: true,
        clientUserId: client.user?.id,
      });

      if (!auditEntry?.executor) {
        return;
      }

      await handleSecurityAction({
        guild: channel.guild,
        executor: auditEntry.executor,
        actionType: ACTIONS.CHANNEL_DELETE,
        target: {
          id: channel.id,
          name: `#${channel.name}`,
          type: 'Channel',
        },
        client,
      });
    } catch (error) {
      console.error('[channelDelete] Failed to process event:', error);
    }
  },
};
