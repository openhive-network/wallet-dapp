<script setup lang="ts">
import { onMounted, ref } from 'vue';

import HTMView from '@/components/HTMView.vue';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { toastError } from '@/utils/parse-error';
import { getWax } from '@/stores/wax.store';
import type { CtokensAppToken } from '@/utils/wallet/ctokens/api';
import { mdiInfinity } from '@mdi/js';

export interface CToken {
  nai: string;
  isStaked: boolean;
  ownerPublicKey: string;
  precision: number;
  displayTotalSupply: string;
  totalSupply: bigint;
  maxSupply: bigint;
  displayMaxSupply: string;
  capped: boolean;
  othersCanStake: boolean;
  othersCanUnstake: boolean;
  isNft: boolean;
  metadata?: Record<string, unknown>;
  // Parsed from the metadata
  name?: string;
  description?: string;
  website?: string;
  image?: string;
}

// State
const tokensFullList = ref<CToken[]>([]);
const isLoading = ref(false);
const currentPage = ref(0);
const hasMorePages = ref(true);

// Get avatar fallback text
const getAvatarFallback = (token: CToken): string => {
  if (token.name) {
    return token.name.slice(0, 2).toUpperCase();
  }
  return token.ownerPublicKey.slice(3, 5).toUpperCase();
};

// Navigate to token detail page (placeholder for now)
const viewTokenDetails = (token: CToken) => {
  // TODO: Navigate to token detail page when created
  // router.push(`/tokens/${token.nai}`);
  console.log('View token details:', token);
};

const loadTokens = async (page: number = 1) => {
  try {
    isLoading.value = true;

    const wax = await getWax();
    const formatAsset = (value: string | bigint, precision: number, name?: string): string => {
      const formatted = wax.formatter.formatNumber(value, precision);

      return name ? `${formatted} ${name}` : formatted;
    };
    // Temporary naive implementation of vesting space check
    const isVesting = (nai: string, precision: number) => (((Number(nai.slice(2, -1)) << 5) | 0x10 | precision) & 0x20) != 0;

    const tokens = await wax.restApi.ctokensApi.registeredTokens({}) as Required<CtokensAppToken>[];

    tokensFullList.value.push(...tokens.map(token => {
      const { name, description, website, image } = (token.metadata || {}) as Record<string, string>;

      return {
        nai: token.nai,
        isStaked: isVesting(token.nai, token.precision),
        displayMaxSupply: formatAsset(token.max_supply, token.precision, name),
        ownerPublicKey: token.owner,
        precision: token.precision,
        displayTotalSupply: formatAsset(token.total_supply, token.precision, name),
        totalSupply: BigInt(token.total_supply),
        maxSupply: BigInt(token.max_supply),
        capped: token.capped,
        othersCanStake: token.others_can_stake,
        othersCanUnstake: token.others_can_unstake,
        isNft: token.is_nft,
        metadata: token.metadata,
        name,
        description,
        website,
        image
      } as CToken;
    }));

    hasMorePages.value = tokens.length === 100; // API returns 100 results per page
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

// Initialize
onMounted(() => {
  loadMore();
});
</script>

<template>
  <HTMView :is-public-page="true">
    <div class="container mx-auto py-6 space-y-6">
      <!-- Header -->
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-3xl font-bold tracking-tight">
            Custom Tokens
          </h1>
          <p class="text-muted-foreground">
            Browse all registered tokens on Hive Token Machine
          </p>
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
        <Card
          v-for="token in tokensFullList"
          :key="token.nai"
          class="hover:shadow-lg transition-all cursor-pointer group"
          @click="viewTokenDetails(token)"
        >
          <CardHeader class="pb-3">
            <div class="flex items-start gap-4">
              <!-- Token Avatar -->
              <Avatar
                size="sm"
                shape="circle"
              >
                <AvatarImage
                  v-if="token.image"
                  :src="token.image"
                  :alt="token.name || 'Token'"
                />
                <AvatarFallback>
                  <svg
                    v-if="!token.image"
                    width="24"
                    height="24"
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    class="text-muted-foreground"
                  >
                    <path
                      style="fill: currentColor"
                      d="M5,3C3.89,3 3,3.89 3,5V19A2,2 0 0,0 5,21H19A2,2 0 0,0 21,19V5C21,3.89 20.1,3 19,3H5M11,7H13V17H11V7Z"
                    />
                  </svg>
                  <span
                    v-else
                    class="text-sm font-semibold"
                  >
                    {{ getAvatarFallback(token) }}
                  </span>
                </AvatarFallback>
              </Avatar>

              <!-- Token Info -->
              <div class="flex-1 min-w-0">
                <CardTitle class="text-lg truncate flex items-center">
                  <span>{{ token.name || 'Unnamed Token' }}</span>
                  <span
                    v-if="token.isStaked"
                    class="ml-2 text-[11px]/[14px] inline-flex items-center rounded-md bg-green-500/10 px-1 font-medium text-green-500 border border-blue-500/20"
                  >
                    staked
                  </span>
                </CardTitle>
                <CardDescription class="text-xs truncate">
                  {{ token.nai }}
                </CardDescription>
              </div>

              <!-- View Icon -->
              <svg
                width="20"
                height="20"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                class="text-muted-foreground group-hover:text-foreground transition-colors flex-shrink-0"
              >
                <path
                  style="fill: currentColor"
                  d="M8.59,16.58L13.17,12L8.59,7.41L10,6L16,12L10,18L8.59,16.58Z"
                />
              </svg>
            </div>
          </CardHeader>

          <CardContent class="space-y-4">
            <!-- Description -->
            <p
              v-if="token.description"
              class="text-sm text-muted-foreground line-clamp-2 min-h-[2.5rem]"
            >
              {{ token.description }}
            </p>
            <p
              v-else
              class="text-sm text-muted-foreground italic min-h-[2.5rem]"
            >
              No description provided
            </p>

            <!-- Token Properties -->
            <div class="space-y-2 text-sm">
              <!-- Supply Info -->
              <div class="flex items-center justify-between">
                <span class="text-muted-foreground">Total Supply:</span>
                <span class="font-semibold">
                  {{ token.displayTotalSupply }}
                </span>
              </div>

              <div class="flex items-center justify-between">
                <span class="text-muted-foreground">Max Supply:</span>
                <span class="font-semibold flex items-center gap-1">
                  <template v-if="token.capped">
                    {{ token.displayMaxSupply }}
                  </template>
                  <template v-else>
                    <svg
                      width="16"
                      height="16"
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                    >
                      <path
                        style="fill: currentColor"
                        :d="mdiInfinity"
                      />
                    </svg>
                    Unlimited
                  </template>
                </span>
              </div>

              <div class="flex items-center justify-between">
                <span class="text-muted-foreground">Precision:</span>
                <span class="font-semibold">{{ token.precision }}</span>
              </div>
            </div>

            <!-- Token Badges -->
            <div class="flex flex-wrap gap-2 pt-2">
              <span
                v-if="token.isNft"
                class="inline-flex items-center rounded-md bg-purple-500/10 px-2 py-1 text-xs font-medium text-purple-500 border border-purple-500/20"
              >
                NFT
              </span>
              <span
                v-if="token.othersCanStake"
                class="inline-flex items-center rounded-md bg-green-500/10 px-2 py-1 text-xs font-medium text-green-500 border border-green-500/20"
              >
                <svg
                  width="12"
                  height="12"
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  class="mr-1"
                >
                  <path
                    style="fill: currentColor"
                    d="M12,17.27L18.18,21L16.54,13.97L22,9.24L14.81,8.62L12,2L9.19,8.62L2,9.24L7.45,13.97L5.82,21L12,17.27Z"
                  />
                </svg>
                Stakeable
              </span>
              <span
                v-if="token.othersCanUnstake"
                class="inline-flex items-center rounded-md bg-blue-500/10 px-2 py-1 text-xs font-medium text-blue-500 border border-blue-500/20"
              >
                <svg
                  width="12"
                  height="12"
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  class="mr-1"
                >
                  <path
                    style="fill: currentColor"
                    d="M13,9V3.5L18.5,9M6,2C4.89,2 4,2.89 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2H6Z"
                  />
                </svg>
                Unstakeable
              </span>
              <span
                v-if="!token.capped"
                class="inline-flex items-center rounded-md bg-orange-500/10 px-2 py-1 text-xs font-medium text-orange-500 border border-orange-500/20"
              >
                <svg
                  class="mr-1"
                  width="16"
                  height="16"
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                >
                  <path
                    style="fill: currentColor"
                    :d="mdiInfinity"
                  />
                </svg>
                Uncapped
              </span>
            </div>

            <!-- Owner -->
            <div class="pt-2 border-t">
              <div class="text-xs text-muted-foreground">
                Owner:
                <span class="font-mono text-foreground">
                  {{ token.ownerPublicKey.slice(0, 8) }}...{{ token.ownerPublicKey.slice(-6) }}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
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
              d="M5,3C3.89,3 3,3.89 3,5V19A2,2 0 0,0 5,21H19A2,2 0 0,0 21,19V5C21,3.89 20.1,3 19,3H5M11,7H13V17H11V7Z"
            />
          </svg>
          <h3 class="text-lg font-semibold mb-2">
            No Tokens Found
          </h3>
          <p class="text-muted-foreground">
            There are no registered tokens available at the moment.
          </p>
        </CardContent>
      </Card>
    </div>
  </HTMView>
</template>
