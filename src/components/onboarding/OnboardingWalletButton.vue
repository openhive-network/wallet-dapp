<script setup lang="ts">
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { mdiDownload } from "@mdi/js";

const props = defineProps<{
  class?: string;
  logoUrl: string;
  name: string;
  description: string;
  disabled?: boolean;
  downloadUrl: string;
  downloadUrlTriggersClick?: boolean;
}>();

const emit = defineEmits(['click']);
</script>

<template>
  <div class="relative">
    <Button :disabled="disabled" @click="emit('click')" variant="outline" size="lg" :class="cn('w-full justify-start px-5 py-8', props.class)">
      <img :src="props.logoUrl" class="w-[35px] mr-3" />
      <div class="inline-flex flex-col text-left">
        <span class="text-lg/6">{{ props.name }}</span>
        <span class="text-xs text-description">{{ props.description }}</span>
      </div>
    </Button>
    <TooltipProvider :delayDuration="200" disableHoverableContent>
      <Tooltip>
        <TooltipTrigger class="absolute right-4 top-1/2 transform -translate-y-1/2 w-8 h-8">
          <a :href="props.downloadUrl" @click="props.downloadUrlTriggersClick && emit('click')" v-if="props.disabled" target="_blank">
            <Button variant="ghost" class="w-8 h-8 p-0">
              <svg width="24" height="24" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path style="fill: hsl(var(--foreground))" :d="mdiDownload"/></svg>
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
