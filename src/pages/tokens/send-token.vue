<script setup lang="ts">
import { mdiArrowLeft } from '@mdi/js';
import { computed, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { toast } from 'vue-sonner';

import HTMView from '@/components/HTMView.vue';
import TransferDetailsCard from '@/components/TransferDetailsCard.vue';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useSettingsStore } from '@/stores/settings.store';
import { useTokensStore } from '@/stores/tokens.store';
import { useUserStore } from '@/stores/user.store';
import { getWax } from '@/stores/wax.store';
import { toastError } from '@/utils/parse-error';
import type { CtokensAppToken } from '@/utils/wallet/ctokens/api';
import CTokensProvider from '@/utils/wallet/ctokens/signer';

import QRCodeCard from '~/src/components/tokens/QRCodeCard.vue';

// Router
const route = useRoute();
const router = useRouter();

const settingsStore = useSettingsStore();
const tokensStore = useTokensStore();
const userStore = useUserStore();

// State
const token = ref<CtokensAppToken | null>(null);
const isLoading = ref(true);

// Form state
const form = ref({
  nai: '',
  precision: '',
  amount: '',
  memo: ''
});

// Selected token NAI from TokenSelector (used when only 'to' is provided)
const selectedTokenAssetNum = ref<string>('');

// Get NAI and precision from route parameters or form or selected token
const assetNum = computed(() => {
  if (route.query['asset-num']) return route.query['asset-num'] as string;
  if (selectedTokenAssetNum.value) return selectedTokenAssetNum.value;
  return form.value.nai;
});
const precision = computed(() => route.query.precision as string || form.value.precision);
const receiverKey = computed(() => route.query.to as string || CTokensProvider.getOperationalPublicKey());
const queryAmount = computed(() => route.query.amount as string | undefined);
const queryMemo = computed(() => route.query.memo as string | undefined);

// Check if NAI is provided in URL
const hasNaiFromUrl = computed(() => !!route.query.nai);

// Check if we're in receive mode (when 'to' is in query params)
// When 'to' is present, we're actually sending (confirming a transfer request)
const isReceiveMode = computed(() => !!route.query.to);

const htmUserMetadata = ref<{
  displayName: string;
  about?: string;
  name?: string;
  profileImage?: string;
  website?: string;
} | undefined>(undefined);

const fetchHTMUserData = async () => {
  try {
    htmUserMetadata.value = await tokensStore.getCurrentUserMetadata();
  } catch (_error) {
    // toastError('Error fetching HTM user data', error); // TODO: Reformat this code to better handle edge cases...
  }
};

// Check if we should show token selector (when only 'to' is provided)
const shouldShowTokenSelector = computed(() => {
  return isReceiveMode.value && !hasNaiFromUrl.value && isLoggedIn.value;
});

const userOperationalKey = computed(() => CTokensProvider.getOperationalPublicKey());

// Check if user is logged in
const isLoggedIn = computed(() => !!settingsStore.settings.account);

// Receiver display helpers (compact UI)
const receiverDisplayName = computed(() => {
  // In receive mode the recipient is you — prefer parsed user name (L2 if available)
  if (isReceiveMode.value) {
    // userStore.name is a transformed display name if parseUserData ran
    const name = userStore.name || settingsStore.settings.account || userOperationalKey.value || '';
    if (name) return name;
    return 'You';
  }

  // Otherwise prefer explicit name from query if present
  const qName = route.query.toName as string | undefined;
  if (qName && qName.trim()) return qName;

  // Fall back to short key derived from receiverKey
  const rk = receiverKey.value;
  if (!rk) return '';
  return `${rk.slice(0, 6)}…${rk.slice(-4)}`;
});

// Watch selected token NAI changes to load token details
watch(selectedTokenAssetNum, async (newAssetNum, oldAssetNum) => {
  if (newAssetNum && newAssetNum !== oldAssetNum && shouldShowTokenSelector.value) {
    isLoading.value = true;
    // Get precision from the selected token's balance
    const balance = tokensStore.balances.find(b => String(b.asset_num) === newAssetNum);
    if (balance) {
      form.value.precision = balance.precision?.toString() || '';
      form.value.nai = balance.nai!;
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
  // In receive mode (when someone scans QR code), allow viewing without login
  // Login will be required when clicking "Send Token"
  if (!isLoggedIn.value && !isReceiveMode.value) {
    // Only require login immediately in send/generate QR mode
    toast.error('You must be logged in to use this feature');
    return;
  }

  isLoading.value = true;

  // Load user balances if logged in (needed for token selector)
  if (isLoggedIn.value) {
    await tokensStore.loadBalances();
    await fetchHTMUserData();
  }

  // Initialize form with query params
  form.value.nai = route.query.nai as string || '';
  selectedTokenAssetNum.value = route.query['asset-num'] as string || '';
  form.value.precision = route.query.precision as string || '';

  // Initialize form with query params if in receive mode
  if (isReceiveMode.value) {
    form.value.amount = queryAmount.value || '';
    form.value.memo = queryMemo.value || '';
  }

  // Load token details if asset number and precision are available
  if (assetNum.value)
    await loadTokenDetails();

  isLoading.value = false;
});

// If the user logs in after the page mounted (for example after entering password),
// reload balances, HTM user metadata, token details and QR code as needed.
watch(isLoggedIn, async (loggedIn, wasLoggedIn) => {
  // Only act when the user becomes logged in
  if (!loggedIn || wasLoggedIn === loggedIn) return;

  isLoading.value = true;

  try {
    // Load balances and HTM metadata now that we have an authenticated session
    await tokensStore.loadBalances();
    await fetchHTMUserData();

    // If nai/precision available, load token details
    if (assetNum.value && precision.value)
      await loadTokenDetails();
  } catch (e) {
    // swallow - errors are handled inside the helpers (toastError)
    console.error('Error reloading data after login', e);
  } finally {
    isLoading.value = false;
  }
});

// Also watch the tokens store wallet instance - this changes when CTokensProvider is set
// (e.g., user unlocked their HTM wallet). React to that to load HTM-related data.
watch(() => tokensStore.wallet, async (newWallet, oldWallet) => {
  if (!newWallet || newWallet === oldWallet) return;

  isLoading.value = true;

  try {
    await tokensStore.loadBalances();
    await fetchHTMUserData();

    if (assetNum.value && precision.value)
      await loadTokenDetails();
  } catch (e) {
    console.error('Error reloading data after tokensStore.wallet changed', e);
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
        v-else-if="(token && isLoggedIn) || isReceiveMode"
        class="space-y-6"
      >
        <!-- Page Title -->
        <div>
          <h1 class="text-3xl font-bold text-foreground mb-2">
            {{ isReceiveMode ? 'Send Token' : (hasNaiFromUrl ? 'Receive Token' : 'Send/Receive Token') }}
          </h1>
          <p class="text-muted-foreground">
            {{ isReceiveMode ? 'Confirm and send the token transfer.' : (hasNaiFromUrl ? 'Scan the generated QR code and transfer the token.' : 'Enter token details and generate a QR code for transfer.') }}
          </p>
        </div>

        <!-- Transfer Details Card -->
        <TransferDetailsCard
          :is-receive-mode="isReceiveMode"
          :has-nai-from-url="hasNaiFromUrl"
          :should-show-token-selector="shouldShowTokenSelector"
          :receiver-name="htmUserMetadata?.displayName || receiverDisplayName"
          :receiver-key="receiverKey"
          :receiver-avatar="htmUserMetadata?.profileImage"
          :token-data="token"
          :query-amount="queryAmount"
          :query-memo="queryMemo"
          :asset-num="assetNum"
          :precision="precision"
          :selected-token-asset-num="selectedTokenAssetNum"
          @update-selected-token-asset-num="selectedTokenAssetNum = $event"
          @update-amount="form.amount = $event"
          @update-memo="form.memo = $event"
        />

        <!-- QR Code Card (visible when asset number is available) -->
        <QRCodeCard
          v-if="assetNum && !isReceiveMode"
          :asset-num="assetNum"
          :amount="form.amount"
          :memo="form.memo"
        />
      </div>
    </div>
  </HTMView>
</template>
