<script setup lang="ts">
import { mdiPencilOutline, mdiQrcodeScan } from '@mdi/js';
import { onMounted, ref, computed, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import TokenInformationCard from '@/components/htm/tokens/TokenInformationCard.vue';
import TokenStakeCard from '@/components/htm/tokens/TokenStakeCard.vue';
import TokenTopHoldersCard from '@/components/htm/tokens/TokenTopHoldersCard.vue';
import TokenTransferCard from '@/components/htm/tokens/TokenTransferCard.vue';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { formatAsset, useTokensStore, type CTokenBalanceDisplay, type CTokenDefinitionDisplay, type CTokenUserRanked } from '@/stores/tokens.store';
import { getWax } from '@/stores/wax.store';
import { toastError } from '@/utils/parse-error';

definePageMeta({
  layout: 'htm',
  isPublicPage: true
});

// Router
const route = useRoute();
const router = useRouter();

// Stores
const tokensStore = useTokensStore();

// State
const token = ref<CTokenDefinitionDisplay | null>(null);
const userBalance = ref<CTokenBalanceDisplay | null>(null);
const topHolders = ref<CTokenUserRanked[]>([]);
const isLoading = ref(true);
const isLoadingHolders = ref(false);

// Get Asset num from route parameter
const assetNum = computed(() => Number(route.query['asset-num'] as string));

// Check if user is logged in
const isLoggedIn = computed(() => !!tokensStore.wallet);

// Check if current user is the token owner
const isTokenOwner = computed(() => {
  if (!token.value?.ownerPublicKey || !tokensStore.getUserPublicKey()) return false;
  return token.value.ownerPublicKey === tokensStore.getUserPublicKey();
});

// Load token details
const loadTokenDetails = async () => {
  try {
    // Fetch token details by Asset num
    // First try with just Asset num, if that doesn't work, get all tokens and filter
    token.value = await tokensStore.getTokenByAssetNum(assetNum.value);

    // Load user balance if user is logged in
    if (isLoggedIn.value) {
      try {
        userBalance.value = await tokensStore.getBalanceSingleToken(
          tokensStore.getUserPublicKey()!,
          assetNum.value
        );
      } catch {
        const wax = await getWax();

        userBalance.value = {
          ...token.value,
          balance: 0n,
          displayBalance: formatAsset(wax, '0', token.value.precision || 0, token.value.symbol || token.value.name)
        };
      } // Do not fail when user has no balance for this token
      // XXX: Function above should not fail when user has no balance ^^ API CHANGE
    }
  } catch (error) {
    toastError('Failed to load token details', error);
  }
};

// Refresh all data after a transaction
const refreshData = async () => {
  await Promise.all([
    loadTokenDetails(),
    loadTopHolders()
  ]);
};

// Load top holders
const loadTopHolders = async () => {
  if (!token.value) return;

  try {
    isLoadingHolders.value = true;
    topHolders.value = (await tokensStore.getTopHolders(
      token.value
    )).items;
  } catch (error) {
    toastError('Failed to load top holders', error);
  } finally {
    isLoadingHolders.value = false;
  }
};

const showQRCode = () => {
  router.push({
    path: '/tokens/pos/receive',
    query: { 'asset-num': assetNum.value }
  });
};

watch(isLoggedIn, (newValue) => {
  if (newValue)
    void loadTokenDetails();
});

// Initialize
onMounted(async () => {
  isLoading.value = true;

  // First load token details, then load top holders
  await loadTokenDetails();
  await loadTopHolders();

  isLoading.value = false;
});
</script>

<template>
  <div class="container mx-auto py-4 sm:py-6 space-y-6 px-2 sm:px-4">
    <!-- Header with back button -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
      <NuxtLink to="/tokens/list" class="keychainify-checked">
        <Button
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
              d="M20,11V13H8L13.5,18.5L12.08,19.92L4.16,12L12.08,4.08L13.5,5.5L8,11H20Z"
            />
          </svg>
          <span class="hidden xs:inline">Back to Tokens</span>
          <span class="xs:hidden">Back</span>
        </Button>
      </NuxtLink>
      <div class="flex flex-wrap gap-2">
        <NuxtLink :to="`/tokens/pos/receive?asset-num=${assetNum}`" class="keychainify-checked">
          <Button
            variant="outline"
            size="sm"
            class="gap-2"
            @click="showQRCode"
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
                :d="mdiQrcodeScan"
              />
            </svg>
            <span class="hidden sm:inline">Show QR Code</span>
            <span class="sm:hidden">QR</span>
          </Button>
        </NuxtLink>
        <NuxtLink v-if="isTokenOwner" :to="`/tokens/edit?asset-num=${assetNum}`" class="keychainify-checked">
          <Button
            variant="default"
            size="sm"
            class="gap-2"
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
                :d="mdiPencilOutline"
              />
            </svg>
            <span class="hidden sm:inline">Edit Token</span>
            <span class="sm:hidden">Edit</span>
          </Button>
        </NuxtLink>
      </div>
    </div>

    <!-- Loading State -->
    <div
      v-if="isLoading"
      class="space-y-6"
    >
      <div class="flex items-center gap-4">
        <Skeleton class="h-16 w-16 rounded-full" />
        <div class="space-y-2">
          <Skeleton class="h-8 w-48" />
          <Skeleton class="h-4 w-32" />
        </div>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card
          v-for="i in 3"
          :key="i"
        >
          <CardHeader>
            <Skeleton class="h-5 w-24" />
          </CardHeader>
          <CardContent>
            <Skeleton class="h-8 w-32" />
          </CardContent>
        </Card>
      </div>
    </div>

    <!-- Token Details -->
    <div
      v-else-if="token"
      class="space-y-6"
    >
      <!-- Token Information Card -->
      <TokenInformationCard
        :token="token"
        :user-balance="userBalance"
        :is-logged-in="isLoggedIn"
      />

      <!-- Actions Section -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <!-- Transfer Section -->
        <TokenTransferCard
          :token="token"
          :user-balance="userBalance"
          :is-logged-in="isLoggedIn"
          :asset-num="assetNum"
          @refresh="refreshData"
        />

        <!-- Stake/Unstake Section -->
        <TokenStakeCard
          :token="token"
          :user-balance="userBalance"
          :is-logged-in="isLoggedIn"
          :is-token-owner="isTokenOwner"
          :asset-num="assetNum"
          @refresh="refreshData"
        />

        <!-- Top Holders Section -->
        <TokenTopHoldersCard
          :token="token"
          :top-holders="topHolders"
          :is-loading-holders="isLoadingHolders"
        />
      </div>
    </div>
  </div>
</template>
