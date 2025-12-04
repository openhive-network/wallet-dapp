# Copilot Instructions for This Nuxt Repository

## Code Structure
- Prefer imports from absolute paths using `@`: `@/components/...`, over relative paths.
- Break pages and components into small, reusable units whenever possible.
  - **Max page size:** 400 LOC.
  - Follow **Single Responsibility Principle** for all components.
- Avoid trailing spaces and maintain consistent formatting (use project ESLint/Prettier rules).

## Error Handling & Logging
- **Never** use `console.*` for logging, debugging, or error reporting.
- Always use `toastError(message, error)` to surface errors to the user.

## Loading States
- When components or pages depend on async data, include **Skeleton components** whenever possible.
  - Skeletons should be lightweight, reusable, and reflect the expected layout.

## Architecture & Data Flow
- **HTM/ctokens** is a separate domain and **not** directly tied to the wallet-dapp. Keep abstractions clean.
- Always use the **store** (Pinia/Vuex) and **mediating interfaces/services** for API communication.
  - APIs may change - components should never call APIs directly.
  - Prefer strongly typed interfaces for request/response modeling.
  - Prefer defining Pinia stores as `state`, `getters`, and `actions` (avoid using `defineStore` with only setup functions).

## UI & Styling
- Maintain consistent component naming and directory structure. Add directories as needed.
- Avoid excessive inline styles; prefer Tailwind CSS utility classes or component-scoped styles.
- If required, install Shadcn UI components via `pnpm dlx shadcn-vue@latest add <component>` and import them properly.

## Project Documentation
- **Do not** create markdown files for documentation, architecture, reference, summary or instructions.
- Write self-documenting code; add comments only where intent is not obvious.

## Code formatting
- Prefer arrow functions and concise syntax where applicable.

## General Guidelines
- Prefer using `NuxtLink` for internal navigation over `<a>` tags. External links should use `<a>` with `target="_blank"` and `rel="noopener noreferrer"`.
- Do not repeat the code. If you notice that it is the same in a multiple files - extract the code into a separate file/component, implementing common functionality
- When using any component creating a link/navigation, ensure it has a class `keychainify-checked` to avoid hydration issues when keychain is installed.
- Prefer fallback-safe, defensive programming for external interactions (APIs, wallets, etc.).
- Keep dependencies minimal and review them regularly.
