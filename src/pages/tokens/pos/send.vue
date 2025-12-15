<script setup lang="ts">
import { mdiArrowLeft } from '@mdi/js';
import { computed, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import ReceiveTransferCard from '@/components/ReceiveTransferCard.vue';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useTokensStore, type CTokenDefinitionDisplay } from '@/stores/tokens.store';
import { toastError } from '@/utils/parse-error';

definePageMeta({
  layout: 'htm',
  isPublicPage: true
});

// Router
const route = useRoute();
const router = useRouter();

const tokensStore = useTokensStore();

// State
const token = ref<CTokenDefinitionDisplay | undefined>(undefined);
const isLoading = ref(true);

// Get parameters from route query
const assetNum = computed(() => Number(route.query['asset-num']));
const receiverKey = computed(() => route.query.to as string || tokensStore.getUserPublicKey());
const queryAmount = computed(() => route.query.amount as string | undefined);
const queryMemo = computed(() => route.query.memo as string | undefined);

// Load token details
const loadTokenDetails = async () => {
  if (!assetNum.value) return;

  try {
    token.value = await tokensStore.getTokenByAssetNum(assetNum.value);
  } catch (error) {
    toastError('Failed to load token details', error);
    router.push('/tokens/list');
  }
};

// Initialize
onMounted(async () => {
  // Allow viewing without login, but login will be required when clicking "Send Token"

  isLoading.value = true;

  // Load token details if asset number is available
  if (assetNum.value)
    await loadTokenDetails();

  isLoading.value = false;
});

// Also watch the tokens store wallet instance
watch(() => tokensStore.wallet, async (newWallet, oldWallet) => {
  if (!newWallet || newWallet === oldWallet) return;

  isLoading.value = true;

  try {
    if (assetNum.value)
      await loadTokenDetails();
  } catch (e) {
    toastError('Error reloading data after tokensStore.wallet changed', e);
  } finally {
    isLoading.value = false;
  }
});
</script>

<template>
  <div class="container mx-auto py-4 sm:py-6 space-y-6 px-2 sm:px-4 max-w-4xl">
    <!-- Header -->
    <div class="flex items-center justify-between gap-4">
      <NuxtLink :to="`/tokens/token?asset-num=${assetNum}`" class="keychainify-checked">
        <Button
          v-if="assetNum"
          variant="ghost"
          size="sm"
          class="gap-2 hover:bg-accent"
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

    <!-- Send Token Form (from QR scan) -->
    <div
      v-if="!isLoading"
      class="space-y-6"
    >
      <!-- Page Title -->
      <div>
        <h1 class="text-2xl sm:text-3xl font-bold text-foreground mb-2">
          Send Token
        </h1>
        <p class="text-muted-foreground">
          Confirm and send the token transfer.
        </p>
      </div>

      <!-- Receive Transfer Card -->
      <ReceiveTransferCard
        :receiver-key="receiverKey"
        :token-data="token"
        :query-amount="queryAmount"
        :query-memo="queryMemo"
        :asset-num="assetNum"
      />
    </div>
  </div>
</template>
