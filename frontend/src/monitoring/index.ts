/**
 * 监控模块入口
 *
 * 统一导出所有监控功能
 */

export {
  initSentry,
  setSentryUser,
  clearSentryUser,
  addBreadcrumb,
  captureException,
  captureMessage,
} from './sentry'

export { initWebVitals, getPerformanceSummary } from './webVitals'
