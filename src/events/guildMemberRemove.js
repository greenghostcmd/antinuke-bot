const { AuditLogEvent, Events } = require('discord.js');
const { ACTIONS } = require('../security/actions');
const { findAuditEntry } = require('../security/auditLogs');
const { handleSecurityAction } = require('../security/antiNuke');

module.exports = {
  name: Events.GuildMemberRemove,
  async execute(member, client) {
    try {
      if (!member?.guild || !member?.user) {
        return;
      }

      const auditEntry = await findAuditEntry(member.guild, AuditLogEvent.MemberKick, member.user.id, {
        clientUserId: client.user?.id,
      });

      if (!auditEntry?.executor) {
        return;
      }

      await handleSecurityAction({
        guild: member.guild,
        executor: auditEntry.executor,
        actionType: ACTIONS.MEMBER_KICK,
        target: {
          id: member.user.id,
          name: member.user.tag || member.user.username,
          type: 'Member',
        },
        client,
      });
    } catch (error) {
      console.error('[guildMemberRemove] Failed to process event:', error);
    }
  },
};
