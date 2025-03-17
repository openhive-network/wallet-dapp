<script setup lang="ts">
import { ref, type HTMLAttributes } from 'vue'
import { cn } from '@/lib/utils'
import { Primitive, type PrimitiveProps } from 'reka-ui'
import { type ButtonVariants, buttonVariants } from '.'
import { mdiCheck, mdiLoading } from '@mdi/js'
import { copyText } from '@/utils/copy'

interface Props extends PrimitiveProps {
  variant?: ButtonVariants['variant']
  size?: ButtonVariants['size']
  class?: HTMLAttributes['class']
  loading?: boolean
  disabled?: boolean
  copy?: string | (() => (string | Promise<string>))
}

const props = withDefaults(defineProps<Props>(), {
  as: 'button',
  loading: false
})

const copyLoading = ref(false);

const copyBtn = () => {
  if (!props.copy) return;
  const text = typeof props.copy === 'function' ? props.copy() : props.copy;
  if(text instanceof Promise)
    text.then((text) => {
      copyText(text);
    });
  else
    copyText(text);

  copyLoading.value = true;
  setTimeout(() => {
    copyLoading.value = false;
  }, 1000);
};
</script>

<template>
  <Primitive
    :as="as"
    :as-child="asChild"
    :disabled="loading || disabled"
    :class="[ cn(buttonVariants({ variant, size }), props.class)]"
    @click="copyBtn"
  >
    <span v-if="copy && copyLoading" class="absolute mx-auto">
      <svg width="24" height="24" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path :style="{
        fill: !variant || variant === 'default' ? 'hsl(var(--background))' : 'hsl(var(--foreground))'
      }" :d="mdiCheck"/></svg>
    </span>
    <span v-if="loading" class="animate-spin absolute mx-auto">
      <svg width="24" height="24" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path :style="{
        fill: !variant || variant === 'default' ? 'hsl(var(--background))' : 'hsl(var(--foreground))'
      }" :d="mdiLoading"/></svg>
    </span>
    <span :style="{ 'visibility': loading || copyLoading ? 'hidden' : 'visible' }" class="inline-flex items-center justify-center gap-2">
      <slot/>
    </span>
  </Primitive>
</template>
