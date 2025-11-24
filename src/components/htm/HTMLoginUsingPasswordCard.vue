<script setup lang="ts">
import { mdiLockOpen } from '@mdi/js';

import HTMProvidePasswordContent from '@/components/htm/HTMProvidePasswordContent.vue';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

const emit = defineEmits(['goBack', 'success']);

const goBack = () => {
  emit('goBack');
};

const successShow = () => {
  emit('success');
};
</script>

<template>
  <Card
    class="w-full"
  >
    <CardContent class="pt-6">
      <div class="flex flex-col items-center text-center space-y-6">
        <!-- Info Icon -->
        <div class="w-16 h-16 bg-blue-100 dark:bg-blue-900/20 rounded-full flex items-center justify-center">
          <svg
            width="32"
            height="32"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            class="text-blue-600 dark:text-blue-400"
          >
            <path
              style="fill: currentColor"
              :d="mdiLockOpen"
            />
          </svg>
        </div>

        <div class="space-y-2">
          <h2 class="text-2xl font-semibold text-blue-600 dark:text-blue-400">
            Unlock your wallet
          </h2>
          <p class="text-muted-foreground">
            You already have an HTM account.
            Please login using your wallet password to access your tokens and manage your account.
          </p>
        </div>

        <HTMProvidePasswordContent embed @success="successShow()" />

        <!-- Action Button -->
        <div class="flex flex-row gap-4 w-full">
          <Button
            variant="outline"
            size="lg"
            class="mt-4 flex-1"
            @click="goBack()"
          >
            Go Back
          </Button>
        </div>
      </div>
    </CardContent>
  </Card>
</template>
