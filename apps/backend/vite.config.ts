import path from 'node:path';
import { defineConfig } from 'vite-plus';

export default defineConfig({
  test: {
    environment: 'node',
    setupFiles: ['./toolbox/tests/setup.ts'],
    include: ['src/**/*.test.ts'],
    passWithNoTests: true,
  },
  resolve: {
    alias: {
      '@src': path.resolve(__dirname, 'src'),
    },
  },
});
