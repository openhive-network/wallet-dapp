<script setup lang="ts">
import { mdiArrowLeft } from '@mdi/js';
import { computed, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import QRCodeCard from '@/components/htm/tokens/QRCodeCard.vue';
import SendTransferCard from '@/components/SendTransferCard.vue';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useTokensStore, type CTokenDisplayBase } from '@/stores/tokens.store';
import { toastError } from '@/utils/parse-error';

definePageMeta({
  layout: 'htm'
});

// Router
const route = useRoute();
const router = useRouter();

const tokensStore = useTokensStore();

// State
const token = ref<CTokenDisplayBase | null>(null);
const isLoading = ref(true);

// Form state
const form = ref({
  amount: '',
  memo: ''
});

// Get Asset num from route parameters or selected token
const assetNum = computed(() => {
  if (route.query['asset-num']) return Number(route.query['asset-num']);
  return token.value?.assetNum || null;
});

// Check if user is logged in
const isLoggedIn = computed(() => !!tokensStore.wallet);

// Handle token update from SendTransferCard
const handleTokenUpdate = (newToken: CTokenDisplayBase | undefined) => {
  token.value = newToken || null;
};

// Load token details
const loadTokenDetails = async () => {
  if (!assetNum.value) return;

  try {
    // Fetch token details by Asset num
    const tokens = await tokensStore.getTokenByAssetNum(Number(assetNum.value));

    token.value = tokens;

    if (!token.value)
      throw new Error(`Token with asset number ${assetNum.value} not found`);
  } catch (error) {
    toastError('Failed to load token details', error);
    router.push('/tokens/list');
  }
};

// Navigate back to token detail
const goBack = () => {
  router.push({
    path: '/tokens/token',
    query: { 'asset-num': assetNum.value }
  });
};

// Initialize
onMounted(async () => {
  // Require login for send/generate QR mode
  if (!isLoggedIn.value)
    return;


  isLoading.value = true;

  // Load user balances (needed for token selector)
  await tokensStore.loadBalances();

  // Load token details if asset number is available from URL
  if (route.query['asset-num'])
    await loadTokenDetails();

  isLoading.value = false;
});

// If the user logs in after the page mounted (for example after entering password),
// reload balances and token details
watch(isLoggedIn, async (loggedIn, wasLoggedIn) => {
  // Only act when the user becomes logged in
  if (!loggedIn || wasLoggedIn === loggedIn) return;

  isLoading.value = true;

  try {
    // Load balances now that we have an authenticated session
    await tokensStore.loadBalances();

    // If asset-num available from URL, load token details
    if (route.query['asset-num'])
      await loadTokenDetails();
  } catch (e) {
    toastError('Error reloading data after login', e);
  } finally {
    isLoading.value = false;
  }
});

// Also watch the tokens store wallet instance - this changes when CTokensProvider is set
watch(() => tokensStore.wallet, async (newWallet, oldWallet) => {
  if (!newWallet || newWallet === oldWallet) return;

  isLoading.value = true;

  try {
    await tokensStore.loadBalances();

    if (route.query['asset-num'])
      await loadTokenDetails();
  } catch (e) {
    toastError('Error reloading data after tokensStore.wallet changed', e);
  } finally {
    isLoading.value = false;
  }
});
</script>

<template>
  <div class="container mx-auto py-4 sm:py-6 space-y-6 px-4 max-w-4xl">
    <!-- Header -->
    <div class="flex items-center justify-between gap-4">
      <NuxtLink v-if="token" :to="`/tokens/token?asset-num=${token!.assetNum}`" class="keychainify-checked">
        <Button
          variant="ghost"
          size="sm"
          class="gap-2 hover:bg-accent"
          @click="goBack"
        >
          <svg
            width="16"
            height="16"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            class="flex-shrink-0"
          >
            <path
              style="fill: currentColor"
              :d="mdiArrowLeft"
            />
          </svg>
          Back to Token
        </Button>
      </NuxtLink>
    </div>

    <!-- Loading State -->
    <div
      v-if="isLoading"
      class="space-y-6"
    >
      <Card>
        <CardHeader>
          <Skeleton class="h-8 w-48" />
          <Skeleton class="h-4 w-64" />
        </CardHeader>
        <CardContent class="space-y-4">
          <Skeleton class="h-10 w-full" />
          <Skeleton class="h-10 w-full" />
          <Skeleton class="h-24 w-full" />
        </CardContent>
      </Card>
    </div>

    <!-- Receive Form -->
    <div
      v-if="!isLoading"
      class="space-y-6"
    >
      <!-- Page Title -->
      <div>
        <h1 class="text-3xl font-bold text-foreground mb-2">
          Generate QR Code
        </h1>
        <p class="text-muted-foreground">
          Generate a QR code for others to scan and send you tokens.
        </p>
      </div>

      <!-- Send Transfer Card -->
      <SendTransferCard
        :token="token || undefined"
        @update-token="handleTokenUpdate"
        @update-amount="form.amount = $event"
        @update-memo="form.memo = $event"
      />

      <!-- QR Code Card (visible when asset number is available) -->
      <QRCodeCard
        v-if="assetNum"
        :key="assetNum"
        :asset-num="assetNum"
        :amount="form.amount"
        :memo="form.memo"
      />
    </div>
  </div>
</template>
