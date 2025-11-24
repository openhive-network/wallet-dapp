<script setup lang="ts">
import { mdiInformationSlabCircle } from '@mdi/js';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useTokensStore } from '@/stores/tokens.store';

const emit = defineEmits(['goBack', 'showLoginPassword', 'showLoginOtherAccount']);

const tokensStore = useTokensStore();

const isLoggedIntoL2 = computed(() => {
  return !!tokensStore.wallet;
});

const goBack = () => {
  emit('goBack');
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
              :d="mdiInformationSlabCircle"
            />
          </svg>
        </div>

        <div class="space-y-2">
          <h2 class="text-2xl font-semibold text-blue-600 dark:text-blue-400">
            Detected existing HTM Wallet
          </h2>
          <p class="text-muted-foreground">
            You already have an HTM account.
            You can log in using your wallet password or choose to log in to a different account.
          </p>
        </div>

        <div v-if="!isLoggedIntoL2" class="flex flex-col w-full space-y-6">
          <Button
            size="lg"
            class="mt-4 w-full"
            @click="emit('showLoginPassword')"
          >
            Provide your password
          </Button>

          <div class="relative w-full">
            <div class="absolute inset-0 flex items-center">
              <span class="w-full border-t" />
            </div>
            <div class="relative flex justify-center text-xs uppercase">
              <span class="bg-background px-2 text-muted-foreground">
                Or
              </span>
            </div>
          </div>
        </div>

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
          <Button
            size="lg"
            class="mt-4 flex-1"
            @click="emit('showLoginOtherAccount')"
          >
            Log in to other account
          </Button>
        </div>
      </div>
    </CardContent>
  </Card>
</template>
