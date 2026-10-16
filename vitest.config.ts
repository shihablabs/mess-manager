import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    environment: 'node',
    fileParallelism: false,
    testTimeout: 120000,
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
