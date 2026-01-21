import type { Plugin } from 'vite';

export function stripTestIds (): Plugin {
  return {
    name: 'strip-test-ids',
    enforce: 'pre',
    transform (code, id) {
      if (process.env.NODE_ENV !== 'production') return;
      if (!id.endsWith('.vue')) return;
      return code.replace(/\s+data-testid="[^"]*"/g, '');
    }
  };
}
