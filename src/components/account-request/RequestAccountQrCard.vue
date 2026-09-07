<script setup lang="ts">
import { mdiAccountPlusOutline, mdiCellphoneArrowDown, mdiFormTextboxPassword, mdiQrcodeScan, mdiRefresh, mdiShieldCheckOutline } from '@mdi/js';
import { nextTick, ref, watch } from 'vue';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import FeatureElement from '@/components/ui/hive/FeatureElement.vue';
import { Skeleton } from '@/components/ui/skeleton';
import { useAccountRequestQr } from '@/composables/useAccountRequestQr';

const { qrDataUrl, isLoading, hasError, interval, ttlMs, refreshedAt, refresh } = useAccountRequestQr();

const steps = [
  { icon: mdiQrcodeScan, text: 'Scan the code with your phone camera' },
  { icon: mdiFormTextboxPassword, text: 'Pick your account name' },
  { icon: mdiShieldCheckOutline, text: 'Choose how to keep your keys: Google Drive, MetaMask or a password' }
];

// Progress bar shrinking over the lifetime of the currently displayed token
const progress = ref(100);
const progressDurationMs = ref(0);

watch(refreshedAt, async () => {
  progressDurationMs.value = 0;
  progress.value = 100;

  await nextTick();
  requestAnimationFrame(() => {
    progressDurationMs.value = ttlMs.value;
    progress.value = 0;
  });
});
</script>

<template>
  <Card
    data-testid="request-account-card"
    class="w-full max-w-[600px]"
  >
    <CardHeader>
      <CardTitle class="inline-flex items-center justify-between">
        <span>Create a Hive account</span>
        <svg
          width="20"
          height="20"
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
        >
          <path
            style="fill: hsla(var(--foreground) / 80%)"
            :d="mdiAccountPlusOutline"
          />
        </svg>
      </CardTitle>
      <CardDescription class="mr-8">
        Scan this QR code with your phone to create your own Hive account in a few steps.
      </CardDescription>
    </CardHeader>
    <CardContent class="space-y-6">
      <div class="flex flex-col items-center">
        <Alert
          v-if="hasError"
          data-testid="request-account-error"
          variant="destructive"
          class="w-full"
        >
          <AlertTitle>QR code unavailable</AlertTitle>
          <AlertDescription class="space-y-3">
            <p>The code could not be generated. Please try again in a moment.</p>
            <Button
              size="sm"
              variant="outline"
              @click="refresh"
            >
              <svg
                width="16"
                height="16"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                class="mr-2"
              >
                <path
                  style="fill: currentColor"
                  :d="mdiRefresh"
                />
              </svg>
              Try again
            </Button>
          </AlertDescription>
        </Alert>
        <template v-else>
          <div class="bg-white p-3 rounded-lg shadow-sm">
            <img
              v-if="qrDataUrl"
              data-testid="request-account-qr"
              :src="qrDataUrl"
              alt="QR code leading to the account creation page"
              class="w-56 h-56 sm:w-72 sm:h-72 object-contain"
            >
            <Skeleton
              v-else
              data-loading="skeleton"
              class="w-56 h-56 sm:w-72 sm:h-72 rounded-md"
            />
          </div>
          <div class="w-56 sm:w-72 mt-3 space-y-1">
            <div class="h-1 w-full rounded-full bg-muted overflow-hidden">
              <div
                class="h-full bg-primary ease-linear"
                :style="{ width: `${progress}%`, transition: progressDurationMs ? `width ${progressDurationMs}ms linear` : 'none' }"
              />
            </div>
            <p class="text-xs text-muted-foreground text-center">
              <span v-if="isLoading">Generating a fresh code...</span>
              <span v-else>The code refreshes automatically every {{ interval }}s</span>
            </p>
          </div>
        </template>
      </div>
      <div class="border rounded-lg p-4 space-y-3">
        <div class="flex items-center space-x-2">
          <svg
            width="18"
            height="18"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
          >
            <path
              style="fill: hsl(var(--primary))"
              :d="mdiCellphoneArrowDown"
            />
          </svg>
          <span class="text-sm font-semibold">How it works</span>
        </div>
        <FeatureElement
          v-for="step in steps"
          :key="step.text"
          :icon="step.icon"
          :text="step.text"
        />
      </div>
      <p class="text-xs text-muted-foreground text-center">
        The account gets registered on the Hive blockchain by this service - no existing Hive friend is needed.
      </p>
    </CardContent>
  </Card>
</template>
