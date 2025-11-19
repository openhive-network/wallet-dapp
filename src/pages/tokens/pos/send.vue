<script setup lang="ts">
import { mdiArrowLeft } from '@mdi/js';
import { computed, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { toast } from 'vue-sonner';

import HTMView from '@/components/htm/HTMView.vue';
import QRCodeCard from '@/components/htm/tokens/QRCodeCard.vue';
import SendTransferCard from '@/components/SendTransferCard.vue';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useTokensStore, type CTokenBalanceDisplay } from '@/stores/tokens.store';
import { getWax } from '@/stores/wax.store';
import { toastError } from '@/utils/parse-error';
import type { CtokensAppToken } from '@/utils/wallet/ctokens/api';



// Router
const route = useRoute();
const router = useRouter();

const tokensStore = useTokensStore();

// State
const token = ref<CtokensAppToken | null>(null);
const isLoading = ref(true);

// Form state
const form = ref({
  assetNum: '',
  precision: '',
  amount: '',
  memo: ''
});

// Selected token NAI from TokenSelector (used when no asset-num is provided)
const selectedTokenAssetNum = ref<string>('');

// Get NAI and precision from route parameters or form or selected token
const assetNum = computed(() => {
  if (route.query['asset-num']) return route.query['asset-num'] as string;
  if (selectedTokenAssetNum.value) return selectedTokenAssetNum.value;
  return form.value.assetNum;
});
const precision = computed(() => route.query.precision as string || form.value.precision);

// Check if NAI is provided in URL
const hasNaiFromUrl = computed(() => !!route.query['asset-num']);

// Check if we should show token selector (when no asset-num is provided)
const shouldShowTokenSelector = computed(() => {
  return !hasNaiFromUrl.value && isLoggedIn.value;
});

// Check if user is logged in
const isLoggedIn = computed(() => !!tokensStore.wallet);

// Watch selected token NAI changes to load token details
watch(selectedTokenAssetNum, async (newAssetNum, oldAssetNum) => {
  if (newAssetNum && newAssetNum !== oldAssetNum && shouldShowTokenSelector.value) {
    isLoading.value = true;
    // Get precision from the selected token's balance
    let balance: CTokenBalanceDisplay | undefined;
    for(const storeBalance of tokensStore.fungibleBalances) {
      if (storeBalance.liquid.assetNum === Number(newAssetNum)) {
        balance = storeBalance.liquid;
        break;
      } else if (storeBalance.vesting.assetNum === Number(newAssetNum)) {
        balance = storeBalance.vesting;
        break;
      }
    }
    if (balance) {
      form.value.precision = balance.precision?.toString() || '';
      form.value.assetNum = balance.assetNum!.toString();
      await loadTokenDetails();
    } else
      token.value = null;

    isLoading.value = false;
  }
});

// Load token details
const loadTokenDetails = async () => {
  if (!assetNum.value) return;

  try {
    const wax = await getWax();

    // Fetch token details by NAI
    const params: { 'asset-num': number; precision?: number } = { 'asset-num': Number(assetNum.value) };
    const tokens = await wax.restApi.ctokensApi.tokens(params);

    const remoteToken = tokens && tokens.items && tokens.items.length > 0 ? tokens.items[0] : null;

    if (!remoteToken)
      throw new Error(`Token with asset number ${assetNum.value} not found`);

    token.value = String(remoteToken.liquid?.asset_num) === assetNum.value ? remoteToken.liquid! : String(remoteToken.vesting?.asset_num) === assetNum.value ? remoteToken.vesting! : null;

    if (!token.value)
      throw new Error(`Token with asset number ${assetNum.value} not found`);

    // Update precision if not set from balance
    if (token.value && !form.value.precision)
      form.value.precision = token.value.precision?.toString() || '';
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
  if (!isLoggedIn.value) {
    toast.error('You must be logged in to use this feature');
    return;
  }

  isLoading.value = true;

  // Load user balances (needed for token selector)
  await tokensStore.loadBalances();

  // Initialize form with query params
  form.value.assetNum = route.query['asset-num'] as string || '';
  selectedTokenAssetNum.value = route.query['asset-num'] as string || '';
  form.value.precision = route.query.precision as string || '';

  // Load token details if asset number is available
  if (assetNum.value)
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

    // If nai/precision available, load token details
    if (assetNum.value && precision.value)
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

    if (assetNum.value && precision.value)
      await loadTokenDetails();
  } catch (e) {
    toastError('Error reloading data after tokensStore.wallet changed', e);
  } finally {
    isLoading.value = false;
  }
});
</script>

<template>
  <HTMView>
    <div class="container mx-auto py-4 sm:py-6 space-y-6 px-4 max-w-4xl">
      <!-- Header -->
      <div class="flex items-center justify-between gap-4">
        <Button
          v-if="hasNaiFromUrl || selectedTokenAssetNum"
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

      <!-- Send Form -->
      <div
        v-if="!isLoading"
        class="space-y-6"
      >
        <!-- Page Title -->
        <div>
          <h1 class="text-3xl font-bold text-foreground mb-2">
            {{ hasNaiFromUrl ? 'Receive Token' : 'Receive Token' }}
          </h1>
          <p class="text-muted-foreground">
            {{ hasNaiFromUrl ? 'Generate a QR code for others to scan and send you tokens.' : 'Select a token and generate a QR code for others to scan and send you tokens.' }}
          </p>
        </div>

        <!-- Send Transfer Card -->
        <SendTransferCard
          :has-nai-from-url="hasNaiFromUrl"
          :should-show-token-selector="shouldShowTokenSelector"
          :token-data="token"
          :asset-num="assetNum"
          :precision="precision"
          :selected-token-asset-num="selectedTokenAssetNum"
          @update-selected-token-asset-num="selectedTokenAssetNum = $event"
          @update-amount="form.amount = $event"
          @update-memo="form.memo = $event"
        />

        <!-- QR Code Card (visible when asset number is available) -->
        <QRCodeCard
          v-if="assetNum"
          :asset-num="assetNum"
          :amount="form.amount"
          :memo="form.memo"
        />
      </div>
    </div>
  </HTMView>
</template>
