<script setup lang="ts">
import { Info } from 'lucide-vue-next';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useBadge } from '@/composables/useBadge';

const { config } = useBadge();
</script>

<template>
  <div class="grid gap-3 sm:grid-cols-2 sm:items-end">
    <div class="space-y-1.5">
      <Label
        for="static-label"
        class="text-xs"
      >Label</Label>
      <Input
        id="static-label"
        v-model="config.label"
        placeholder="build, license, version"
        class="h-8 text-xs"
      />
    </div>
    <div class="space-y-1.5">
      <div class="flex items-center justify-between">
        <Label
          for="static-message"
          class="text-xs"
        >
          Message
          <span
            v-if="!config.messageDynamic"
            class="text-destructive"
          >*</span>
        </Label>
        <div class="flex items-center gap-1.5">
          <Label
            for="message-dynamic"
            class="text-[11px] text-muted-foreground"
          >Dynamic</Label>
          <Switch
            id="message-dynamic"
            :model-value="config.messageDynamic"
            @update:model-value="config.messageDynamic = $event"
          />
          <Tooltip>
            <TooltipTrigger as-child>
              <button class="text-muted-foreground hover:text-foreground">
                <Info class="size-3" />
              </button>
            </TooltipTrigger>
            <TooltipContent class="max-w-[260px] text-xs leading-relaxed">
              When enabled, the message won't be included in the output JSON.
              Your backend will provide it dynamically, allowing the badge to
              update automatically based on live data.
            </TooltipContent>
          </Tooltip>
        </div>
      </div>
      <Input
        id="static-message"
        v-model="config.message"
        :disabled="config.messageDynamic"
        :placeholder="config.messageDynamic ? 'Provided by backend' : 'passing, MIT, v1.0.0'"
        class="h-8 text-xs"
        :class="config.messageDynamic && 'opacity-50'"
      />
    </div>
  </div>
</template>
