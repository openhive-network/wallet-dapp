<script setup lang="ts">
import { Button } from '@/components/ui/copybutton';

const props = defineProps<{
  value: string | number | boolean;
  role: string;
  afterValue?: string;
  context?: number;
  disableCopy?: boolean;
  class?: string;
}>();

const context = props.context ?? 6;

const value = String(props.value);
</script>

<template>
  <div class="flex items-center p-1">
    <span class="font-bold">{{ props.role.toUpperCase() }}</span>
    <div class="mx-2 border flex-grow border-[hsl(var(--foreground))] opacity-[0.1]" />
    <div class="flex items-center">
      <span class="font-mono pt-[2px] mr-1">
        <span
          class="sm:hidden"
          :class="props.class"
        >{{ value.slice(0, 6) }}...{{ value.slice(-6) }}</span>
        <span
          v-if="context > 0"
          class="hidden sm:inline"
          :class="props.class"
        >{{ value.slice(0, context) }}...{{ value.slice(-context) }}</span>
        <span
          v-else
          class="hidden sm:inline"
          :class="props.class"
        >{{ value }}</span>
        <span
          v-if="props.afterValue"
          class="ml-2"
        >{{ props.afterValue }}</span>
      </span>
      <Button
        v-if="!props.disableCopy"
        :value="value"
      />
    </div>
  </div>
</template>
