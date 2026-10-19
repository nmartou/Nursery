// @ts-check
import eslint from '@eslint/js';
import prettier from 'eslint-config-prettier';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import nursery from './eslint-rules/index.js';

/** Date patterns that silently shift the day depending on the time zone. */
const DATE_PITFALLS = [
  {
    selector:
      "CallExpression[callee.property.name=/^(slice|substring|substr|split)$/][callee.object.callee.property.name='toISOString']",
    message:
      "toISOString() est en UTC : le jour peut être décalé. Utilisez toIsoDate() de 'common/utils/date.util'.",
  },
  {
    selector:
      "NewExpression[callee.name='Date'][arguments.0.value=/^\\d{4}-\\d{2}-\\d{2}$/]",
    message:
      "new Date('YYYY-MM-DD') est interprété en UTC : utilisez les helpers de 'common/utils/date.util'.",
  },
];

export default tseslint.config(
  {
    ignores: [
      'dist/',
      'coverage/',
      'node_modules/',
      'eslint-rules/',
      '*.config.*',
    ],
  },
  eslint.configs.recommended,
  tseslint.configs.recommendedTypeChecked,
  {
    languageOptions: {
      globals: { ...globals.node, ...globals.vitest },
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    plugins: { nursery },
    rules: {
      // Promises
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/no-misused-promises': 'error',
      '@typescript-eslint/return-await': ['error', 'in-try-catch'],

      // Type safety
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-non-null-assertion': 'error',
      '@typescript-eslint/switch-exhaustiveness-check': [
        'error',
        { considerDefaultExhaustiveForUnions: true },
      ],
      '@typescript-eslint/strict-boolean-expressions': [
        'error',
        {
          allowString: true,
          allowNullableObject: true,
          allowNullableBoolean: true,
          allowNumber: false,
          allowNullableNumber: false,
          allowNullableString: true,
        },
      ],
      '@typescript-eslint/consistent-type-imports': [
        'error',
        { fixStyle: 'separate-type-imports' },
      ],
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],

      // General
      eqeqeq: ['error', 'always'],
      'no-console': 'error',
      'no-restricted-syntax': ['error', ...DATE_PITFALLS],

      // Project rules
      'nursery/module-boundaries': 'error',
      'nursery/dto-properties-validated': 'error',
    },
  },
  {
    // The date helpers are where these patterns are allowed.
    files: ['src/common/utils/date.util.ts'],
    rules: { 'no-restricted-syntax': 'off' },
  },
  {
    files: ['src/main.ts'],
    rules: { 'no-console': 'off' },
  },
  {
    files: ['**/*.spec.ts', 'test/**/*.ts'],
    rules: {
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-argument': 'off',
      '@typescript-eslint/unbound-method': 'off',
      '@typescript-eslint/no-non-null-assertion': 'off',
      'no-restricted-syntax': [
        'error',
        {
          selector:
            'CallExpression[callee.object.name=/^(describe|it|test)$/][callee.property.name=/^(only|skip)$/]',
          message: '.only / .skip ne doivent pas être commités.',
        },
      ],
    },
  },
  prettier,
);
