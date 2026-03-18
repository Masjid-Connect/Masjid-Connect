const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  ...expoConfig,
  {
    ignores: ['node_modules/', 'dist/', '.expo/', 'babel.config.js', 'jest.config.js', 'web/', 'backend/'],
  },
]);
