import { createPinia } from "pinia";
import { createApp } from "vue";

import App from "./App.vue";
import { initWebVitals } from "./features/monitoring/webVitals";
import { router } from "./router";
import "./styles/globals.css";
import "./styles.css";

const app = createApp(App);

app.config.errorHandler = (err, instance, info) => {
  if (import.meta.env.DEV) {
    console.error("[Global Error]", err, info, instance);
  }
  // Production: could send to monitoring endpoint here
};

app.use(createPinia());
app.use(router);
app.mount("#app");

// 初始化 Core Web Vitals 监控
// 只在生产环境上报，开发环境仅打印到控制台
initWebVitals({
  debug: import.meta.env.DEV,
});
