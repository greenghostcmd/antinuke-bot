const { AuditLogEvent, Events } = require('discord.js');
const { ACTIONS } = require('../security/actions');
const { findAuditEntry } = require('../security/auditLogs');
const { handleSecurityAction } = require('../security/antiNuke');

module.exports = {
  name: Events.GuildRoleDelete,
  async execute(role, client) {
    try {
      if (!role?.guild) {
        return;
      }

      const auditEntry = await findAuditEntry(role.guild, AuditLogEvent.RoleDelete, role.id, {
        allowTargetFallback: true,
        clientUserId: client.user?.id,
      });

      if (!auditEntry?.executor) {
        return;
      }

      await handleSecurityAction({
        guild: role.guild,
        executor: auditEntry.executor,
        actionType: ACTIONS.ROLE_DELETE,
        target: {
          id: role.id,
          name: role.name,
          type: 'Role',
        },
        client,
      });
    } catch (error) {
      console.error('[roleDelete] Failed to process event:', error);
    }
  },
};
