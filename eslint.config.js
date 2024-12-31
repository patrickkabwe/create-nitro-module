import js from '@eslint/js'
import ts from '@typescript-eslint/eslint-plugin'
import tsParser from '@typescript-eslint/parser'
import nodePlugin from 'eslint-plugin-n'

export default [
  js.configs.recommended,
  nodePlugin.configs['flat/recommended-script'],
  {
    files: ['src/*.ts'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
      },
      globals: {
        NodeJS: true,
      },
    },
    plugins: {
      '@typescript-eslint': ts,
      n: nodePlugin,
    },
    rules: {
      ...ts.configs.recommended.rules,
      'n/hashbang': 'off',
      'n/no-process-exit': 'off',
      'node/no-missing-import': [
        'error',
        {
          tryExtensions: ['.js', '.json'],
        },
      ],
    },
  },
  {
    ignores: [
      'lib/',
      'node_modules/',
      'eslint.config.js',
      'assets/react-native.config.js',
    ],
  },
]
