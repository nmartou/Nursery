// @ts-check
import eslint from '@eslint/js';
import angular from 'angular-eslint';
import prettier from 'eslint-config-prettier';
import tseslint from 'typescript-eslint';
import nursery from './eslint-rules/index.mjs';

/** Date patterns that silently shift the day depending on the time zone. */
const DATE_PITFALLS = [
  {
    selector:
      "CallExpression[callee.property.name=/^(slice|substring|substr|split)$/][callee.object.callee.property.name='toISOString']",
    message:
      "toISOString() est en UTC : le jour peut être décalé. Utilisez les helpers de 'shared/utils/date.utils'.",
  },
  {
    selector: "NewExpression[callee.name='Date'][arguments.0.value=/^\\d{4}-\\d{2}-\\d{2}$/]",
    message:
      "new Date('YYYY-MM-DD') est interprété en UTC : utilisez les helpers de 'shared/utils/date.utils'.",
  },
];

/** API URLs live in `src/environments/`, never in the code. */
const HARDCODED_URLS = [
  {
    selector: 'Literal[value=/^https?:\\/\\//]',
    message: "Pas d'URL en dur : utilisez 'environment.apiUrl'.",
  },
  {
    selector: 'TemplateElement[value.raw=/^https?:\\/\\//]',
    message: "Pas d'URL en dur : utilisez 'environment.apiUrl'.",
  },
];

const TEST_FOCUS = {
  selector:
    'CallExpression[callee.object.name=/^(describe|it|test)$/][callee.property.name=/^(only|skip)$/]',
  message: '.only / .skip ne doivent pas être commités.',
};

export default tseslint.config(
  {
    ignores: [
      'dist/',
      'coverage/',
      'node_modules/',
      '.angular/',
      'playwright-report/',
      'test-results/',
      'eslint-rules/',
      '*.config.*',
    ],
  },
  {
    files: ['**/*.ts'],
    extends: [
      eslint.configs.recommended,
      tseslint.configs.recommendedTypeChecked,
      angular.configs.tsRecommended,
    ],
    processor: angular.processInlineTemplates,
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    plugins: { nursery },
    rules: {
      // Angular
      '@angular-eslint/directive-selector': [
        'error',
        { type: 'attribute', prefix: 'app', style: 'camelCase' },
      ],
      '@angular-eslint/component-selector': [
        'error',
        { type: 'element', prefix: 'app', style: 'kebab-case' },
      ],
      '@angular-eslint/prefer-on-push-component-change-detection': 'error',
      '@angular-eslint/prefer-signals': 'error',
      '@angular-eslint/prefer-standalone': 'error',
      '@angular-eslint/use-lifecycle-interface': 'error',
      '@angular-eslint/no-output-native': 'error',

      // Static helpers such as `Validators.required` are meant to be passed around.
      '@typescript-eslint/unbound-method': ['error', { ignoreStatic: true }],

      // Promises
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/no-misused-promises': 'error',

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
      eqeqeq: ['error', 'always', { null: 'ignore' }],
      'no-console': 'error',
      'no-restricted-syntax': ['error', ...DATE_PITFALLS, ...HARDCODED_URLS],

      // Project rules
      'nursery/layer-boundaries': 'error',
      'nursery/subscribe-handles-errors': 'error',
    },
  },
  {
    // Where these patterns are legitimate.
    files: ['src/app/shared/utils/date.utils.ts'],
    rules: { 'no-restricted-syntax': ['error', ...HARDCODED_URLS] },
  },
  {
    files: ['src/main.ts'],
    rules: { 'no-console': 'off' },
  },
  {
    files: ['src/environments/**/*.ts'],
    rules: { 'no-restricted-syntax': ['error', ...DATE_PITFALLS] },
  },
  {
    files: ['**/*.spec.ts', 'e2e/**/*.ts'],
    rules: {
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-argument': 'off',
      '@typescript-eslint/unbound-method': 'off',
      '@typescript-eslint/no-non-null-assertion': 'off',
      'nursery/subscribe-handles-errors': 'off',
      'no-restricted-syntax': ['error', TEST_FOCUS],
    },
  },
  {
    files: ['**/*.html'],
    extends: [angular.configs.templateRecommended, angular.configs.templateAccessibility],
    rules: {
      '@angular-eslint/template/prefer-control-flow': 'error',
      '@angular-eslint/template/prefer-self-closing-tags': 'error',
      '@angular-eslint/template/eqeqeq': 'error',
      '@angular-eslint/template/button-has-type': 'error',
      // Styles (and so colors) belong in .scss files, where Stylelint checks them.
      '@angular-eslint/template/no-inline-styles': 'error',
    },
  },
  prettier,
);
