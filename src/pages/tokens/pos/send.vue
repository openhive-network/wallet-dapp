<script setup lang="ts">
import { mdiArrowLeft } from '@mdi/js';
import { computed, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import HTMView from '@/components/htm/HTMView.vue';
import ReceiveTransferCard from '@/components/ReceiveTransferCard.vue';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useSettingsStore } from '@/stores/settings.store';
import { useTokensStore, type CTokenDefinitionDisplay } from '@/stores/tokens.store';
import { useUserStore } from '@/stores/user.store';
import { toastError } from '@/utils/parse-error';
import CTokensProvider from '@/utils/wallet/ctokens/signer';

// Router
const route = useRoute();
const router = useRouter();

const settingsStore = useSettingsStore();
const tokensStore = useTokensStore();
const userStore = useUserStore();

// State
const token = ref<CTokenDefinitionDisplay | undefined>(undefined);
const isLoading = ref(true);

// Get parameters from route query
const assetNum = computed(() => Number(route.query['asset-num']));
const receiverKey = computed(() => route.query.to as string || CTokensProvider.getOperationalPublicKey());
const queryAmount = computed(() => route.query.amount as string | undefined);
const queryMemo = computed(() => route.query.memo as string | undefined);

const userOperationalKey = computed(() => CTokensProvider.getOperationalPublicKey());

// Check if user is logged in
const isLoggedIn = computed(() => !!tokensStore.wallet);

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
  } catch (_error) {}
};

// Receiver display helpers
const receiverDisplayName = computed(() => {
  // The recipient is you — prefer parsed user name (L2 if available)
  const name = userStore.name || settingsStore.settings.account || userOperationalKey.value || '';
  if (name) return name;
  return 'You';
});

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

// Navigate back to token detail
const goBack = () => {
  router.push({
    path: '/tokens/token',
    query: { 'asset-num': assetNum.value }
  });
};

// Initialize
onMounted(async () => {
  // Allow viewing without login, but login will be required when clicking "Send Token"

  isLoading.value = true;

  // Load user balances if logged in
  if (isLoggedIn.value) {
    await tokensStore.loadBalances();
    await fetchHTMUserData();
  }

  // Load token details if asset number is available
  if (assetNum.value)
    await loadTokenDetails();

  isLoading.value = false;
});

// If the user logs in after the page mounted, reload balances, HTM user metadata, and token details
watch(isLoggedIn, async (loggedIn, wasLoggedIn) => {
  // Only act when the user becomes logged in
  if (!loggedIn || wasLoggedIn === loggedIn) return;

  isLoading.value = true;

  try {
    await tokensStore.loadBalances();
    await fetchHTMUserData();

    if (assetNum.value)
      await loadTokenDetails();
  } catch (e) {
    toastError('Error reloading data after login', e);
  } finally {
    isLoading.value = false;
  }
});

// Also watch the tokens store wallet instance
watch(() => tokensStore.wallet, async (newWallet, oldWallet) => {
  if (!newWallet || newWallet === oldWallet) return;

  isLoading.value = true;

  try {
    await tokensStore.loadBalances();
    await fetchHTMUserData();

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
  <HTMView>
    <div class="container mx-auto py-4 sm:py-6 space-y-6 px-4 max-w-4xl">
      <!-- Header -->
      <div class="flex items-center justify-between gap-4">
        <Button
          v-if="assetNum"
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

      <!-- Send Token Form (from QR scan) -->
      <div
        v-if="!isLoading"
        class="space-y-6"
      >
        <!-- Page Title -->
        <div>
          <h1 class="text-3xl font-bold text-foreground mb-2">
            Send Token
          </h1>
          <p class="text-muted-foreground">
            Confirm and send the token transfer.
          </p>
        </div>

        <!-- Receive Transfer Card -->
        <ReceiveTransferCard
          :receiver-name="htmUserMetadata?.displayName || receiverDisplayName"
          :receiver-key="receiverKey"
          :receiver-avatar="htmUserMetadata?.profileImage"
          :token-data="token"
          :query-amount="queryAmount"
          :query-memo="queryMemo"
          :asset-num="assetNum"
        />
      </div>
    </div>
  </HTMView>
</template>
