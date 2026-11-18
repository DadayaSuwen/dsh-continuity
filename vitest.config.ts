import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts', 'tests/**/*.test.tsx'],
    testTimeout: 30000,
    hookTimeout: 30000,
    reporters: process.env.CI
      ? ['default', ['junit', { outputFile: 'test-results/junit.xml' }]]
      : ['default'],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      exclude: ['src/ui/**'],
      reporter: ['text', 'lcov', 'json-summary'],
    },
  },
});
