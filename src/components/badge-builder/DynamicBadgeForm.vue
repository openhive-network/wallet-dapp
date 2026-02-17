<script setup lang="ts">
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useBadge } from '@/composables/useBadge';
import type { BadgeType } from '@/composables/useBadge';

const { config } = useBadge();

const dynamicFormats = [
  { value: 'dynamic-json' as BadgeType, label: 'JSON', queryLabel: 'JSONPath', queryPlaceholder: '$.version' },
  { value: 'dynamic-xml' as BadgeType, label: 'XML', queryLabel: 'XPath', queryPlaceholder: '//version' },
  { value: 'dynamic-yaml' as BadgeType, label: 'YAML', queryLabel: 'JSONPath', queryPlaceholder: '$.version' },
  { value: 'dynamic-toml' as BadgeType, label: 'TOML', queryLabel: 'JSONPath', queryPlaceholder: '$.package.version' }
];

const activeFormat = computed(() =>
  dynamicFormats.find(f => f.value === config.value.type) ?? dynamicFormats[0]!
);
</script>

<template>
  <div class="space-y-3">
    <div class="flex flex-wrap gap-1.5">
      <Button
        v-for="format in dynamicFormats"
        :key="format.value"
        :variant="config.type === format.value ? 'default' : 'outline'"
        size="sm"
        class="h-7 px-2.5 text-xs"
        @click="config.type = format.value"
      >
        {{ format.label }}
      </Button>
    </div>

    <div class="space-y-1.5">
      <Label
        for="dynamic-url"
        class="text-xs"
      >Data URL <span class="text-destructive">*</span></Label>
      <Input
        id="dynamic-url"
        v-model="config.dataUrl"
        type="url"
        placeholder="https://example.com/api/data.json"
        class="h-8 text-xs"
      />
    </div>

    <div class="space-y-1.5">
      <Label
        for="dynamic-query"
        class="text-xs"
      >{{ activeFormat.queryLabel }} <span class="text-destructive">*</span></Label>
      <Input
        id="dynamic-query"
        v-model="config.query"
        :placeholder="activeFormat.queryPlaceholder"
        class="h-8 font-mono text-xs"
      />
    </div>

    <div class="grid gap-3 sm:grid-cols-3">
      <div class="space-y-1.5">
        <Label
          for="dynamic-label"
          class="text-xs"
        >Label</Label>
        <Input
          id="dynamic-label"
          v-model="config.label"
          placeholder="version"
          class="h-8 text-xs"
        />
      </div>
      <div class="space-y-1.5">
        <Label
          for="dynamic-prefix"
          class="text-xs"
        >Prefix</Label>
        <Input
          id="dynamic-prefix"
          v-model="config.prefix"
          placeholder="v"
          class="h-8 text-xs"
        />
      </div>
      <div class="space-y-1.5">
        <Label
          for="dynamic-suffix"
          class="text-xs"
        >Suffix</Label>
        <Input
          id="dynamic-suffix"
          v-model="config.suffix"
          placeholder="+build"
          class="h-8 text-xs"
        />
      </div>
    </div>
  </div>
</template>
