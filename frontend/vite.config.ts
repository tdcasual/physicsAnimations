import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

const LOCALSTORAGE_SHIM = fileURLToPath(
  new URL('./test/node-localstorage-shim.mjs', import.meta.url)
)

export default defineConfig({
  base: '/',
  plugins: [vue()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    environment: 'jsdom',
    execArgv: ['--import', LOCALSTORAGE_SHIM],
    setupFiles: ['./test/setup.ts'],
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      output: {
        manualChunks: {
          // Admin 模块分包
          'admin-core': ['./src/views/admin/AdminLayoutView.vue'],
        },
      },
    },
  },
})
