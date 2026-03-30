/**
 * Web Vitals 性能监控
 *
 * 收集 Core Web Vitals 指标并发送到分析端点
 */

import { onCLS, onINP, onFCP, onLCP, onTTFB, type Metric } from 'web-vitals'

// 分析端点 - 实际使用时替换为真实的端点
const ANALYTICS_ENDPOINT = import.meta.env.VITE_ANALYTICS_ENDPOINT || '/api/analytics/vitals'

interface VitalsReport {
  metric: string
  value: number
  rating: 'good' | 'needs-improvement' | 'poor'
  delta?: number
  id: string
  navigationType?: string
  url: string
  timestamp: string
}

/**
 * 获取指标评级
 */
function getRating(metric: Metric): 'good' | 'needs-improvement' | 'poor' {
  const thresholds: Record<string, [number, number]> = {
    CLS: [0.1, 0.25], // Cumulative Layout Shift
    FID: [100, 300], // First Input Delay (ms)
    FCP: [1800, 3000], // First Contentful Paint (ms)
    LCP: [2500, 4000], // Largest Contentful Paint (ms)
    TTFB: [800, 1800], // Time to First Byte (ms)
    INP: [200, 500], // Interaction to Next Paint (ms)
  }

  const [good, poor] = thresholds[metric.name] || [0, 0]

  if (metric.value <= good) return 'good'
  if (metric.value <= poor) return 'needs-improvement'
  return 'poor'
}

/**
 * 发送指标到分析端点
 */
function sendToAnalytics(report: VitalsReport): void {
  // 开发环境只打印日志
  if (import.meta.env.DEV) {
    console.log('[Web Vitals]', report)
    return
  }

  // 生产环境发送到分析端点
  const blob = new Blob([JSON.stringify(report)], { type: 'application/json' })

  // 使用 sendBeacon 如果可用，否则使用 fetch
  if (navigator.sendBeacon) {
    navigator.sendBeacon(ANALYTICS_ENDPOINT, blob)
  } else {
    fetch(ANALYTICS_ENDPOINT, {
      method: 'POST',
      body: blob,
      keepalive: true,
    }).catch(() => {
      // 静默失败，不影响用户体验
    })
  }
}

/**
 * 处理指标
 */
function handleMetric(metric: Metric): void {
  const report: VitalsReport = {
    metric: metric.name,
    value: metric.value,
    rating: getRating(metric),
    delta: metric.delta,
    id: metric.id,
    navigationType: metric.navigationType,
    url: window.location.href,
    timestamp: new Date().toISOString(),
  }

  sendToAnalytics(report)

  // 如果指标较差，可以在这里添加额外的逻辑
  if (report.rating === 'poor') {
    console.warn(`Poor ${metric.name}:`, metric.value)
  }
}

/**
 * 初始化 Web Vitals 监控
 */
export function initWebVitals(): void {
  // 只在浏览器环境初始化
  if (typeof window === 'undefined') return

  // Core Web Vitals
  onCLS(handleMetric) // Cumulative Layout Shift
  onINP(handleMetric) // Interaction to Next Paint
  onFCP(handleMetric) // First Contentful Paint
  onLCP(handleMetric) // Largest Contentful Paint
  onTTFB(handleMetric) // Time to First Byte

  // 额外的性能观察
  observeLongTasks()
  observeResourceTiming()
}

/**
 * 观察长任务
 */
function observeLongTasks(): void {
  if (!('PerformanceObserver' in window)) return

  try {
    const observer = new PerformanceObserver(list => {
      for (const entry of list.getEntries()) {
        // 报告超过 50ms 的长任务
        if (entry.duration > 50) {
          const report: VitalsReport = {
            metric: 'LongTask',
            value: entry.duration,
            rating: entry.duration > 100 ? 'poor' : 'needs-improvement',
            id: entry.name,
            url: window.location.href,
            timestamp: new Date().toISOString(),
          }
          sendToAnalytics(report)
        }
      }
    })

    observer.observe({ entryTypes: ['longtask'] })
  } catch {
    // 不支持 longtask 观察
  }
}

/**
 * 观察资源加载时间
 */
function observeResourceTiming(): void {
  if (!('PerformanceObserver' in window)) return

  try {
    const observer = new PerformanceObserver(list => {
      for (const entry of list.getEntries() as PerformanceResourceTiming[]) {
        // 只报告慢资源（超过 1 秒）
        if (entry.duration > 1000) {
          const report: VitalsReport = {
            metric: 'SlowResource',
            value: entry.duration,
            rating: entry.duration > 3000 ? 'poor' : 'needs-improvement',
            id: entry.name,
            url: window.location.href,
            timestamp: new Date().toISOString(),
          }
          sendToAnalytics(report)
        }
      }
    })

    observer.observe({ entryTypes: ['resource'] })
  } catch {
    // 不支持 resource 观察
  }
}

/**
 * 获取性能指标摘要
 */
export function getPerformanceSummary(): Record<string, unknown> {
  const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming

  if (!navigation) {
    return { error: 'Navigation timing not available' }
  }

  return {
    dns: navigation.domainLookupEnd - navigation.domainLookupStart,
    tcp: navigation.connectEnd - navigation.connectStart,
    ttfb: navigation.responseStart - navigation.startTime,
    download: navigation.responseEnd - navigation.responseStart,
    domParse: navigation.domInteractive - navigation.responseEnd,
    domReady: navigation.domContentLoadedEventEnd - navigation.startTime,
    loadComplete: navigation.loadEventEnd - navigation.startTime,
  }
}

export default initWebVitals
