/**
 * Core Web Vitals 监控
 * 自动收集并上报 LCP, FID, CLS, FCP, TTFB 指标
 */

export interface WebVitalsMetrics {
  lcp?: number; // Largest Contentful Paint (ms)
  fid?: number; // First Input Delay (ms)
  cls?: number; // Cumulative Layout Shift
  fcp?: number; // First Contentful Paint (ms)
  ttfb?: number; // Time to First Byte (ms)
  inp?: number; // Interaction to Next Paint (ms)
}

interface WebVitalsReportOptions {
  // 上报阈值，低于此值不上报（开发环境调试用）
  threshold?: number;
  // 自定义上报函数
  onReport?: (metrics: WebVitalsMetrics) => void;
  // 是否打印到控制台
  debug?: boolean;
}

// 性能指标阈值 (Chrome 推荐)
const THRESHOLDS = {
  lcp: { good: 2500, poor: 4000 },
  fid: { good: 100, poor: 300 },
  cls: { good: 0.1, poor: 0.25 },
  fcp: { good: 1800, poor: 3000 },
  ttfb: { good: 600, poor: 1800 },
  inp: { good: 200, poor: 500 },
};

function getRating(name: keyof typeof THRESHOLDS, value: number): "good" | "needs-improvement" | "poor" {
  const t = THRESHOLDS[name];
  if (value <= t.good) return "good";
  if (value <= t.poor) return "needs-improvement";
  return "poor";
}

function reportMetric(
  name: keyof WebVitalsMetrics,
  value: number,
  options: WebVitalsReportOptions
) {
  const rating = getRating(name as keyof typeof THRESHOLDS, value);

  if (options.debug) {
    console.log(`[Web Vitals] ${name}: ${value}${name === "cls" ? "" : "ms"} (${rating})`);
  }

  // 发送到 Google Analytics 或自定义分析平台
  if (typeof gtag !== "undefined") {
    // @ts-ignore gtag is defined by Google Analytics
    gtag("event", name, {
      value: Math.round(value),
      metric_rating: rating,
      event_category: "Web Vitals",
      transport: "beacon",
      non_interaction: true,
    });
  }

  // 发送到 Vercel Analytics (如果部署在 Vercel)
  if (typeof window !== "undefined" && (window as unknown as Record<string, unknown>).va) {
    // @ts-ignore Vercel Analytics
    (window as unknown as Record<string, (type: string, data: unknown) => void>).va("event", {
      name,
      data: { value, rating },
    });
  }
}

/**
 * 初始化 Core Web Vitals 监控
 */
export function initWebVitals(options: WebVitalsReportOptions = {}): () => void {
  const cleanups: (() => void)[] = [];

  if (typeof window === "undefined") {
    return () => {};
  }

  const opts = {
    debug: import.meta.env.DEV,
    ...options,
  };

  import("web-vitals")
    .then((webVitals) => {
      const metrics: WebVitalsMetrics = {};
      const { onLCP, onCLS, onFCP, onTTFB, onINP } = webVitals;
      const onFID = (webVitals as unknown as Record<string, ((cb: (m: { value: number }) => void) => void)>).onFID;

      onLCP((metric: { value: number }) => {
        metrics.lcp = metric.value;
        reportMetric("lcp", metric.value, opts);
      });

      if (onFID) {
        onFID((metric: { value: number }) => {
          metrics.fid = metric.value;
          reportMetric("fid", metric.value, opts);
        });
      }

      onCLS((metric) => {
        metrics.cls = metric.value;
        reportMetric("cls", metric.value, opts);
      });

      onFCP((metric) => {
        metrics.fcp = metric.value;
        reportMetric("fcp", metric.value, opts);
      });

      onTTFB((metric) => {
        metrics.ttfb = metric.value;
        reportMetric("ttfb", metric.value, opts);
      });

      if (onINP) {
        onINP((metric) => {
          metrics.inp = metric.value;
          reportMetric("inp", metric.value, opts);
        });
      }

      function onVisibilityChange() {
        if (document.visibilityState === "hidden" && options.onReport) {
          options.onReport(metrics);
        }
      }
      window.addEventListener("visibilitychange", onVisibilityChange);
      cleanups.push(() => window.removeEventListener("visibilitychange", onVisibilityChange));
    })
    .catch(() => {
      const nativeCleanup = observeNativePerformance(opts);
      cleanups.push(nativeCleanup);
    });

  return () => {
    cleanups.forEach((fn) => fn());
    cleanups.length = 0;
  };
}

/**
 * 使用原生 Performance API 作为 fallback
 */
function observeNativePerformance(options: WebVitalsReportOptions): () => void {
  const cleanups: (() => void)[] = [];

  if ("PerformanceObserver" in window) {
    try {
      const lcpObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1] as PerformanceEntry & { startTime: number };
        if (lastEntry) {
          reportMetric("lcp", lastEntry.startTime, options);
        }
      });
      lcpObserver.observe({ entryTypes: ["largest-contentful-paint"] });
      cleanups.push(() => lcpObserver.disconnect());
    } catch {
      // 浏览器不支持 LCP
    }

    try {
      const fidObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          const firstEntry = entry as PerformanceEntry & { processingStart: number; startTime: number };
          const delay = firstEntry.processingStart - firstEntry.startTime;
          reportMetric("fid", delay, options);
        }
      });
      fidObserver.observe({ entryTypes: ["first-input"] });
      cleanups.push(() => fidObserver.disconnect());
    } catch {
      // 浏览器不支持 FID
    }

    try {
      let clsValue = 0;
      const clsObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          const layoutEntry = entry as PerformanceEntry & { hadRecentInput: boolean; value: number };
          if (!layoutEntry.hadRecentInput) {
            clsValue += layoutEntry.value;
          }
        }
        reportMetric("cls", clsValue, options);
      });
      clsObserver.observe({ entryTypes: ["layout-shift"] });
      cleanups.push(() => clsObserver.disconnect());
    } catch {
      // 浏览器不支持 CLS
    }
  }

  function onLoad() {
    setTimeout(() => {
      const navigation = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming;
      const paint = performance.getEntriesByType("paint");

      if (navigation) {
        reportMetric("ttfb", navigation.responseStart - navigation.startTime, options);
      }

      const fcpEntry = paint.find((p) => p.name === "first-contentful-paint");
      if (fcpEntry) {
        reportMetric("fcp", fcpEntry.startTime, options);
      }
    }, 0);
  }

  window.addEventListener("load", onLoad);
  cleanups.push(() => window.removeEventListener("load", onLoad));

  return () => {
    cleanups.forEach((fn) => fn());
    cleanups.length = 0;
  };
}

/**
 * 获取当前性能指标 (用于调试)
 */
export function getCurrentMetrics(): WebVitalsMetrics {
  const metrics: WebVitalsMetrics = {};

  if (typeof window === "undefined") return metrics;

  // 获取导航计时
  const navigation = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming;
  if (navigation) {
    metrics.ttfb = navigation.responseStart - navigation.startTime;
  }

  // 获取绘制计时
  const paint = performance.getEntriesByType("paint");
  const fcpEntry = paint.find((p) => p.name === "first-contentful-paint");
  if (fcpEntry) {
    metrics.fcp = fcpEntry.startTime;
  }

  return metrics;
}

// 声明 gtag 类型
declare const gtag: (
  type: string,
  eventName: string,
  params: Record<string, unknown>
) => void;
