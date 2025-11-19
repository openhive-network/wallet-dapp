import withNuxt from './.nuxt/eslint.config.mjs';

// Use a functional override to avoid mutating possibly-frozen rule objects returned by withNuxt()
// Also append a small config to add an ignore for shadcn auto-generated UI components
export default withNuxt(
  // Default Nuxt configuration
  {},

  // Client-specific rules
  {
    files: [
      'src/**'
    ],
    rules: {
      'no-console': 'warn'
    }
  },

  // Server-specific rules
  {
    files: [
      'server/**'
    ],
    rules: {
      'no-console': 'off'
    }
  }).override('nuxt/rules', {
  ignores: ['src/components/ui/**', 'src/utils/wallet/ctokens/api/**'],
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
    'comma-dangle': ['error', 'never']
  }
}).override('nuxt/import/rules', {
  ignores: ['src/components/ui/**', 'src/utils/wallet/ctokens/api/**'],
  rules: {
    // Import rules
    'import/no-self-import': 2,
    'import/no-cycle': 2,
    'import/export': 2,
    'import/no-unused-modules': 1,
    'import/no-commonjs': 1,
    'import/newline-after-import': 2,
    'import/first': 2,
    'import/no-duplicates': 2,
    'import/order': [ 2, {
      groups: [
        'builtin',     // Node.js built-in modules
        'external',    // External libraries (node_modules)
        'internal',    // Internal modules (using @ alias)
        'parent',      // Relative imports from parent directories
        'sibling',     // Relative imports from same directory
        'index'        // Index files
      ],
      pathGroups: [
        {
          pattern: '@/**',
          group: 'internal',
          position: 'before'
        }
      ],
      pathGroupsExcludedImportTypes: ['builtin'],
      'newlines-between': 'always',
      alphabetize: {
        order: 'asc',
        caseInsensitive: true
      }
    } ]
  }
}).override('nuxt/vue/rules', {
  ignores: ['src/components/ui/**', 'src/utils/wallet/ctokens/api/**'],
  rules: {
    // Vue rules
    'vue/multi-word-component-names': 'off'
  }
}).override('nuxt/typescript/rules', {
  ignores: ['src/components/ui/**', 'src/utils/wallet/ctokens/api/**'],
  rules: {
    // TypeScript rules
    '@typescript-eslint/no-extra-semi': 'off',
    '@typescript-eslint/strict-boolean-expressions': 'off',
    '@typescript-eslint/explicit-member-accessibility': 'error',
    '@typescript-eslint/no-empty-object-type': 'off',
    '@typescript-eslint/consistent-type-imports': 'error',
    '@typescript-eslint/no-unused-vars': ['error', {
      argsIgnorePattern: '^_',
      varsIgnorePattern: '^_',
      caughtErrorsIgnorePattern: '^_'
    }],

    '@typescript-eslint/naming-convention': ['error', {
      selector: 'interface',
      format: ['PascalCase']
    }, {
      selector: 'typeParameter',
      format: ['PascalCase']
    }, {
      selector: 'enum',
      format: ['PascalCase']
    }, {
      selector: 'enumMember',
      format: ['UPPER_CASE']
    }, {
      selector: 'class',
      format: ['PascalCase']
    }, {
      selector: 'default',
      format: ['camelCase'],
      leadingUnderscore: 'allow',
      trailingUnderscore: 'allow'
    }, {
      selector: 'import',
      format: ['camelCase', 'PascalCase', 'UPPER_CASE']
    }, {
      selector: 'variable',
      format: ['camelCase', 'UPPER_CASE', 'PascalCase', 'snake_case'],
      leadingUnderscore: 'allow',
      trailingUnderscore: 'allow'
    }, {
      selector: 'typeAlias',
      format: ['PascalCase']
    }, {
      selector: 'objectLiteralProperty',
      format: null,
      leadingUnderscore: 'allow',
      trailingUnderscore: 'allow'
    }, {
      selector: 'typeProperty',
      format: null,
      leadingUnderscore: 'allow'
    }, {
      selector: 'classProperty',
      format: null
    }]
  }
});
