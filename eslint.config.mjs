import eslintConfigPrettier from 'eslint-config-prettier';
import prettierPlugin from 'eslint-plugin-prettier';
import tsEslint from 'typescript-eslint';

/** @type {string[]} */
const TS_FILES = ['**/{,.}*.{,c,m}{j,t}s'];

const typescriptConfigs = /** @type {import('eslint').Linter.Config[]} */ (
  tsEslint.config({
    plugins: {
      '@typescript-eslint': tsEslint.plugin,
    },
    languageOptions: {
      parser: tsEslint.parser,
      ecmaVersion: 2022,
      sourceType: 'module',
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    extends: [tsEslint.configs.strictTypeChecked, tsEslint.configs.stylisticTypeChecked],
  })
);

/**
 * @type {import('eslint').Linter.Config[]}
 */
const eslintConfig = [
  // config for all
  {
    ignores: [
      '**/node_modules/',
      '**/dist/',
      '**/dist-test/',
      '**/out/',
      '**/fixtures/',
      '**/.vscode-test/',
      '**/.vscode-test-web/',
    ],
  },
  { linterOptions: { reportUnusedDisableDirectives: true } },

  // config for javascript/typescript code
  ...typescriptConfigs.map((config) => ({
    ...config,
    files: TS_FILES,
  })),
  {
    ...eslintConfigPrettier,
    files: TS_FILES,
  },
  {
    plugins: { prettier: prettierPlugin },
    rules: { 'prettier/prettier': 'error' },
    files: TS_FILES,
  },
  {
    rules: {
      '@typescript-eslint/restrict-template-expressions': ['error', { allowNumber: true }],
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/prefer-nullish-coalescing': ['error', { ignorePrimitives: { string: true } }],
    },
    files: TS_FILES,
  },
  {
    rules: {
      '@typescript-eslint/naming-convention': [
        'warn',
        {
          selector: 'import',
          format: ['camelCase', 'PascalCase'],
        },
      ],
      curly: 'warn',
      eqeqeq: 'warn',
      'no-throw-literal': 'warn',
      semi: 'warn',
    },
    files: TS_FILES,
  },
];

export default eslintConfig;
