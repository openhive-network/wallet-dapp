import type { Updater } from '@tanstack/vue-table';
import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import type { Ref } from 'vue';

export const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs));

export const valueUpdater = <T extends Updater<unknown>>(updaterOrValue: T, ref: Ref) => {
  ref.value
    = typeof updaterOrValue === 'function'
      ? updaterOrValue(ref.value)
      : updaterOrValue;
};
