<script setup lang="ts">
import { useSidebar } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { mdiMenuClose, mdiMenuOpen } from "@mdi/js";

const { toggleSidebar, open, isMobile } = useSidebar();
</script>

<template>
  <Button v-if="isMobile" variant="ghost" size="xs" class="[&_svg]:size-6" @click="toggleSidebar">
    <svg width="24" height="24" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
      <path style="fill: hsl(var(--foreground))" :d="open && !isMobile ? mdiMenuOpen : mdiMenuClose"></path>
    </svg>
    <span v-if="!isMobile">{{ open && !isMobile ? 'Close sidebar' : 'Open sidebar' }}</span>
  </Button>
</template>
