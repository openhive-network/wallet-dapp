<script setup lang="ts">
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useBadge } from '@/composables/useBadge';

const { config } = useBadge();
</script>

<template>
  <div class="space-y-3">
    <div class="space-y-1.5">
      <Label
        for="endpoint-url"
        class="text-xs"
      >Endpoint URL <span class="text-destructive">*</span></Label>
      <Input
        id="endpoint-url"
        v-model="config.dataUrl"
        type="url"
        placeholder="https://example.com/api/badge"
        class="h-8 text-xs"
      />
      <p class="text-[11px] text-muted-foreground">
        JSON endpoint returning the badge schema (schemaVersion, label, message, color)
      </p>
    </div>

    <div class="space-y-1.5">
      <Label
        for="endpoint-label"
        class="text-xs"
      >Label Override</Label>
      <Input
        id="endpoint-label"
        v-model="config.label"
        placeholder="Override endpoint label"
        class="h-8 text-xs"
      />
    </div>

    <details class="group">
      <summary class="cursor-pointer text-xs text-muted-foreground hover:text-foreground">
        Example response schema
      </summary>
      <pre class="mt-2 overflow-x-auto rounded bg-muted p-2.5 font-mono text-[11px] leading-relaxed"><code>{
  "schemaVersion": 1,
  "label": "hello",
  "message": "world",
  "color": "orange"
}</code></pre>
    </details>
  </div>
</template>
