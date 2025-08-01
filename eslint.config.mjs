import { defineConfig, globalIgnores } from 'eslint/config';
import typescriptEslint from '@typescript-eslint/eslint-plugin';
import { fixupPluginRules } from "@eslint/compat";
import _import from "eslint-plugin-import";
import vue from 'eslint-plugin-vue';
import globals from 'globals';
import js from '@eslint/js';
import { FlatCompat } from '@eslint/eslintrc';

const compat = new FlatCompat({
  baseDirectory: import.meta.dirname,
  recommendedConfig: js.configs.recommended,
  allConfig: js.configs.all
});

export default defineConfig([globalIgnores([
  '**/eslint.config.mjs',
  '**/lib/utils.ts',
  '**/.github',
  '**/vite.config.ts',
  '**/node_modules',
  '**/dist',
  '**/tailwind.config.js',
  '**/vite-env.d.ts',
  'src/components/ui/*/**',
  '!src/components/ui/hive/**',
  '**/common-ci-configuration',
  'npm-common-config/**/*',
]),
js.configs.recommended,
...compat.extends('plugin:@typescript-eslint/recommended'),
...vue.configs['flat/recommended'],
{
  files: ['**/*.vue', '**/*.ts', '**/*.js'],
  plugins: {
    vue,
    import: fixupPluginRules(_import),
    '@typescript-eslint': typescriptEslint,
  },

  languageOptions: {
    globals: {
      ...globals.node,
      ...globals.browser,
    },

    ecmaVersion: 2020,
    sourceType: 'module',

    parserOptions: {
      parser: '@typescript-eslint/parser',
      extraFileExtensions: ['.vue'],
    },
  },

  rules: {
    // Core ESLint rules
    semi: ['error', 'always'],
    curly: ['error', 'multi-or-nest'],
    'import/first': 'off',
    'no-empty': 'off',
    'no-undef': 'off',
    quotes: ['error', 'single'],
    'eol-last': ['error', 'always'],
    'no-trailing-spaces': 'error',
    'space-before-function-paren': ['error', 'always'],
    indent: ['error', 2],
    'comma-dangle': ['error', 'never'],

    // TypeScript rules
    '@typescript-eslint/no-extra-semi': 'off',
    '@typescript-eslint/strict-boolean-expressions': 'off',
    '@typescript-eslint/explicit-member-accessibility': 'error',
    '@typescript-eslint/no-empty-object-type': 'off',
    '@typescript-eslint/consistent-type-imports': 'error',
    '@typescript-eslint/no-unused-vars': ['error', {
      argsIgnorePattern: '^_',
      varsIgnorePattern: '^_',
      caughtErrorsIgnorePattern: '^_',
    }],

    // Import rules
    "import/no-self-import": 2,
    "import/no-cycle": 2,
    "import/export": 2,
    "import/no-unused-modules": 1,
    "import/no-commonjs": 1,
    "import/newline-after-import": 2,
    "import/first": 2,
    "import/no-duplicates": 2,
    "import/order": [ 2, {
      groups: [
        "builtin",     // Node.js built-in modules
        "external",    // External libraries (node_modules)
        "internal",    // Internal modules (using @ alias)
        "parent",      // Relative imports from parent directories
        "sibling",     // Relative imports from same directory
        "index"        // Index files
      ],
      pathGroups: [
        {
          pattern: "@/**",
          group: "internal",
          position: "before"
        }
      ],
      pathGroupsExcludedImportTypes: ["builtin"],
      "newlines-between": "always",
      alphabetize: {
        order: "asc",
        caseInsensitive: true
      }
    } ],

    // Vue rules
    'vue/multi-word-component-names': 'off',

    '@typescript-eslint/naming-convention': ['error', {
      selector: 'interface',
      format: ['PascalCase'],
    }, {
      selector: 'typeParameter',
      format: ['PascalCase'],
    }, {
      selector: 'enum',
      format: ['PascalCase'],
    }, {
      selector: 'enumMember',
      format: ['UPPER_CASE'],
    }, {
      selector: 'class',
      format: ['PascalCase'],
    }, {
      selector: 'default',
      format: ['camelCase'],
      leadingUnderscore: 'allow',
      trailingUnderscore: 'allow',
    }, {
      selector: 'import',
      format: ['camelCase', 'PascalCase', 'UPPER_CASE'],
    }, {
      selector: 'variable',
      format: ['camelCase', 'UPPER_CASE', 'PascalCase', 'snake_case'],
      leadingUnderscore: 'allow',
      trailingUnderscore: 'allow',
    }, {
      selector: 'typeAlias',
      format: ['PascalCase'],
    }, {
      selector: 'objectLiteralProperty',
      format: ['camelCase', 'PascalCase', 'UPPER_CASE', 'snake_case'],
      leadingUnderscore: 'allow',
      trailingUnderscore: 'allow',
    }, {
      selector: 'typeProperty',
      format: ['camelCase', 'UPPER_CASE', 'snake_case'],
      leadingUnderscore: 'allow',
    }, {
      selector: 'classProperty',
      format: ['camelCase', 'UPPER_CASE', 'PascalCase'],
    }],
  },
}]);
