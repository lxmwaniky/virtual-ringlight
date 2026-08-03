import js from '@eslint/js';
import globals from 'globals';

export default [
  { ignores: ['node_modules/**', 'eslint.config.js'] },
  js.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'script',
      globals: {
        ...globals.browser,
        ...globals.webextensions,
        ...globals.serviceworker,
        DEFAULT_SETTINGS: 'readonly',
        COLOR_PRESETS: 'readonly',
        WEBINAR_DOMAINS: 'readonly',
        SETTINGS_BOUNDS: 'readonly',
        clampNumber: 'readonly',
        isValidHexColor: 'readonly'
      }
    },
    rules: {
      'no-unused-vars': 'warn'
    }
  },
  {
    files: ['scripts/shared/constants.js'],
    rules: {
      'no-redeclare': 'off',
      'no-unused-vars': 'off'
    }
  }
];
