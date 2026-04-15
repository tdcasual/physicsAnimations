module.exports = {
  ci: {
    collect: {
      // 收集性能数据的 URL
      url: [
        "http://localhost:4173/",
        "http://localhost:4173/viewer/demo-001",
        "http://localhost:4173/login",
      ],
      // 运行次数，取平均值
      numberOfRuns: 3,
      // 启动设置
      startServerCommand: "cd frontend && npm run preview",
      startServerReadyTimeout: 30000,
      // 使用 Chrome 桌面版和移动版
      settings: {
        preset: "desktop",
        throttling: {
          // 模拟 4G 网络
          rttMs: 150,
          throughputKbps: 1600,
          cpuSlowdownMultiplier: 4,
        },
      },
    },
    upload: {
      // 上传目标，可以是 temporary-public-storage 或自定义
      target: "temporary-public-storage",
    },
    assert: {
      // 断言配置，设置性能预算
      assertions: {
        // 性能分数
        "categories:performance": ["warn", { minScore: 0.8 }],
        "categories:accessibility": ["error", { minScore: 0.9 }],
        "categories:best-practices": ["warn", { minScore: 0.9 }],
        "categories:seo": ["warn", { minScore: 0.9 }],

        // Core Web Vitals
        "largest-contentful-paint": ["warn", { maxNumericValue: 2500 }],
        "cumulative-layout-shift": ["warn", { maxNumericValue: 0.1 }],
        "first-input-delay": ["warn", { maxNumericValue: 100 }],

        // 资源大小预算
        "total-byte-weight": ["warn", { maxNumericValue: 500000 }], // 500KB
        "uses-responsive-images": "warn",
        "unminified-javascript": "error",
        "unused-javascript": "warn",

        // 网络请求
        "render-blocking-resources": "warn",
        "uses-long-cache-ttl": "warn",
      },
    },
  },
};
