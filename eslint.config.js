// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');
const i18next = require('eslint-plugin-i18next');

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ['dist/*', 'supabase/functions/*', 'node_modules/*', '.expo/*'],
  },
  {
    files: ['**/*.ts', '**/*.tsx'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      // Súradnice ani citlivé dáta nikdy nelogujeme.
      'no-console': ['warn', { allow: ['warn', 'error'] }],
    },
  },
  // Pravidlo 3: žiadne natvrdo napísané texty v JSX – všetko cez i18n.
  {
    files: ['src/app/**/*.tsx', 'src/components/**/*.tsx', 'src/features/**/*.tsx'],
    plugins: { i18next },
    rules: {
      'i18next/no-literal-string': [
        'error',
        {
          mode: 'jsx-only',
          // Kontrolujeme text v JSX a atribúty, ktoré vidí/počuje používateľ.
          'jsx-attributes': {
            include: [
              '^(label|title|placeholder|accessibilityLabel|accessibilityHint|alt|error|message)$',
            ],
          },
        },
      ],
    },
  },
]);
