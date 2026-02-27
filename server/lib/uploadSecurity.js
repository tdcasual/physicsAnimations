const MAX_FINDINGS = 20;

const RISK_RULES = [
  {
    code: "script_tag",
    severity: "high",
    message: "检测到 <script> 脚本标签",
    pattern: /<script\b/i,
  },
  {
    code: "event_handler",
    severity: "medium",
    message: "检测到内联事件处理器（如 onclick）",
    pattern: /\son[a-z0-9_-]+\s*=/i,
  },
  {
    code: "javascript_url",
    severity: "high",
    message: "检测到 javascript: URL",
    pattern: /\b(?:href|src|action)\s*=\s*(['"])\s*javascript:/i,
  },
  {
    code: "meta_refresh",
    severity: "medium",
    message: "检测到 meta refresh 跳转",
    pattern: /<meta\b[^>]*http-equiv\s*=\s*(['"])refresh\1/i,
  },
  {
    code: "external_iframe",
    severity: "medium",
    message: "检测到 iframe 内嵌内容",
    pattern: /<iframe\b/i,
  },
  {
    code: "object_embed",
    severity: "high",
    message: "检测到 object/embed 可执行嵌入",
    pattern: /<(?:object|embed)\b/i,
  },
];

function scanUploadedHtmlRisk(html, { source = "index.html" } = {}) {
  const raw = typeof html === "string" ? html : "";
  if (!raw) return [];

  const findings = [];
  for (const rule of RISK_RULES) {
    if (!rule.pattern.test(raw)) continue;
    findings.push({
      code: rule.code,
      severity: rule.severity,
      message: rule.message,
      source,
    });
  }
  return findings;
}

function toRiskConfirmationDetails(findings) {
  const list = Array.isArray(findings) ? findings : [];
  return {
    summary: `检测到 ${list.length} 项潜在风险特征，需确认后继续上传。`,
    findings: list.slice(0, MAX_FINDINGS),
    truncated: list.length > MAX_FINDINGS,
  };
}

function createRiskConfirmationError(findings) {
  const err = new Error("risky_html_requires_confirmation");
  err.status = 409;
  err.details = toRiskConfirmationDetails(findings);
  return err;
}

module.exports = {
  scanUploadedHtmlRisk,
  toRiskConfirmationDetails,
  createRiskConfirmationError,
};
