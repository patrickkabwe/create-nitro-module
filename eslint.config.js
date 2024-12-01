import js from '@eslint/js'
import ts from '@typescript-eslint/eslint-plugin'
import tsParser from '@typescript-eslint/parser'
import nodePlugin from 'eslint-plugin-n'

export default [
  js.configs.recommended,
  nodePlugin.configs['flat/recommended-script'],
  {
    files: ['src/**/*.ts'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
      },
    },
    plugins: {
      '@typescript-eslint': ts,
    },
    rules: {
      ...ts.configs.recommended.rules,
    },
    ignores: ['lib/*', 'node_modules/*', 'src/assets/*'],
  },
]
