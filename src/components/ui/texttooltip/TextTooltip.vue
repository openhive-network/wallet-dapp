<script setup lang="ts">
import { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';

defineProps<{
  side?: 'top' | 'right' | 'bottom' | 'left';
  delayDuration?: number;
}>();
</script>

<template>
  <TooltipProvider :delay-duration="delayDuration || 350">
    <Tooltip>
      <TooltipTrigger as-child>
        <span class="truncate w-full block">
          <slot />
        </span>
      </TooltipTrigger>
      <TooltipContent
        :side="side || 'top'"
        align="center"
      >
        <slot />
      </TooltipContent>
    </Tooltip>
  </TooltipProvider>
</template>
