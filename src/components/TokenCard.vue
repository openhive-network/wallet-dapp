<script setup lang="ts">
import {
  mdiContentCopy,
  mdiEye,
  mdiStar
} from '@mdi/js';
import { toast } from 'vue-sonner';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { copyText } from '@/utils/copy';

interface TokenDefinition {
  nai: string;
  name: string;
  symbol: string;
  description?: string;
  can_stake: boolean;
  initial_supply: string;
  precision: number;
  created_at: string;
  active: boolean;
}

interface Props {
  token: TokenDefinition;
}

defineProps<Props>();

// Copy NAI to clipboard
const copyNAI = async (nai: string) => {
  try {
    copyText(nai);
    toast.success('NAI copied to clipboard');
  } catch (_error) {
    toast.error('Failed to copy NAI');
  }
};

// Format date
const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

// Format number with commas
const formatNumber = (value: string) => {
  const num = parseInt(value);
  return isNaN(num) ? value : num.toLocaleString();
};
</script>

<template>
  <Card class="hover:shadow-md transition-shadow">
    <CardHeader>
      <div class="flex items-start justify-between">
        <div class="space-y-1 flex-1">
          <CardTitle class="text-lg">
            {{ token.name }}
          </CardTitle>
          <CardDescription>
            {{ token.symbol }}
          </CardDescription>
        </div>

        <div class="flex items-center gap-2">
          <span
            v-if="token.can_stake"
            class="inline-flex items-center rounded-md bg-secondary px-2 py-1 text-xs font-medium text-secondary-foreground"
          >
            <svg
              width="12"
              height="12"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              class="mr-1"
            >
              <path
                style="fill: currentColor"
                :d="mdiStar"
              />
            </svg>
            Stakeable
          </span>
        </div>
      </div>
    </CardHeader>

    <CardContent class="space-y-4">
      <!-- Description -->
      <p class="text-sm text-muted-foreground line-clamp-2">
        {{ token.description || 'No description provided' }}
      </p>

      <!-- NAI -->
      <div class="space-y-2">
        <div class="flex items-center justify-between">
          <span class="text-xs font-medium text-muted-foreground">NAI</span>
          <Button
            variant="ghost"
            size="sm"
            class="h-6 px-2"
            @click="copyNAI(token.nai)"
          >
            <svg
              width="12"
              height="12"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
            >
              <path
                style="fill: currentColor"
                :d="mdiContentCopy"
              />
            </svg>
          </Button>
        </div>
        <div class="font-mono text-sm bg-muted rounded px-2 py-1">
          {{ token.nai }}
        </div>
      </div>

      <!-- Token Details -->
      <div class="grid grid-cols-2 gap-4 text-sm">
        <div>
          <span class="text-muted-foreground">Supply:</span>
          <div class="font-medium">
            {{ formatNumber(token.initial_supply) }}
          </div>
        </div>
        <div>
          <span class="text-muted-foreground">Precision:</span>
          <div class="font-medium">
            {{ token.precision }}
          </div>
        </div>
      </div>

      <!-- Created Date -->
      <div class="text-xs text-muted-foreground">
        Created {{ formatDate(token.created_at) }}
      </div>

      <!-- Actions -->
      <div class="flex gap-2 pt-2">
        <Button
          variant="outline"
          size="sm"
          class="flex-1"
        >
          <svg
            width="16"
            height="16"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            class="mr-1"
          >
            <path
              style="fill: currentColor"
              :d="mdiEye"
            />
          </svg>
          View Details
        </Button>
      </div>
    </CardContent>
  </Card>
</template>
