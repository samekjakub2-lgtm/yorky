import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';
import i18next from 'eslint-plugin-i18next';

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores([
    '.next/**',
    'out/**',
    'build/**',
    'next-env.d.ts',
    'supabase/functions/**',
    'playwright-report/**',
    'test-results/**',
  ]),
  {
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      // Pravidlo 7: osobné údaje nikdy nelogujeme – console iba pre warn/error bez dát.
      'no-console': ['error', { allow: ['warn', 'error'] }],
    },
  },
  // Pravidlo 3: žiadne natvrdo napísané texty v UI – všetko cez next-intl.
  {
    files: ['src/app/**/*.tsx', 'src/components/**/*.tsx', 'src/features/**/*.tsx'],
    plugins: { i18next },
    rules: {
      'i18next/no-literal-string': [
        'error',
        {
          mode: 'jsx-only',
          // Prekladové funkcie z next-intl: t, tCommon, tProfile…
          callees: {
            exclude: ['i18n(ext)?', 't', 't[A-Z]\\w*', 'require', 'addEventListener', 'startsWith'],
          },
          'jsx-attributes': {
            include: ['^(title|placeholder|alt|aria-label|aria-description|label|error)$'],
          },
        },
      ],
    },
  },
]);
