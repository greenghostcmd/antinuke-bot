const { AuditLogEvent, Events } = require('discord.js');
const { ACTIONS } = require('../security/actions');
const { findAuditEntry } = require('../security/auditLogs');
const { handleSecurityAction } = require('../security/antiNuke');

module.exports = {
  name: Events.GuildBanAdd,
  async execute(ban, client) {
    try {
      if (!ban?.guild || !ban?.user) {
        return;
      }

      const auditEntry = await findAuditEntry(ban.guild, AuditLogEvent.MemberBanAdd, ban.user.id, {
        clientUserId: client.user?.id,
      });

      if (!auditEntry?.executor) {
        return;
      }

      await handleSecurityAction({
        guild: ban.guild,
        executor: auditEntry.executor,
        actionType: ACTIONS.MEMBER_BAN,
        target: {
          id: ban.user.id,
          name: ban.user.tag || ban.user.username,
          type: 'Member',
        },
        client,
      });
    } catch (error) {
      console.error('[guildBanAdd] Failed to process event:', error);
    }
  },
};
