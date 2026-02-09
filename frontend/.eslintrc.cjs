/** @type {import('eslint').Linter.Config} */
module.exports = {
  root: true,
  env: {
    browser: true,
    es2022: true,
    node: true
  },
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:svelte/recommended',
    'prettier'
  ],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
    extraFileExtensions: ['.svelte']
  },
  plugins: ['@typescript-eslint'],
  overrides: [
    {
      files: ['*.svelte'],
      parser: 'svelte-eslint-parser',
      parserOptions: {
        parser: '@typescript-eslint/parser'
      }
    },
    {
      // Allow console in server-side files and hooks
      files: [
        '**/hooks.server.ts',
        '**/+page.server.ts',
        '**/+layout.server.ts',
        '**/server/**/*.ts'
      ],
      rules: {
        'no-console': 'off'
      }
    }
  ],
  rules: {
    // TypeScript rules
    '@typescript-eslint/no-unused-vars': 'off',
    '@typescript-eslint/no-explicit-any': 'off',
    '@typescript-eslint/ban-ts-comment': 'off',
    '@typescript-eslint/explicit-function-return-type': 'off',
    '@typescript-eslint/explicit-module-boundary-types': 'off',
    '@typescript-eslint/no-non-null-assertion': 'off',

    // General rules
    'no-console': 'off',
    'no-debugger': 'error',
    'prefer-const': 'off',
    'no-var': 'error',
    eqeqeq: ['error', 'always'],
    'no-useless-escape': 'off',

    // Svelte rules
    'svelte/no-at-html-tags': 'warn',
    'svelte/valid-compile': 'off'
  },
  ignorePatterns: [
    'node_modules',
    'build',
    '.svelte-kit',
    'dist',
    '*.config.js',
    '*.config.cjs',
    'vite.config.ts'
  ]
};
