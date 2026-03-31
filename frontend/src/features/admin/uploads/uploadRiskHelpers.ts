export function buildRiskConfirmMessage(details: any): string {
  const findings = Array.isArray(details?.findings) ? details.findings : []
  if (findings.length === 0) return '检测到潜在风险内容，确认后继续上传。是否继续？'
  const lines = findings.slice(0, 6).map((item: any, index: number) => {
    const severity = String(item?.severity || 'unknown')
    const message = String(item?.message || '潜在风险')
    const source = item?.source ? ` (${String(item.source)})` : ''
    return `${index + 1}. [${severity}] ${message}${source}`
  })
  const truncated = details?.truncated ? '\n...（仅展示部分风险项）' : ''
  const summary = typeof details?.summary === 'string' && details.summary ? details.summary : `检测到 ${findings.length} 项潜在风险特征。`
  return `${summary}\n\n${lines.join('\n')}${truncated}\n\n是否仍继续上传？`
}
