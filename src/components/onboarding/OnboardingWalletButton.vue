<script setup lang="ts">
import { mdiDownload } from '@mdi/js';

import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

const props = defineProps<{
  class?: string;
  logoUrl: string;
  name: string;
  description: string;
  disabled?: boolean;
  downloadUrl?: string;
  downloadUrlTriggersClick?: boolean;
}>();

const emit = defineEmits(['click']);
</script>

<template>
  <div class="relative">
    <Button
      :disabled="disabled"
      variant="outline"
      size="lg"
      :class="cn('w-full justify-start px-5 py-8', props.class)"
      @click="emit('click')"
    >
      <img
        :src="props.logoUrl"
        class="w-[35px] mr-3"
      >
      <div class="inline-flex flex-col text-left">
        <span class="text-lg/6">{{ props.name }}</span>
        <span class="text-xs text-description">{{ props.description }}</span>
      </div>
    </Button>
    <TooltipProvider
      v-if="props.downloadUrl"
      :delay-duration="200"
      disable-hoverable-content
    >
      <Tooltip>
        <TooltipTrigger class="absolute right-4 top-1/2 transform -translate-y-1/2 w-8 h-8">
          <a
            v-if="props.disabled"
            :href="props.downloadUrl"
            target="_blank"
            @click="props.downloadUrlTriggersClick && emit('click')"
          >
            <Button
              variant="ghost"
              class="w-8 h-8 p-0"
            >
              <svg
                width="24"
                height="24"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
              ><path
                style="fill: hsl(var(--foreground))"
                :d="mdiDownload"
              /></svg>
            </Button>
          </a>
        </TooltipTrigger>
        <TooltipContent>
          <p>Install {{ props.name }} extension</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  </div>
</template>

<style scoped>
.text-description {
  color: hsla(var(--foreground) / .5);
}
</style>
