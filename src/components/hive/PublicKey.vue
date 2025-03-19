<script setup lang="ts">
import { Button } from '@/components/ui/copybutton';

const props = defineProps<{
  value: string | number | boolean;
  afterValue?: string;
  context?: number;
  disableCopy?: boolean;
  class?: string;
}>();

const context = props.context ?? 6;

const value = String(props.value);
</script>

<template>
  <div class="flex items-center">
    <span class="font-mono pt-[2px] mr-1">
      <span v-if="context > 0" :class="props.class">{{ value.slice(0, context) }}...{{ value.slice(-context) }}</span>
      <span v-else :class="props.class">{{ value }}</span>
      <span class="ml-2" v-if="props.afterValue">{{ props.afterValue }}</span>
    </span>
    <Button v-if="!props.disableCopy" :value="value"/>
  </div>
</template>
