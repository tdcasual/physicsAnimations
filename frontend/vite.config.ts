import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";

const LOCALSTORAGE_SHIM = fileURLToPath(
  new URL("./test/node-localstorage-shim.mjs", import.meta.url),
);

export default defineConfig({
  base: "/",
  plugins: [vue()],
  test: {
    environment: "jsdom",
    execArgv: ["--import", LOCALSTORAGE_SHIM],
  },
  build: {
    outDir: "dist",
    emptyOutDir: true,
  },
});
