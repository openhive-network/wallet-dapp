<script setup lang="ts">
import {
  mdiRefresh,
  mdiSend,
  mdiAccount,
  mdiArrowUp,
  mdiArrowDown,
  mdiPlusCircle,
  mdiWallet,
  mdiImageMultiple
} from '@mdi/js';
import { computed, onMounted, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { toast } from 'vue-sonner';

import HTMView from '@/components/HTMView.vue';
import MemoInput from '@/components/MemoInput.vue';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useTokensStore } from '@/stores/tokens.store';
import { getWax } from '@/stores/wax.store';
import { getUserOperationalKey } from '@/utils/ctokens-api';
import { transferNAIToken, stakeNAIToken } from '@/utils/nai-tokens';
import { toastError } from '@/utils/parse-error';
import { waitForTransactionStatus } from '@/utils/transaction-status';
import type { CtokensAppBalance } from '@/utils/wallet/ctokens/api';

const router = useRouter();
const tokensStore = useTokensStore();

// State
const isLoading = ref(false);
const searchQuery = ref('');
const failedImages = ref<Set<string>>(new Set());

// Pagination state
const itemsPerPage = ref(10);
const displayedItemsCount = ref(10);

// Transfer dialog state
const isTransferDialogOpen = ref(false);
const transferAmount = ref('');
const transferRecipient = ref('');
const transferMemo = ref('');
const selectedTokenForTransfer = ref<CtokensAppBalance | null>(null);
const isTransferLoading = ref(false);

// Transform dialog state
const isTransformDialogOpen = ref(false);
const transformAmount = ref('');
const transformDirection = ref<'liquid-to-staked' | 'staked-to-liquid'>('liquid-to-staked');
const selectedToken = ref<CtokensAppBalance | null>(null);
const isTransformLoading = ref(false);

// Account statistics
const createdTokensCount = ref(0);
const ownedTokensCount = ref(0);
const nftCollectionsCount = ref(0);
const stakedTokensCount = ref(0);

// Helper function to format count with >100, >60 etc
const formatCount = (count: number): string => {
  if (count > 100) {
    const rounded = Math.floor(count / 10) * 10;
    return `>${rounded}`;
  }
  return count.toString();
};

// Helper functions for extracting data from metadata
const getTokenSymbol = (balance: CtokensAppBalance): string => {
  const metadata = balance.metadata as { symbol?: string; name?: string } | undefined;
  return metadata?.symbol || balance.nai?.replace('@@', '') || 'Unknown';
};

const getTokenName = (balance: CtokensAppBalance): string => {
  const metadata = balance.metadata as { name?: string; display_name?: string } | undefined;
  return metadata?.display_name || metadata?.name || getTokenSymbol(balance);
};

const getTokenLogoUrl = (balance: CtokensAppBalance): string | undefined => {
  const metadata = balance.metadata as { logo_url?: string; image?: string } | undefined;
  return metadata?.logo_url || metadata?.image;
};

// Check if a token is staked (vesting) based on NAI
const isVesting = (nai: string, precision: number): boolean => {
  // The vesting bit is bit 5 (0x20) in the NAI encoding
  return (((Number(nai.slice(2, -1)) << 5) | 0x10 | precision) & 0x20) != 0;
};

// Get liquid balance - if the NAI indicates vesting (staked), return 0
const getLiquidBalance = (balance: CtokensAppBalance): string => {
  if (isVesting(balance.nai || '', balance.precision || 0))
    return '0';

  return balance.amount || '0';
};

// Get staked balance - if the NAI indicates vesting (staked), return the amount
const getStakedBalance = (balance: CtokensAppBalance): string => {
  if (isVesting(balance.nai || '', balance.precision || 0))
    return balance.amount || '0';

  return '0';
};

const getTotalBalance = (balance: CtokensAppBalance): string => {
  const liquid = parseFloat(getLiquidBalance(balance));
  const staked = parseFloat(getStakedBalance(balance));
  return (liquid + staked).toString();
};

// Filter balances based on search query
const filteredBalancesAll = computed(() => {
  const balances = tokensStore.balances;

  if (!searchQuery.value) return balances;

  return balances.filter(balance => {
    const symbol = getTokenSymbol(balance);
    const name = getTokenName(balance);
    const nai = balance.nai || '';

    return symbol.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
      name.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
      nai.includes(searchQuery.value);
  });
});

// Paginated balances (displayed items)
const filteredBalances = computed(() => {
  return filteredBalancesAll.value.slice(0, displayedItemsCount.value);
});

// Check if there are more items to load
const hasMoreItems = computed(() => {
  return displayedItemsCount.value < filteredBalancesAll.value.length;
});

// Load more items
const loadMoreItems = () => {
  displayedItemsCount.value = Math.min(
    displayedItemsCount.value + itemsPerPage.value,
    filteredBalancesAll.value.length
  );
};

// Reset pagination when search changes
watch(searchQuery, () => {
  displayedItemsCount.value = itemsPerPage.value;
});

// Methods
const loadAccountStatistics = async () => {
  try {
    const wax = await getWax();
    const operationalKey = await getUserOperationalKey();

    if (!operationalKey) {
      console.warn('No operational key available');
      return;
    }

    // Get all tokens created by this user (owner field matches operational key)
    const allTokens = await wax.restApi.ctokensApi.registeredTokens({});
    const createdTokens = allTokens.filter(token => token.owner === operationalKey);
    createdTokensCount.value = createdTokens.length;

    // Get owned tokens (tokens with balance)
    const balances = await wax.restApi.ctokensApi.balances({ user: operationalKey });
    ownedTokensCount.value = balances.length;

    // Get NFT collections (created NFT tokens)
    const nftTokens = createdTokens.filter(token => token.is_nft);
    nftCollectionsCount.value = nftTokens.length;

    // Get staked tokens (tokens with vesting bit set)
    const stakedBalances = balances.filter(b => isVesting(b.nai || '', b.precision || 0));
    stakedTokensCount.value = stakedBalances.length;
  } catch (error) {
    console.error('Failed to load account statistics:', error);
  }
};

const loadAccountBalances = async () => {
  try {
    isLoading.value = true;

    await Promise.all([
      tokensStore.loadBalances(true),
      loadAccountStatistics()
    ]);
  } catch (error) {
    toastError('Failed to load account balances', error);
  } finally {
    isLoading.value = false;
  }
};

const openTransferDialog = (balance: CtokensAppBalance) => {
  selectedTokenForTransfer.value = balance;
  transferAmount.value = '';
  transferRecipient.value = '';
  transferMemo.value = '';
  isTransferDialogOpen.value = true;
};

const transferTokens = async () => {
  if (!selectedTokenForTransfer.value || !transferAmount.value || !transferRecipient.value) {
    toast.error('Please fill in all fields');
    return;
  }

  try {
    isTransferLoading.value = true;

    const txId = await transferNAIToken({
      to: transferRecipient.value,
      amount: transferAmount.value,
      nai: selectedTokenForTransfer.value.nai || '',
      precision: selectedTokenForTransfer.value.precision || 0,
      memo: transferMemo.value || undefined
    });

    // Wait for transaction status
    await waitForTransactionStatus(
      txId,
      0,
      'Transfer',
      async () => {
        // Refresh balances on success
        await loadAccountBalances();
        isTransferDialogOpen.value = false;
      }
    );

  } catch (error) {
    toastError('Failed to transfer tokens', error);
  } finally {
    isTransferLoading.value = false;
  }
};

const openTransformDialog = (balance: CtokensAppBalance, direction: 'liquid-to-staked' | 'staked-to-liquid') => {
  selectedToken.value = balance;
  transformDirection.value = direction;
  transformAmount.value = '';
  isTransformDialogOpen.value = true;
};

const transformTokens = async () => {
  if (!selectedToken.value || !transformAmount.value) {
    toast.error('Please enter an amount');
    return;
  }

  try {
    isTransformLoading.value = true;

    const txId = await stakeNAIToken({
      amount: transformAmount.value,
      nai: selectedToken.value.nai || '',
      precision: selectedToken.value.precision || 0,
      direction: transformDirection.value === 'liquid-to-staked' ? 'stake' : 'unstake'
    });

    const action = transformDirection.value === 'liquid-to-staked' ? 'Stake' : 'Unstake';

    // Wait for transaction status
    await waitForTransactionStatus(
      txId,
      0,
      action,
      async () => {
        // Refresh balances on success
        await loadAccountBalances();
        isTransformDialogOpen.value = false;
      }
    );
  } catch (error) {
    toastError('Failed to transform tokens', error);
  } finally {
    isTransformLoading.value = false;
  }
};

// Handle image load error
const handleImageError = (nai: string) => {
  failedImages.value.add(nai);
};

// Check if image should be shown
const shouldShowImage = (balance: CtokensAppBalance): boolean => {
  const logoUrl = getTokenLogoUrl(balance);
  return !!logoUrl && !failedImages.value.has(balance.nai || '');
};

// Navigate to token details page
const navigateToToken = (balance: CtokensAppBalance) => {
  router.push({
    path: '/tokens/token',
    query: {
      nai: balance.nai,
      precision: balance.precision?.toString()
    }
  });
};

// Set max transfer amount - use raw amount without precision formatting
const setMaxTransferAmount = async () => {
  if (!selectedTokenForTransfer.value) return;

  try {
    // Use the raw amount directly from the balance
    transferAmount.value = selectedTokenForTransfer.value.amount || '0';
  } catch (error) {
    console.error('Failed to set max transfer amount:', error);
  }
};

// Set max transform amount - use raw amount without precision formatting
const setMaxTransformAmount = async () => {
  if (!selectedToken.value) return;

  try {
    const amount = transformDirection.value === 'liquid-to-staked'
      ? (selectedToken.value.amount || '0')
      : getStakedBalance(selectedToken.value);

    // Use the raw amount directly without formatting
    transformAmount.value = amount;
  } catch (error) {
    console.error('Failed to set max transform amount:', error);
  }
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
            @click="loadAccountBalances"
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
        </div>
      </div>

      <!-- Summary Cards -->
      <div class="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
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

        <Card>
          <CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle class="text-sm font-medium">
              Staked Tokens
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
                :d="mdiArrowUp"
              />
            </svg>
          </CardHeader>
          <CardContent>
            <div class="text-2xl font-bold">
              {{ formatCount(stakedTokensCount) }}
            </div>
            <p class="text-xs text-muted-foreground">
              Tokens currently staked
            </p>
          </CardContent>
        </Card>
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
                  placeholder="Search tokens by symbol, name, or NAI..."
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
        v-if="tokensStore.isLoadingBalances"
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
        v-else-if="filteredBalances.length > 0"
        class="space-y-4"
      >
        <Card>
          <CardContent class="p-0">
            <div class="overflow-x-auto">
              <table class="w-full">
                <thead class="border-b">
                  <tr class="hover:bg-muted/50">
                    <th class="text-left p-4 font-medium text-muted-foreground">
                      Asset
                    </th>
                    <th class="text-right p-4 font-medium text-muted-foreground">
                      Price
                    </th>
                    <th class="text-right p-4 font-medium text-muted-foreground">
                      Liquid
                    </th>
                    <th class="text-right p-4 font-medium text-muted-foreground">
                      Staked
                    </th>
                    <th class="text-right p-4 font-medium text-muted-foreground">
                      Total
                    </th>
                    <th class="text-right p-4 font-medium text-muted-foreground">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr
                    v-for="balance in filteredBalances"
                    :key="balance.nai"
                    class="border-b hover:bg-muted/50 transition-colors cursor-pointer"
                    @click="navigateToToken(balance)"
                  >
                    <!-- Asset Info -->
                    <td class="p-4">
                      <div class="flex items-center gap-3">
                        <div class="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden">
                          <img
                            v-if="shouldShowImage(balance)"
                            :src="getTokenLogoUrl(balance)"
                            :alt="getTokenSymbol(balance)"
                            class="h-full w-full object-cover"
                            @error="handleImageError(balance.nai || '')"
                          >
                          <span
                            v-else
                            class="text-sm font-medium text-primary"
                          >
                            {{ getTokenSymbol(balance).charAt(0).toUpperCase() }}
                          </span>
                        </div>
                        <div>
                          <div class="flex items-center gap-2">
                            <span class="font-semibold">
                              {{ getTokenName(balance) }}
                            </span>
                            <span
                              v-if="isVesting(balance.nai || '', balance.precision || 0)"
                              class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 border border-blue-200"
                            >
                              <svg
                                width="12"
                                height="12"
                                xmlns="http://www.w3.org/2000/svg"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  style="fill: currentColor"
                                  :d="mdiArrowUp"
                                />
                              </svg>
                              STAKED
                            </span>
                          </div>
                          <div class="text-sm text-muted-foreground">
                            {{ getTokenSymbol(balance) }}
                          </div>
                          <div class="text-xs text-muted-foreground font-mono">
                            {{ balance.nai }}
                          </div>
                        </div>
                      </div>
                    </td>

                    <!-- Price -->
                    <td class="p-4 text-right">
                      <div class="font-medium">
                        $0.01
                      </div>
                      <div class="text-sm text-green-600">
                        +0.00%
                      </div>
                    </td>

                    <!-- Liquid Balance -->
                    <td class="p-4 text-right">
                      <div class="font-medium">
                        {{ getLiquidBalance(balance) }}
                      </div>
                      <div class="text-sm text-muted-foreground">
                        ${{ (parseFloat(getLiquidBalance(balance)) * 0.01).toFixed(2) }}
                      </div>
                    </td>

                    <!-- Staked Balance -->
                    <td class="p-4 text-right">
                      <div class="font-medium">
                        {{ getStakedBalance(balance) }}
                      </div>
                      <div class="text-sm text-muted-foreground">
                        ${{ (parseFloat(getStakedBalance(balance)) * 0.01).toFixed(2) }}
                      </div>
                    </td>

                    <!-- Total Balance -->
                    <td class="p-4 text-right">
                      <div class="font-medium">
                        {{ getTotalBalance(balance) }}
                      </div>
                      <div class="text-sm text-muted-foreground">
                        ${{ (parseFloat(getTotalBalance(balance)) * 0.01).toFixed(2) }}
                      </div>
                    </td>

                    <!-- Actions -->
                    <td class="p-4">
                      <div class="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          :disabled="parseFloat(getLiquidBalance(balance)) === 0"
                          title="Transfer tokens"
                          @click.stop="openTransferDialog(balance)"
                        >
                          <svg
                            width="14"
                            height="14"
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 24 24"
                          >
                            <path
                              style="fill: currentColor"
                              :d="mdiSend"
                            />
                          </svg>
                        </Button>

                        <Button
                          variant="ghost"
                          size="sm"
                          :disabled="parseFloat(getLiquidBalance(balance)) === 0"
                          title="Stake tokens"
                          @click.stop="openTransformDialog(balance, 'liquid-to-staked')"
                        >
                          <svg
                            width="14"
                            height="14"
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 24 24"
                          >
                            <path
                              style="fill: currentColor"
                              :d="mdiArrowUp"
                            />
                          </svg>
                        </Button>

                        <Button
                          variant="ghost"
                          size="sm"
                          :disabled="parseFloat(getStakedBalance(balance)) === 0"
                          title="Unstake tokens"
                          @click.stop="openTransformDialog(balance, 'staked-to-liquid')"
                        >
                          <svg
                            width="14"
                            height="14"
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 24 24"
                          >
                            <path
                              style="fill: currentColor"
                              :d="mdiArrowDown"
                            />
                          </svg>
                        </Button>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        <!-- Load More Button -->
        <div
          v-if="hasMoreItems"
          class="flex justify-center pt-4"
        >
          <Button
            variant="outline"
            size="lg"
            @click="loadMoreItems"
          >
            Load More
            <span class="ml-2 text-muted-foreground">
              ({{ displayedItemsCount }} / {{ filteredBalancesAll.length }})
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
          @click="loadAccountBalances"
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
        <DialogContent class="sm:max-w-[425px]">
          <DialogHeader>
            <div class="flex items-center gap-3 mb-2">
              <div class="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden">
                <img
                  v-if="selectedTokenForTransfer && shouldShowImage(selectedTokenForTransfer)"
                  :src="getTokenLogoUrl(selectedTokenForTransfer)"
                  :alt="getTokenSymbol(selectedTokenForTransfer)"
                  class="h-full w-full object-cover"
                  @error="handleImageError(selectedTokenForTransfer.nai || '')"
                >
                <span
                  v-else
                  class="text-base font-medium text-primary"
                >
                  {{ selectedTokenForTransfer ? getTokenSymbol(selectedTokenForTransfer).charAt(0).toUpperCase() : '' }}
                </span>
              </div>
              <DialogTitle>Transfer {{ selectedTokenForTransfer ? getTokenName(selectedTokenForTransfer) : '' }}</DialogTitle>
            </div>
            <DialogDescription>
              Send tokens to another account. Available balance: {{ selectedTokenForTransfer ? getLiquidBalance(selectedTokenForTransfer) : '0' }} {{ selectedTokenForTransfer ? getTokenSymbol(selectedTokenForTransfer) : '' }}
            </DialogDescription>
          </DialogHeader>

          <div class="grid gap-4 py-4">
            <div class="grid gap-2">
              <Label for="recipient">Recipient Account</Label>
              <Input
                id="recipient"
                v-model="transferRecipient"
                placeholder="Enter account name"
              />
            </div>

            <div class="grid gap-2">
              <Label for="amount">Amount</Label>
              <div class="relative">
                <Input
                  id="amount"
                  v-model="transferAmount"
                  type="text"
                  inputmode="decimal"
                  placeholder="0.000"
                  class="pr-20 transition-colors"
                />
                <div class="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
                  <span class="text-xs text-muted-foreground">
                    {{ getTokenSymbol(selectedTokenForTransfer!) }}
                  </span>
                </div>
              </div>
              <div class="flex justify-between text-xs">
                <span class="text-muted-foreground">
                  Available: {{ getLiquidBalance(selectedTokenForTransfer!) }}
                </span>
                <button
                  v-if="selectedTokenForTransfer && Number(getLiquidBalance(selectedTokenForTransfer)) > 0"
                  type="button"
                  class="text-primary hover:text-primary/80 font-medium"
                  @click="setMaxTransferAmount"
                >
                  MAX
                </button>
              </div>
              <p
                v-if="selectedTokenForTransfer"
                class="text-xs text-muted-foreground"
              >
                Precision: {{ selectedTokenForTransfer.precision }} decimal places
              </p>
            </div>

            <MemoInput
              v-model="transferMemo"
              :disabled="isTransferLoading"
            />
          </div>

          <div class="flex justify-end gap-2">
            <Button
              variant="outline"
              @click="isTransferDialogOpen = false"
            >
              Cancel
            </Button>
            <Button
              :disabled="isTransferLoading || !transferAmount || !transferRecipient"
              @click="transferTokens"
            >
              <svg
                v-if="isTransferLoading"
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
                  :d="mdiSend"
                />
              </svg>
              {{ isTransferLoading ? 'Transferring...' : 'Transfer' }}
            </Button>
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
                  v-if="selectedToken && shouldShowImage(selectedToken)"
                  :src="getTokenLogoUrl(selectedToken)"
                  :alt="getTokenSymbol(selectedToken)"
                  class="h-full w-full object-cover"
                  @error="handleImageError(selectedToken.nai || '')"
                >
                <span
                  v-else
                  class="text-base font-medium text-primary"
                >
                  {{ selectedToken ? getTokenSymbol(selectedToken).charAt(0).toUpperCase() : '' }}
                </span>
              </div>
              <DialogTitle>
                {{ transformDirection === 'liquid-to-staked' ? 'Stake' : 'Unstake' }} {{ selectedToken ? getTokenName(selectedToken) : '' }}
              </DialogTitle>
            </div>
            <DialogDescription>
              {{ transformDirection === 'liquid-to-staked'
                ? `Stake tokens to earn rewards. Available: ${selectedToken ? getLiquidBalance(selectedToken) : '0'} ${selectedToken ? getTokenSymbol(selectedToken) : ''}`
                : `Unstake tokens to make them liquid. Available: ${selectedToken ? getStakedBalance(selectedToken) : '0'} ${selectedToken ? getTokenSymbol(selectedToken) : ''}`
              }}
            </DialogDescription>
          </DialogHeader>

          <div class="grid gap-4 py-4">
            <div class="grid gap-2">
              <Label for="transformAmount">Amount</Label>
              <div class="relative">
                <Input
                  id="transformAmount"
                  v-model="transformAmount"
                  type="text"
                  inputmode="decimal"
                  placeholder="0.000"
                  class="pr-20 transition-colors"
                />
                <div class="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
                  <span class="text-xs text-muted-foreground">
                    {{ getTokenSymbol(selectedToken!) }}
                  </span>
                </div>
              </div>
              <div class="flex justify-between text-xs">
                <span class="text-muted-foreground">
                  Available: {{ transformDirection === 'liquid-to-staked' ? getLiquidBalance(selectedToken!) : getStakedBalance(selectedToken!) }}
                </span>
                <button
                  v-if="selectedToken && Number(transformDirection === 'liquid-to-staked' ? getLiquidBalance(selectedToken) : getStakedBalance(selectedToken)) > 0"
                  type="button"
                  class="text-primary hover:text-primary/80 font-medium"
                  @click="setMaxTransformAmount"
                >
                  MAX
                </button>
              </div>
              <p
                v-if="selectedToken"
                class="text-xs text-muted-foreground"
              >
                Precision: {{ selectedToken.precision }} decimal places
              </p>
            </div>
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
