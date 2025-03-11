<script setup lang="ts">
import type { HTMLAttributes } from 'vue'
import { Button } from '@/components/ui/copybutton'
import { cn } from '@/lib/utils'
import { useVModel } from '@vueuse/core'

const props = defineProps<{
  class?: HTMLAttributes['class']
  defaultValue?: string | number
  modelValue?: string | number
  copyEnabled?: boolean;
  disabled?: boolean;
  height?: string;
  placeholder?: string;
}>()

const emits = defineEmits<{
  (e: 'update:modelValue', payload: string | number): void
}>()

const modelValue = useVModel(props, 'modelValue', emits, {
  passive: true,
  defaultValue: props.defaultValue,
})
</script>

<template>
  <div :class="cn(props.class, 'relative')">
    <textarea :disabled="disabled" :placeholder="placeholder" :style="{ height: props.height ?? '100px' }" v-model="modelValue" :class="'flex min-h-[60px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50'" />
    <Button class="absolute top-[10px] right-[10px]" :value="modelValue" v-if="copyEnabled" />
  </div>
</template>
