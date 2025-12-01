<script setup lang="ts">
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

// Props
interface Props {
  metadata: Record<string, unknown>;
}

defineProps<Props>();
</script>

<template>
  <Card v-if="Object.keys(metadata).length > 0">
    <CardHeader>
      <CardTitle>Additional Information</CardTitle>
      <CardDescription>User metadata stored on chain</CardDescription>
    </CardHeader>
    <CardContent>
      <div class="space-y-3">
        <div
          v-for="(value, key) in metadata"
          :key="key"
          class="flex flex-col sm:flex-row sm:items-center justify-between py-3 border-b last:border-0 gap-2"
        >
          <span class="text-sm font-medium text-muted-foreground">{{ key }}</span>
          <span class="font-mono text-sm break-all sm:text-right">{{ value }}</span>
        </div>
      </div>
    </CardContent>
  </Card>
</template>
