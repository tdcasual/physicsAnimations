const logger = require("./logger");
const { runWithRequestContext } = require("./requestContext");

function logAdminAudit({ action, actor, targetType, targetId = "", outcome = "success", details } = {}) {
  const write = () => logger.info("admin_audit", {
    auditAction: String(action || ""),
    actor: String(actor || "unknown"),
    targetType: String(targetType || "unknown"),
    targetId: String(targetId || ""),
    outcome: String(outcome || "success"),
    details: details && typeof details === "object" ? details : undefined,
  });

  const requestId = typeof details?.requestId === "string" ? details.requestId.trim() : "";
  if (requestId) {
    runWithRequestContext({ requestId }, write);
    return;
  }
  write();
}

module.exports = {
  logAdminAudit,
};
