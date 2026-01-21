# AI Assistant Guide

Nuxt 4 (Vue 3) dApp for Hive blockchain wallet operations with MetaMask, Keychain, PeakVault, and Google Drive wallet support.

## Commands

```bash
pnpm dev      # Dev server (localhost:3000)
pnpm build    # Production build
pnpm lint     # Lint and auto-fix
pnpm test     # Playwright E2E tests
```

## Tech Stack

Nuxt 4.2 | Vue 3.5 | TypeScript 5.7 | Pinia 3.0 | Tailwind CSS 3 | Reka UI 2.0 | @hiveio/wax | Playwright

## Structure

```text
src/
├── components/      # Vue components (ui/ is auto-generated - do not edit)
├── pages/           # Nuxt routes (max 400 LOC per page)
├── stores/          # Pinia stores (*.store.ts)
├── composables/     # Vue composables
├── utils/           # Utilities
└── layouts/         # Page layouts
server/api/          # Server routes
__tests__/           # Playwright tests (e2e/, integration/, helpers/, fixtures/)
```

## Code Rules

### Components

- `<script setup lang="ts">` only (no Options API)
- `data-testid` attributes for E2E selectors
- Max 400 LOC per page, follow Single Responsibility Principle
- Use Skeleton components for async loading states
- `NuxtLink` for internal navigation, `<a target="_blank" rel="noopener noreferrer">` for external
- Add `keychainify-checked` class to all link/navigation components

### Stores & Data

- Never call APIs directly from components - use Pinia stores
- Define stores with `state`, `getters`, `actions` pattern
- Use `shallowRef` for complex objects (wallet instances)
- HTM/ctokens is a separate domain - keep abstractions clean

### Error Handling

- **Never** use `console.*` - always `toastError(message, error)`
- Defensive programming for external APIs/wallets

### Style

- Imports: use `@/` alias, order: builtin → external → internal → relative
- TypeScript: PascalCase (types), camelCase (vars), UPPER_CASE (enums), `_unused` prefix
- Tailwind only (no custom CSS), mobile-first, dark mode support
- Arrow functions, concise syntax
- Don't repeat code - extract common functionality

### Documentation

- Do not create markdown documentation files
- Write self-documenting code; comments only where intent unclear

## Do Not Edit

- `src/components/ui/*` - Auto-generated Reka UI/shadcn
- `src/utils/wallet/ctokens/api.ts` - Generated from spec

## Before Commit

1. `pnpm lint` - Fix issues
2. `pnpm build` - Verify build
3. `pnpm test` - Run tests (on relevant changes)
