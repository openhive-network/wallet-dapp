<script setup lang="ts">
import {
  mdiCurrencyUsd,
  mdiRefresh,
  mdiPlus
} from '@mdi/js';
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';

import HTMTokenCard from '@/components/HTMTokenCard.vue';
import HTMView from '@/components/HTMView.vue';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useSettingsStore } from '@/stores/settings.store';
import type { CTokenDisplay } from '@/stores/tokens.store';
import { getWax } from '@/stores/wax.store';
import { toastError } from '@/utils/parse-error';
import type { CtokensAppToken } from '@/utils/wallet/ctokens/api';
import CTokensProvider from '@/utils/wallet/ctokens/signer';

const router = useRouter();
const settingsStore = useSettingsStore();

// State
const tokensFullList = ref<CTokenDisplay[]>([]);
const isLoading = ref(false);
const currentPage = ref(0);
const hasMorePages = ref(true);

// Get user's public key for filtering
const getUserPublicKey = async (): Promise<string | undefined> => {
  try {
    // First try to get from CTokens provider if logged in
    if (CTokensProvider.isLoggedIn())
      return CTokensProvider.getOperationalPublicKey();

    // If no CTokens wallet, get from account data
    if (settingsStore.account) {
      const wax = await getWax();
      const response = await wax.api.database_api.find_accounts({
        accounts: [settingsStore.account],
        delayed_votes_active: true
      });
      if (response.accounts.length > 0)
        return response.accounts[0].posting.key_auths[0][0]; // Get the first posting key
    }

    return undefined;
  } catch (error) {
    console.error('Failed to get user public key:', error);
    return undefined;
  }
};

// Navigate to token detail page
const viewTokenDetails = (token: CTokenDisplay) => {
  router.push(`/tokens/token?nai=${token.nai}&precision=${token.precision}`);
};

// Load tokens filtered by user's public key
const loadTokens = async (page: number = 1) => {
  try {
    isLoading.value = true;

    const userPublicKey = await getUserPublicKey();
    if (!userPublicKey) {
      toastError('Unable to determine your public key', 'Please make sure you are connected to a wallet');
      return;
    }

    const wax = await getWax();
    const formatAsset = (value: string | bigint, precision: number, symbol?: string): string => {
      const formatted = wax.formatter.formatNumber(value, precision);
      return symbol ? `${formatted} ${symbol}` : formatted;
    };

    // Temporary naive implementation of vesting space check
    const isVesting = (nai: string, precision: number) => (((Number(nai.slice(2, -1)) << 5) | 0x10 | precision) & 0x20) != 0;

    const tokens = await wax.restApi.ctokensApi.registeredTokens({}) as Required<CtokensAppToken>[];

    // Filter tokens by user's public key
    const userTokens = tokens.filter(token => token.owner === userPublicKey);

    if (page === 1)
      tokensFullList.value = [];

    tokensFullList.value.push(...userTokens.map(token => {
      const { name, symbol, description, website, image } = (token.metadata || {}) as Record<string, string>;

      return {
        nai: token.nai,
        isStaked: isVesting(token.nai, token.precision),
        displayMaxSupply: formatAsset(token.max_supply, token.precision, symbol || name),
        ownerPublicKey: token.owner,
        precision: token.precision,
        displayTotalSupply: formatAsset(token.total_supply, token.precision, symbol || name),
        totalSupply: BigInt(token.total_supply),
        maxSupply: BigInt(token.max_supply),
        capped: token.capped,
        othersCanStake: token.others_can_stake,
        othersCanUnstake: token.others_can_unstake,
        isNft: token.is_nft,
        metadata: token.metadata,
        name,
        symbol,
        description,
        website,
        image
      } as CTokenDisplay;
    }));

    hasMorePages.value = userTokens.length === 100; // API returns 100 results per page
    currentPage.value = page;
  } catch (error) {
    toastError('Failed to load tokens', error);
  } finally {
    isLoading.value = false;
  }
};

const loadMore = () => {
  if (!hasMorePages.value || isLoading.value) return;
  void loadTokens(currentPage.value + 1);
};

// Computed
const filteredTokens = computed(() => {
  return tokensFullList.value; // No additional filtering needed since we already filter by owner
});

// Navigate to create token page
const createNewToken = () => {
  router.push('/tokens/create');
};

// Lifecycle
onMounted(() => {
  loadMore();
});
</script>

<template>
  <HTMView>
    <div class="container mx-auto py-6 space-y-6">
      <!-- Header -->
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-3xl font-bold tracking-tight">
            My Custom Tokens
          </h1>
          <p class="text-muted-foreground">
            View your custom tokens on Hive Token Machine
          </p>
        </div>

        <div class="flex gap-2">
          <Button
            variant="outline"
            :disabled="isLoading"
            @click="loadMore"
          >
            <svg
              width="16"
              height="16"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              :class="{ 'animate-spin': isLoading }"
              class="mr-2"
            >
              <path
                style="fill: currentColor"
                :d="mdiRefresh"
              />
            </svg>
            Refresh
          </Button>

          <Button @click="createNewToken">
            <svg
              width="16"
              height="16"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              class="mr-2"
            >
              <path
                style="fill: currentColor"
                :d="mdiPlus"
              />
            </svg>
            Create Token
          </Button>
        </div>
      </div>

      <!-- Loading Skeletons -->
      <div
        v-if="isLoading && tokensFullList.length === 0"
        class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
      >
        <Card
          v-for="i in 9"
          :key="i"
        >
          <CardHeader class="pb-3">
            <div class="flex items-start gap-4">
              <Skeleton class="h-12 w-12 rounded-full" />
              <div class="flex-1 space-y-2">
                <Skeleton class="h-5 w-3/4" />
                <Skeleton class="h-4 w-1/2" />
              </div>
            </div>
          </CardHeader>
          <CardContent class="space-y-3">
            <Skeleton class="h-4 w-full" />
            <Skeleton class="h-4 w-5/6" />
            <div class="pt-3 space-y-2">
              <Skeleton class="h-3 w-full" />
              <Skeleton class="h-3 w-full" />
              <Skeleton class="h-3 w-2/3" />
            </div>
          </CardContent>
        </Card>
      </div>

      <!-- Tokens Grid -->
      <div
        v-else-if="tokensFullList.length > 0"
        class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
      >
        <HTMTokenCard
          v-for="token in filteredTokens"
          :key="token.nai"
          :token="token"
          @click="viewTokenDetails"
        />
      </div>

      <!-- Load More Button -->
      <div
        v-if="tokensFullList.length > 0 && hasMorePages"
        class="text-center pt-4"
      >
        <Button
          variant="outline"
          :disabled="isLoading"
          @click="loadMore"
        >
          <svg
            v-if="isLoading"
            width="16"
            height="16"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            class="mr-2 animate-spin"
          >
            <path
              style="fill: currentColor"
              d="M12,4V2A10,10 0 0,0 2,12H4A8,8 0 0,1 12,4Z"
            />
          </svg>
          {{ isLoading ? 'Loading...' : 'Load More Tokens' }}
        </Button>
      </div>

      <!-- Empty State -->
      <Card v-else-if="tokensFullList.length === 0 && !isLoading">
        <CardContent class="text-center py-12">
          <svg
            width="64"
            height="64"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            class="mx-auto text-muted-foreground mb-4"
          >
            <path
              style="fill: currentColor"
              :d="mdiCurrencyUsd"
            />
          </svg>
          <h3 class="text-lg font-semibold mb-2">
            No tokens created yet
          </h3>
          <p class="text-muted-foreground mb-6">
            Create your first custom token to get started
          </p>
          <Button @click="createNewToken">
            <svg
              width="16"
              height="16"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              class="mr-2"
            >
              <path
                style="fill: currentColor"
                :d="mdiPlus"
              />
            </svg>
            Create Your First Token
          </Button>
        </CardContent>
      </Card>
    </div>
  </HTMView>
</template>
