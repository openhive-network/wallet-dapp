<script setup lang="ts">
import { Check, Copy, ChevronDown, Code2 } from 'lucide-vue-next';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useBadge } from '@/composables/useBadge';

const { badgeUrl, markdownSnippet, htmlSnippet, rstSnippet, asciiDocSnippet, endpointJson } = useBadge();

const formats = computed(() => [
  { key: 'url', label: 'URL', description: 'Direct image URL' },
  { key: 'md', label: 'MD', description: 'Markdown image syntax' },
  { key: 'html', label: 'HTML', description: 'HTML img tag' },
  { key: 'rst', label: 'RST', description: 'reStructuredText' },
  { key: 'adoc', label: 'AsciiDoc', description: 'AsciiDoc image macro' }
]);

const formatValues = computed(() => ({
  url: badgeUrl.value,
  md: markdownSnippet.value,
  html: htmlSnippet.value,
  rst: rstSnippet.value,
  adoc: asciiDocSnippet.value
}));

const activeFormat = ref('url');
const copied = ref(false);
const jsonCopied = ref(false);
const showJson = ref(false);

const currentValue = computed(() => {
  return formatValues.value[activeFormat.value as keyof typeof formatValues.value] || '';
});

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

async function copyToClipboard () {
  try {
    await navigator.clipboard.writeText(currentValue.value);
  }
  catch {
    fallbackCopy(currentValue.value);
  }
  copied.value = true;
  setTimeout(() => {
    copied.value = false;
  }, 2000);
}

async function copyJson () {
  try {
    await navigator.clipboard.writeText(endpointJson.value);
  }
  catch {
    fallbackCopy(endpointJson.value);
  }
  jsonCopied.value = true;
  setTimeout(() => {
    jsonCopied.value = false;
  }, 2000);
}
</script>

<template>
  <div class="overflow-hidden rounded-xl border border-border bg-card">
    <!-- Header -->
    <div class="flex items-center gap-1.5 border-b border-border px-3 py-2">
      <Code2 class="size-3 text-muted-foreground" />
      <span class="text-xs font-medium text-muted-foreground">Grab your code</span>
    </div>

    <!-- Format tabs -->
    <div class="flex items-center gap-1 border-b border-border px-2 py-1.5">
      <Tooltip
        v-for="format in formats"
        :key="format.key"
      >
        <TooltipTrigger as-child>
          <button
            class="rounded-md px-2.5 py-1 text-xs font-medium transition-colors"
            :class="[activeFormat === format.key ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground hover:bg-accent']"
            @click="activeFormat = format.key"
          >
            {{ format.label }}
          </button>
        </TooltipTrigger>
        <TooltipContent>{{ format.description }}</TooltipContent>
      </Tooltip>
    </div>

    <!-- Value + Copy -->
    <div class="flex items-center gap-2 p-2">
      <Input
        :model-value="currentValue"
        readonly
        class="h-8 font-mono text-xs"
        @focus="($event.target as HTMLInputElement).select()"
      />
      <Tooltip>
        <TooltipTrigger as-child>
          <Button
            variant="outline"
            size="icon-sm"
            class="size-8 shrink-0"
            :class="copied && '!border-green-500/30 !bg-green-500/15 !text-green-400'"
            @click="copyToClipboard"
          >
            <Check
              v-if="copied"
              class="size-3.5"
            />
            <Copy
              v-else
              class="size-3.5"
            />
          </Button>
        </TooltipTrigger>
        <TooltipContent>{{ copied ? 'Copied!' : 'Copy to clipboard' }}</TooltipContent>
      </Tooltip>
    </div>

    <!-- Endpoint JSON (collapsible) -->
    <div class="border-t border-border">
      <button
        class="flex w-full items-center justify-between px-3 py-2 text-xs text-muted-foreground transition-colors hover:text-foreground"
        @click="showJson = !showJson"
      >
        <span class="font-medium">Endpoint JSON</span>
        <ChevronDown
          class="size-3.5 transition-transform duration-200"
          :class="{ 'rotate-180': showJson }"
        />
      </button>
      <div
        v-if="showJson"
        class="border-t border-border px-3 pb-3 pt-2"
      >
        <div class="relative">
          <pre class="overflow-x-auto rounded-lg bg-muted p-2.5 pr-10 font-mono text-[11px] leading-relaxed"><code>{{ endpointJson }}</code></pre>
          <Tooltip>
            <TooltipTrigger as-child>
              <Button
                variant="ghost"
                size="icon-sm"
                class="absolute right-1.5 top-1.5 size-6"
                :class="jsonCopied ? '!bg-green-500/15 !text-green-400' : ''"
                @click="copyJson"
              >
                <Check
                  v-if="jsonCopied"
                  class="size-3"
                />
                <Copy
                  v-else
                  class="size-3"
                />
              </Button>
            </TooltipTrigger>
            <TooltipContent>{{ jsonCopied ? 'Copied!' : 'Copy JSON' }}</TooltipContent>
          </Tooltip>
        </div>
      </div>
    </div>
  </div>
</template>
