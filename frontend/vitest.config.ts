import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'
import path from 'node:path'
// Storybook 测试暂时禁用
// import { storybookTest } from '@storybook/addon-vitest/vitest-plugin'
// import { playwright } from '@vitest/browser-playwright'
const dirname =
  typeof __dirname !== 'undefined' ? __dirname : path.dirname(fileURLToPath(import.meta.url))

// More info at: https://storybook.js.org/docs/next/writing-tests/integrations/vitest-addon
export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: ['node_modules/', 'test/', 'e2e/', '*.config.*', '**/types.ts', '**/index.ts'],
    },
    projects: [
      {
        extends: true,
        test: {
          globals: true,
          environment: 'jsdom',
          include: ['test/**/*.test.ts', 'src/**/*.test.ts'],
          exclude: [
            'node_modules/',
            'e2e/**',
            'dist/',
            '**/*.stories.ts',
          ],
          setupFiles: ['./test/setup.ts'],
        },
      },
      // Storybook 浏览器测试暂时禁用，需要修复组件类型
      // {
      //   extends: true,
      //   plugins: [
      //     storybookTest({
      //       configDir: path.join(dirname, '.storybook'),
      //     }),
      //   ],
      //   test: {
      //     name: 'storybook',
      //     browser: {
      //       enabled: true,
      //       headless: true,
      //       provider: playwright({}),
      //       instances: [{ browser: 'chromium' }],
      //     },
      //   },
      // },
    ],
  },
})
