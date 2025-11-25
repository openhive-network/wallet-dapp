<script setup lang="ts">
import { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';

defineProps<{
  side?: 'top' | 'right' | 'bottom' | 'left';
  delayDuration?: number;
  content?: string;
  ignore?: boolean; // If true, disables the tooltip functionality
}>();
</script>

<template>
  <slot v-if="ignore" />
  <TooltipProvider v-else :delay-duration="delayDuration || 350">
    <Tooltip>
      <TooltipTrigger as-child>
        <div>
          <span class="truncate w-full block" v-if="!content">
            <!--/* Default case for direct slot as truncated text + content */-->
            <slot />
          </span>
          <template v-else>
            <!--/* Case for content string provided via prop */-->
            <slot />
          </template>
        </div>
      </TooltipTrigger>
      <TooltipContent
        :side="side || 'top'"
        align="center"
      >
        <!-- Show content prop if provided, else show default slot content -->
        <span v-if="content">
          {{ content }}
        </span>
        <template v-else>
          <slot />
        </template>
      </TooltipContent>
    </Tooltip>
  </TooltipProvider>
</template>
