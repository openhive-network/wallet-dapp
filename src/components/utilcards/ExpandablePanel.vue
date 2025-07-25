<script lang="ts" setup>
import { Button } from '@/components/ui/button';
import { mdiFileDocumentOutline, mdiChevronUp, mdiChevronDown, mdiKeyOutline } from '@mdi/js';
import PublicKey from '@/components/hive/PublicKey.vue';
import { ref } from 'vue';

const props = defineProps<{
  publicKeys: Record<string, string>;
}>();

const showDetailsPanel = ref(false);
</script>

<template>
  <div class="space-y-4">
  <Button
    variant="ghost"
    @click="showDetailsPanel = !showDetailsPanel"
    class="w-full flex items-center justify-center space-x-2 text-sm"
  >
    <svg width="16" height="16" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
      <path style="fill: currentColor" :d="mdiFileDocumentOutline"/>
    </svg>
    <span>{{ showDetailsPanel ? 'Hide' : 'Show' }} Account Details</span>
    <svg width="16" height="16" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
      <path style="fill: currentColor" :d="showDetailsPanel ? mdiChevronUp : mdiChevronDown"/>
    </svg>
  </Button>
  <div v-if="showDetailsPanel" class="space-y-3">
    <div class="border rounded-lg p-4">
      <div class="space-y-3">
        <div class="flex items-center space-x-2 mb-3">
          <svg width="16" height="16" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
            <path style="fill: hsl(var(--primary))" :d="mdiKeyOutline"/>
          </svg>
          <h4 class="text-sm font-semibold">Account Authorities</h4>
        </div>
        <div class="grid gap-3">
          <div v-for="(key, role) in props.publicKeys" :key="role" class="text-xs">
            <PublicKey :value="key" :role="role" :context="0" />
          </div>
        </div>
      </div>
    </div>
  </div>
</div>
</template>
