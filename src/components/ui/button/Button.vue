<script setup lang="ts">
import type { HTMLAttributes } from 'vue'
import { cn } from '@/lib/utils'
import { Primitive, type PrimitiveProps } from 'reka-ui'
import { type ButtonVariants, buttonVariants } from '.'
import { mdiLoading } from '@mdi/js'

interface Props extends PrimitiveProps {
  variant?: ButtonVariants['variant']
  size?: ButtonVariants['size']
  class?: HTMLAttributes['class']
  loading?: boolean
  disabled?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  as: 'button',
  loading: false
})
</script>

<template>
  <Primitive
    :as="as"
    :as-child="asChild"
    :disabled="loading || disabled"
    :class="[ cn(buttonVariants({ variant, size }), props.class)]"
  >
    <span v-if="loading" class="animate-spin absolute mx-auto">
      <svg width="24" height="24" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path :style="{
        fill: !variant || variant === 'default' ? 'hsl(var(--background))' : 'hsl(var(--foreground))'
      }" :d="mdiLoading"/></svg>
    </span>
    <span :style="{ 'visibility': loading ? 'hidden' : 'visible' }" class="inline-flex items-center justify-center gap-2">
      <slot/>
    </span>
  </Primitive>
</template>
