<script setup lang="ts">
import {
  mdiRefresh,
  mdiAccount,
  mdiArrowUp,
  mdiArrowDown,
  mdiPlusCircle,
  mdiWallet,
  mdiImageMultiple,
  mdiStar
} from '@mdi/js';
import type { htm_operation } from '@mtyszczak-cargo/htm';
import { onMounted, ref } from 'vue';

import { TokenAmountInput } from '@/components/htm/amount';
import HTMTokenBalancesTable from '@/components/htm/HTMTokenBalancesTable.vue';
import HTMView from '@/components/htm/HTMView.vue';
import TokenTransferCard from '@/components/htm/tokens/TokenTransferCard.vue';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Pagination } from '@/components/ui/pagination';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import AddToGoogleWallet from '@/components/wallet/AddToGoogleWallet.vue';
import { useFavoritesStore } from '@/stores/favorites.store';
import { useTokensStore, type CTokenBalanceDisplay, type CTokenPairBalanceDefinition, type TokenStoreApiResponse, type CTokenDefinitionDisplay } from '@/stores/tokens.store';
import { toastError } from '@/utils/parse-error';
import { waitForTransactionStatus } from '@/utils/transaction-status';

const tokensStore = useTokensStore();
const favoritesStore = useFavoritesStore();

// State
const isLoading = ref(false);
const searchQuery = ref('');

// Transfer dialog state
const isTransferDialogOpen = ref(false);
const selectedTokenForTransfer = ref<CTokenBalanceDisplay | null>(null);
const selectedTokenDefinition = ref<CTokenDefinitionDisplay | null>(null);
const isLoadingTokenDefinition = ref(false);

// Transform dialog state
const isTransformDialogOpen = ref(false);
const transformAmount = ref('');
const transformDirection = ref<'liquid-to-staked' | 'staked-to-liquid'>('liquid-to-staked');
const selectedToken = ref<CTokenBalanceDisplay | null>(null);
const isTransformLoading = ref(false);

// Account statistics
const createdTokensCount = ref(0);
const ownedTokensCount = ref(0);
const nftCollectionsCount = ref(0);
const stakedTokensCount = ref(0);

const fetchedBalances = ref<TokenStoreApiResponse<CTokenPairBalanceDefinition> | null>(null);

// Helper function to format count with >100, >60 etc
const formatCount = (count: number): string => {
  if (count > 100) {
    const rounded = Math.floor(count / 10) * 10;
    return `>${rounded}`;
  }
  return count.toString();
};

const loadAccountBalances = async (page = 1) => {
  try {
    isLoading.value = true;

    const [createdTokens, balances] = await Promise.all([
      tokensStore.loadTokens(1, tokensStore.getUserPublicKey()!),
      tokensStore.loadBalances(page)
    ]);
    createdTokensCount.value = createdTokens.total;

    ownedTokensCount.value = balances.total;

    fetchedBalances.value = balances;

    // Get NFT collections (created NFT tokens)
    nftCollectionsCount.value = 0; // TOOD: Implement NFTs

    // Get staked tokens (tokens with vesting bit set)
    stakedTokensCount.value = 0; // TODO: Implement staked tokens I own
  } catch (error) {
    toastError('Failed to load account balances', error);
  } finally {
    isLoading.value = false;
  }
};

// Load more items
const loadMoreItems = () => {
  void loadAccountBalances(fetchedBalances.value!.page + 1);
};

const handlePageChange = (page: number) => {
  if (isLoading.value) return;
  void loadAccountBalances(page);
};

const openTransferDialog = async (balance: CTokenBalanceDisplay) => {
  if (balance.isStaked) {
    toastError('No liquid balance available for transfer');
    return;
  }

  selectedTokenForTransfer.value = balance;
  isTransferDialogOpen.value = true;

  // Fetch full token definition
  try {
    isLoadingTokenDefinition.value = true;
    selectedTokenDefinition.value = await tokensStore.getTokenByAssetNum(balance.assetNum);
  } catch (error) {
    toastError('Failed to load token details', error);
    isTransferDialogOpen.value = false;
  } finally {
    isLoadingTokenDefinition.value = false;
  }
};

const handleTransferComplete = async () => {
  isTransferDialogOpen.value = false;
  await loadAccountBalances();
};



const openTransformDialog = (balance: CTokenBalanceDisplay) => {
  selectedToken.value = balance;
  transformDirection.value = balance.isStaked ? 'staked-to-liquid' : 'liquid-to-staked';
  transformAmount.value = '';
  isTransformDialogOpen.value = true;
};

const transformTokens = async () => {
  if (!selectedToken.value || !transformAmount.value) {
    toastError('Please enter an amount');
    return;
  }

  try {
    isTransformLoading.value = true;

    // Wait for transaction status
    await waitForTransactionStatus(
      () => ([{
        token_transform_operation: {
          amount: {
            amount: transformAmount.value,
            nai: selectedToken.value!.nai!,
            precision: selectedToken.value!.precision!
          },
          holder: tokensStore.getUserPublicKey()!
        }
      } satisfies htm_operation]),
      transformDirection.value === 'liquid-to-staked' ? 'Stake' : 'Unstake'
    );

    // Refresh balances on success
    await loadAccountBalances();
    isTransformDialogOpen.value = false;
  } catch (error) {
    toastError('Failed to transform tokens', error);
  } finally {
    isTransformLoading.value = false;
  }
};

// Set max transform amount - use raw amount without precision formatting
const setMaxTransformAmount = async () => {
  if (!selectedToken.value) return;

  transformAmount.value = String(selectedToken.value.balance);
};

// Initialize
onMounted(() => {
  loadAccountBalances();
});
</script>

<template>
  <HTMView>
    <div class="container mx-auto py-6 space-y-6">
      <!-- Header -->
      <div class="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 class="text-3xl font-bold tracking-tight">
            Account Balances
          </h1>
          <p class="text-muted-foreground">
            Manage your custom token balances, transfers, and staking on Hive Token Machine
          </p>
        </div>

        <div class="flex items-center gap-2">
          <Button
            variant="outline"
            :disabled="isLoading"
            @click="loadAccountBalances()"
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
            Refresh
          </Button>
          <AddToGoogleWallet />
        </div>
      </div>

      <!-- Summary Cards -->
      <div class="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <NuxtLink
          to="/tokens/list?mytokens=1"
          class="keychainify-checked"
        >
          <Card class="cursor-pointer hover:bg-accent/50 transition-colors h-full">
            <CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle class="text-sm font-medium">
                Created Tokens
              </CardTitle>
              <svg
                width="16"
                height="16"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                class="text-muted-foreground"
              >
                <path
                  style="fill: currentColor"
                  :d="mdiPlusCircle"
                />
              </svg>
            </CardHeader>
            <CardContent>
              <div class="text-2xl font-bold">
                {{ formatCount(createdTokensCount) }}
              </div>
              <p class="text-xs text-muted-foreground">
                Tokens you've created
              </p>
            </CardContent>
          </Card>
        </NuxtLink>

        <Card>
          <CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle class="text-sm font-medium">
              Owned Tokens
            </CardTitle>
            <svg
              width="16"
              height="16"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              class="text-muted-foreground"
            >
              <path
                style="fill: currentColor"
                :d="mdiWallet"
              />
            </svg>
          </CardHeader>
          <CardContent>
            <div class="text-2xl font-bold">
              {{ formatCount(ownedTokensCount) }}
            </div>
            <p class="text-xs text-muted-foreground">
              Tokens in your balance
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle class="text-sm font-medium">
              NFT Collections
            </CardTitle>
            <svg
              width="16"
              height="16"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              class="text-muted-foreground"
            >
              <path
                style="fill: currentColor"
                :d="mdiImageMultiple"
              />
            </svg>
          </CardHeader>
          <CardContent>
            <div class="text-2xl font-bold">
              {{ formatCount(nftCollectionsCount) }}
            </div>
            <p class="text-xs text-muted-foreground">
              NFT collections created
            </p>
          </CardContent>
        </Card>

        <NuxtLink
          to="/tokens/users/favorites"
          class="keychainify-checked"
        >
          <Card class="cursor-pointer hover:bg-accent/50 transition-colors h-full">
            <CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle class="text-sm font-medium">
                Favorite Accounts
              </CardTitle>
              <svg
                width="16"
                height="16"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                class="text-muted-foreground"
              >
                <path
                  style="fill: currentColor"
                  :d="mdiStar"
                />
              </svg>
            </CardHeader>
            <CardContent>
              <div class="text-2xl font-bold">
                {{ formatCount(favoritesStore.favoriteAccountsCount) }}
              </div>
              <p class="text-xs text-muted-foreground">
                Quick access to saved accounts
              </p>
            </CardContent>
          </Card>
        </NuxtLink>
      </div>

      <!-- Search -->
      <div class="flex items-center gap-4">
        <div class="flex-1">
          <TooltipProvider
            :delay-duration="200"
            disable-hoverable-content
          >
            <Tooltip>
              <TooltipTrigger class="max-w-sm w-full">
                <Input
                  v-model="searchQuery"
                  placeholder="Search tokens by symbol, name, or Asset num..."
                  class="w-full"
                  disabled
                />
              </TooltipTrigger>
              <TooltipContent>
                <p>Search not available yet</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>

      <!-- Loading State -->
      <div
        v-if="tokensStore.isLoading"
        class="space-y-4"
      >
        <Card
          v-for="i in 3"
          :key="i"
        >
          <CardHeader>
            <div class="flex items-center justify-between">
              <div class="space-y-2">
                <Skeleton class="h-4 w-[250px]" />
                <Skeleton class="h-3 w-[200px]" />
              </div>
              <Skeleton class="h-8 w-8 rounded-full" />
            </div>
          </CardHeader>
          <CardContent>
            <div class="grid grid-cols-3 gap-4">
              <div class="space-y-2">
                <Skeleton class="h-3 w-[100px]" />
                <Skeleton class="h-6 w-[80px]" />
              </div>
              <div class="space-y-2">
                <Skeleton class="h-3 w-[100px]" />
                <Skeleton class="h-6 w-[80px]" />
              </div>
              <div class="space-y-2">
                <Skeleton class="h-3 w-[100px]" />
                <Skeleton class="h-6 w-[80px]" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <!-- Balances Table -->
      <div
        v-else-if="fetchedBalances && fetchedBalances.items.length > 0"
        class="space-y-4"
      >
        <HTMTokenBalancesTable
          :balances="fetchedBalances.items"
          :show-actions="true"
          @transfer="openTransferDialog"
          @stake="openTransformDialog"
          @unstake="openTransformDialog"
        />

        <!-- Pagination -->
        <div v-if="fetchedBalances.items.length > 0" class="flex justify-center pt-4">
          <Pagination
            :current-page="fetchedBalances.page"
            :total-pages="fetchedBalances.pages"
            :loading="isLoading"
            @page-change="handlePageChange"
          />
        </div>

        <!-- Load More Button (kept as alternative if needed) -->
        <div
          v-else-if="fetchedBalances.hasMore && fetchedBalances.pages <= 1"
          class="flex justify-center pt-4"
        >
          <Button
            variant="outline"
            size="lg"
            @click="loadMoreItems"
          >
            Load More
            <span class="ml-2 text-muted-foreground">
              ({{ fetchedBalances.page }} / {{ fetchedBalances.pages }})
            </span>
          </Button>
        </div>
      </div>

      <!-- Empty State -->
      <div
        v-else
        class="text-center py-12"
      >
        <svg
          width="48"
          height="48"
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          class="mx-auto text-muted-foreground mb-4"
        >
          <path
            style="fill: currentColor"
            :d="mdiAccount"
          />
        </svg>
        <h3 class="text-lg font-semibold mb-2">
          No token balances found
        </h3>
        <p class="text-muted-foreground mb-4">
          {{ searchQuery ? 'No tokens match your search criteria' : 'You don\'t have any token balances yet' }}
        </p>
        <Button
          v-if="!searchQuery"
          @click="loadAccountBalances()"
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
          Refresh Balances
        </Button>
      </div>

      <!-- Transfer Dialog -->
      <Dialog v-model:open="isTransferDialogOpen">
        <DialogContent class="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Transfer {{ selectedTokenForTransfer?.name || 'Token' }}</DialogTitle>
            <DialogDescription>
              Send {{ selectedTokenForTransfer?.symbol || selectedTokenForTransfer?.name }} tokens to another account
            </DialogDescription>
          </DialogHeader>

          <div v-if="isLoadingTokenDefinition" class="mt-4 p-8">
            <Skeleton class="h-64 w-full" />
          </div>

          <div v-else-if="selectedTokenDefinition" class="mt-4">
            <TokenTransferCard
              :token="selectedTokenDefinition"
              :user-balance="selectedTokenForTransfer"
              :is-logged-in="true"
              :asset-num="selectedTokenDefinition.assetNum"
              @refresh="handleTransferComplete"
            />
          </div>
        </DialogContent>
      </Dialog>

      <!-- Transform Dialog -->
      <Dialog v-model:open="isTransformDialogOpen">
        <DialogContent class="sm:max-w-[425px]">
          <DialogHeader>
            <div class="flex items-center gap-3 mb-2">
              <div class="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden">
                <img
                  v-if="selectedToken && selectedToken.image"
                  :src="selectedToken.image"
                  :alt="selectedToken.symbol"
                >
                <span
                  v-else
                  class="text-base font-medium text-primary"
                >
                  {{ selectedToken ? selectedToken.symbol!.charAt(0).toUpperCase() : '' }}
                </span>
              </div>
              <DialogTitle>
                {{ transformDirection === 'liquid-to-staked' ? 'Stake' : 'Unstake' }} {{ selectedToken ? selectedToken.name : '' }}
              </DialogTitle>
            </div>
            <DialogDescription>
              {{ transformDirection === 'liquid-to-staked'
                ? `Stake tokens to earn rewards. Available: ${selectedToken ? selectedToken.displayBalance : '0'} ${selectedToken ? selectedToken.symbol : ''}`
                : `Unstake tokens to make them liquid. Available: ${selectedToken ? selectedToken.displayBalance : '0'} ${selectedToken ? selectedToken.symbol : ''}`
              }}
            </DialogDescription>
          </DialogHeader>

          <div class="grid gap-4 py-4">
            <TokenAmountInput
              v-if="selectedToken"
              v-model="transformAmount"
              variant="explicit"
              :token="selectedToken"
              :disabled="isTransformLoading"
              :available-balance="selectedToken.displayBalance"
              @max="setMaxTransformAmount"
            />
          </div>

          <div class="flex justify-end gap-2">
            <Button
              variant="outline"
              @click="isTransformDialogOpen = false"
            >
              Cancel
            </Button>
            <Button
              :disabled="isTransformLoading || !transformAmount"
              @click="transformTokens"
            >
              <svg
                v-if="isTransformLoading"
                width="16"
                height="16"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                class="mr-2 animate-spin"
              >
                <path
                  style="fill: currentColor"
                  :d="mdiRefresh"
                />
              </svg>
              <svg
                v-else
                width="16"
                height="16"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                class="mr-2"
              >
                <path
                  style="fill: currentColor"
                  :d="transformDirection === 'liquid-to-staked' ? mdiArrowUp : mdiArrowDown"
                />
              </svg>
              {{ isTransformLoading
                ? (transformDirection === 'liquid-to-staked' ? 'Staking...' : 'Unstaking...')
                : (transformDirection === 'liquid-to-staked' ? 'Stake' : 'Unstake')
              }}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  </HTMView>
</template>
