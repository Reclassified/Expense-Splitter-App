const globals = require('globals');
const pluginJs = require('@eslint/js');
const pluginPrettierRecommended = require('eslint-plugin-prettier/recommended');

module.exports = [
  {
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.jest,
      },
      ecmaVersion: 12,
    },
  },
  pluginJs.configs.recommended,
  pluginPrettierRecommended,
  {
    rules: {
      'no-console': 'off',
    },
  },
];
