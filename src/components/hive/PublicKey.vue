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
        <span class="sm:hidden" :class="props.class">{{ value.slice(0, 6) }}...{{ value.slice(-6) }}</span>
        <span class="hidden sm:inline" v-if="context > 0" :class="props.class">{{ value.slice(0, context) }}...{{ value.slice(-context) }}</span>
        <span class="hidden sm:inline" v-else :class="props.class">{{ value }}</span>
        <span class="ml-2" v-if="props.afterValue">{{ props.afterValue }}</span>
      </span>
      <Button v-if="!props.disableCopy" :value="value"/>
    </div>
  </div>
</template>
