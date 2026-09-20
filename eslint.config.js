const expoConfig = require('eslint-config-expo/flat');
const { defineConfig } = require('eslint/config');

module.exports = defineConfig([
  expoConfig,
  {
    // The Edge Function handlers and their Deno-only helpers (npm: specifiers, the Deno
    // global) aren't Node/Metro code and don't resolve under this project's ESLint import
    // config; Deno has its own linter for them. errors.ts and its test are plain portable TS
    // with no Deno APIs, so they stay linted like the rest of the app.
    ignores: [
      'dist/**',
      'node_modules/**',
      'supabase/functions/**',
      '!supabase/functions/_shared/errors.ts',
      '!supabase/functions/_shared/errors.test.ts',
    ],
  },
]);
