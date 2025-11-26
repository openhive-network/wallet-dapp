<script setup lang="ts">
import { mdiCheckCircle } from '@mdi/js';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import AddToGoogleWallet from '@/components/wallet/AddToGoogleWallet.vue';
</script>

<template>
  <Card
    class="w-full"
  >
    <CardContent class="pt-6">
      <div class="flex flex-col items-center text-center space-y-6">
        <!-- Success Icon -->
        <div class="w-16 h-16 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center">
          <svg
            width="32"
            height="32"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            class="text-green-600 dark:text-green-400"
          >
            <path
              style="fill: currentColor"
              :d="mdiCheckCircle"
            />
          </svg>
        </div>

        <div class="space-y-2">
          <h2 class="text-2xl font-semibold text-green-600 dark:text-green-400">
            Welcome to HTM!
          </h2>
          <p class="text-muted-foreground">
            You are now successfully logged in to your HTM account. You can manage your tokens, create new ones, and explore all the features available.
          </p>
        </div>

        <!-- Action Button -->
        <div class="flex flex-col gap-4 w-full">
          <NuxtLink
            to="/tokens/my-balance"
            class="w-full mt-4 keychainify-checked"
          >
            <Button
              size="lg"
              class="w-full"
            >
              Go to My Account
            </Button>
          </NuxtLink>
          <AddToGoogleWallet class="mt-2" />
        </div>
      </div>
    </CardContent>
  </Card>
</template>
