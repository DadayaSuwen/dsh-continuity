import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: [
      'upstream/**',
      '.toolchain/**',
      'node_modules/**',
      'dist/**',
      'coverage/**',
      '.runtime/**',
      '.test/**',
      'test-results/**',
      'playwright-report/**',
    ],
  },
  ...tseslint.configs.recommended,
  {
    files: ['**/*.{ts,tsx}'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/consistent-type-imports': 'error',
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
    },
  },
);
