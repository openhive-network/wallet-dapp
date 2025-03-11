<script setup lang="ts">
import { Button } from "@/components/ui/button";
import { cn } from '@/lib/utils'

const props = defineProps<{
  class?: string;
  logoUrl: string;
  name: string;
  description: string;
}>();
</script>

<template>
  <Button variant="outline" size="lg" :class="cn('w-full justify-start px-5 py-8', props.class)">
    <img :src="props.logoUrl" class="w-[35px] mr-3" />
    <div class="inline-flex flex-col text-left">
      <span class="text-lg/6">{{ props.name }}</span>
      <span class="text-xs text-description">{{ props.description }}</span>
    </div>
  </Button>
</template>

<style scoped>
.text-description {
  color: hsla(var(--foreground) / .5);
}
</style>
