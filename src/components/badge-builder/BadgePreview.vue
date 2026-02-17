<script setup lang="ts">
import { AlertCircle, Copy, Check, Eye } from 'lucide-vue-next';

import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useBadge } from '@/composables/useBadge';

const { badgeUrl, altText } = useBadge();
const hasError = ref(false);
const copied = ref(false);

watch(badgeUrl, () => {
  hasError.value = false;
});

async function copyUrl () {
  try {
    await navigator.clipboard.writeText(badgeUrl.value);
  }
  catch {
    fallbackCopy(badgeUrl.value);
  }
  copied.value = true;
  setTimeout(() => {
    copied.value = false;
  }, 2000);
}

function fallbackCopy (text: string) {
  const el = document.createElement('textarea');
  el.value = text;
  el.style.position = 'fixed';
  el.style.opacity = '0';
  document.body.appendChild(el);
  el.select();
  document.execCommand('copy');
  document.body.removeChild(el);
}
</script>

<template>
  <div class="overflow-hidden rounded-xl border border-border bg-card">
    <!-- Header -->
    <div class="flex items-center justify-between px-3 py-2 border-b border-border">
      <span class="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
        <Eye class="size-3" />
        Live Preview
      </span>
      <span class="text-[10px] text-muted-foreground/60">Updates in real-time</span>
    </div>

    <!-- Badge display area with subtle dot pattern -->
    <div
      class="flex min-h-[100px] items-center justify-center p-8 preview-area"
    >
      <img
        v-if="!hasError"
        :src="badgeUrl"
        :alt="altText"
        class="max-h-14 select-none drop-shadow-sm"
        @error="hasError = true"
      >
      <div
        v-else
        class="flex flex-col items-center gap-2 text-sm text-muted-foreground"
      >
        <AlertCircle class="size-5 text-destructive/60" />
        <span>Could not render badge</span>
        <span class="text-[11px] text-muted-foreground/60">Check your configuration above</span>
      </div>
    </div>

    <!-- URL bar -->
    <div class="flex items-center gap-2 border-t border-border px-3 py-2 bg-muted/30">
      <code class="flex-1 truncate text-[11px] text-muted-foreground">{{ badgeUrl }}</code>
      <Tooltip>
        <TooltipTrigger as-child>
          <Button
            variant="ghost"
            size="icon-sm"
            class="size-6 shrink-0"
            :class="copied ? '!bg-green-500/15 !text-green-400' : 'text-muted-foreground hover:text-foreground'"
            @click="copyUrl"
          >
            <Check
              v-if="copied"
              class="size-3"
            />
            <Copy
              v-else
              class="size-3"
            />
          </Button>
        </TooltipTrigger>
        <TooltipContent>{{ copied ? 'Copied!' : 'Copy URL' }}</TooltipContent>
      </Tooltip>
    </div>
  </div>
</template>

<style scoped>
.preview-area {
  background-image: radial-gradient(circle, hsl(var(--border)) 1px, transparent 1px);
  background-size: 16px 16px;
}
</style>
