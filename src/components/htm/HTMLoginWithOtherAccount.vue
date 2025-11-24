<script setup lang="ts">
import { mdiLockOpen } from '@mdi/js';

import HTMLoginContent from '@/components/htm/HTMLoginContent.vue';
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
      <div class="flex flex-col items-center space-y-6">
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

        <div class="space-y-2 text-center">
          <h2 class="text-2xl font-semibold text-blue-600 dark:text-blue-400">
            Log in to your HTM account
          </h2>
          <p class="text-muted-foreground">
            You already have an HTM account.
            Provide your credentials to import them to the underlying wallet and access your tokens and manage your account.
          </p>
        </div>

        <HTMLoginContent :show-steps="false" @setaccount="successShow()" />

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
