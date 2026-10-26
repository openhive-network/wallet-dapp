<script setup lang="ts">
import type { HTMLAttributes } from 'vue'
import { cn } from '@/lib/utils'
import { Primitive, type PrimitiveProps } from 'reka-ui'
import { buttonVariants } from '.'
import { mdiCheck, mdiContentCopy } from '@mdi/js'
import { copyText } from '@/utils/copy'

interface Props extends PrimitiveProps {
  class?: HTMLAttributes['class'];
  value?: boolean | string | number;
}

const props = withDefaults(defineProps<Props>(), {
  as: 'button',
});

const copyBtn = (event: MouseEvent) => {
  const target = event.target as HTMLElement;
  const value = target.getAttribute("data-copy");
  if (!value) return;
  void copyText(value);

  const icon = target.children[0]?.children[0];
  if (!icon) return;
  const oldAttribute = icon.getAttribute('d');
  icon.setAttribute('d', mdiCheck);
  setTimeout(() => {
    icon.setAttribute('d', oldAttribute!);
  }, 1000);
};
</script>

<template>
  <Primitive
    :as="as"
    :as-child="asChild"
    :class="cn(buttonVariants(), 'px-2', props.class)"
    @click="copyBtn"
    :data-copy="props.value"
  >
    <slot>
      <svg width="20" height="20" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path style="fill: hsl(var(--foreground))" :d="mdiContentCopy"/></svg>
    </slot>
  </Primitive>
</template>
