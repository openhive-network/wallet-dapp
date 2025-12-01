<script setup lang="ts">
import { Button as CopyButton } from '@/components/ui/copybutton';
import type { CTokenUser } from '@/stores/tokens.store';

// Props
interface Props {
  user: CTokenUser;
}

defineProps<Props>();
</script>

<template>
  <div>
    <h3 class="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
      Account Keys
    </h3>
    <div class="grid grid-cols-1 gap-3">
      <!-- Operational Key -->
      <div class="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
        <div class="flex-1 min-w-0">
          <p class="text-xs text-muted-foreground mb-1">Operational Key</p>
          <code class="text-sm font-mono break-all">{{ user.operationalKey }}</code>
        </div>
        <CopyButton :value="user.operationalKey" />
      </div>

      <!-- Management Key -->
      <div class="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
        <div class="flex-1 min-w-0">
          <p class="text-xs text-muted-foreground mb-1">Management Key</p>
          <code class="text-sm font-mono break-all">{{ user.managementKey }}</code>
        </div>
        <CopyButton :value="user.managementKey" />
      </div>
    </div>
  </div>
</template>
