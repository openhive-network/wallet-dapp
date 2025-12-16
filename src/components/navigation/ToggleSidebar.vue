<script setup lang="ts">
import { mdiMenuClose, mdiMenuOpen } from '@mdi/js';

import { Button } from '@/components/ui/button';
import { useSidebar } from '@/components/ui/sidebar';

const { toggleSidebar, open, isMobile } = useSidebar();
</script>

<template>
  <Button
    v-if="isMobile"
    variant="ghost"
    size="default"
    class="min-h-[44px] min-w-[44px] [&_svg]:size-6"
    @click="toggleSidebar"
  >
    <svg
      width="24"
      height="24"
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
    >
      <path
        style="fill: hsl(var(--foreground))"
        :d="open && !isMobile ? mdiMenuOpen : mdiMenuClose"
      />
    </svg>
    <span v-if="!isMobile">{{ open && !isMobile ? 'Close sidebar' : 'Open sidebar' }}</span>
  </Button>
</template>
