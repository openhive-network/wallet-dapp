---
paths: src/**/*.vue, src/**/*.ts
---

# Vue/Nuxt Coding Patterns

## Component Structure

Use script setup with TypeScript:

```vue
<script setup lang="ts">
import { ref, computed } from 'vue';
import { useUserStore } from '@/stores/user.store';

const userStore = useUserStore();
const isLoading = ref(false);
</script>
```

## Pinia Store Patterns

Prefer `state`, `getters`, `actions` pattern:

```typescript
export const useExampleStore = defineStore('example', {
  state: () => ({
    isConnected: false,
    data: null as DataType | null,
  }),
  getters: {
    status: (state) => state.isConnected ? 'connected' : 'disconnected',
  },
  actions: {
    async connect() {
      try {
        // implementation
      } catch (error) {
        toastError('Connection failed', error);
        throw error;
      }
    },
  },
});
```

For complex objects (wallet instances), use shallowRef in setup stores.

## Tailwind CSS

- Use utility classes only, avoid custom CSS
- Mobile-first: `text-sm md:text-base lg:text-lg`
- Dark mode: `bg-white dark:bg-gray-900`
- Use Reka UI primitives for accessible components

## Error Handling

- Never use `console.*` - use `toastError(message, error)` instead
- Always show loading states with Skeleton components
- Handle wallet disconnection gracefully
- Validate blockchain transaction results
- Defensive programming for external APIs/wallets
