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
import type { htm_operation } from '@mtyszczak-cargo/htm';
import { onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { toast } from 'vue-sonner';

import CollapsibleMemoInput from '@/components/CollapsibleMemoInput.vue';
import { TokenAmountInput } from '@/components/htm/amount';
import HTMView from '@/components/htm/HTMView.vue';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import AddToGoogleWallet from '@/components/wallet/AddToGoogleWallet.vue';
import { useTokensStore, type CTokenBalanceDisplay, type CTokenPairBalanceDefinition, type TokenStoreApiResponse } from '@/stores/tokens.store';
import { toastError } from '@/utils/parse-error';
import { waitForTransactionStatus } from '@/utils/transaction-status';
import CTokensProvider from '@/utils/wallet/ctokens/signer';

const router = useRouter();
const tokensStore = useTokensStore();

// State
const isLoading = ref(false);
const searchQuery = ref('');

// Transfer dialog state
const isTransferDialogOpen = ref(false);
const transferAmount = ref('');
const transferRecipient = ref('');
const transferMemo = ref('');
const selectedTokenForTransfer = ref<CTokenBalanceDisplay | null>(null);
const isTransferLoading = ref(false);

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
      tokensStore.loadCreatedTokens(),
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

const openTransferDialog = (balance: CTokenBalanceDisplay) => {
  if (balance.isStaked) {
    toast.error('No liquid balance available for transfer');
    return;
  }

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

    // Wait for transaction status
    await waitForTransactionStatus(
      () => ([{
        token_transfer_operation: {
          receiver: transferRecipient.value,
          sender: CTokensProvider.getOperationalPublicKey()!,
          amount: {
            amount: transferAmount.value,
            nai: selectedTokenForTransfer.value?.nai || '',
            precision: selectedTokenForTransfer.value?.precision || 0
          },
          memo: transferMemo.value
        }
      } satisfies htm_operation]),
      'Transfer'
    );

    // Refresh balances on success
    await loadAccountBalances();
    isTransferDialogOpen.value = false;
  } catch (error) {
    toastError('Failed to transfer tokens', error);
  } finally {
    isTransferLoading.value = false;
  }
};

const openTransformDialog = (balance: CTokenBalanceDisplay) => {
  selectedToken.value = balance;
  transformDirection.value = balance.isStaked ? 'staked-to-liquid' : 'liquid-to-staked';
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

    // Wait for transaction status
    await waitForTransactionStatus(
      () => ([{
        token_transform_operation: {
          amount: {
            amount: transformAmount.value,
            nai: selectedToken.value!.nai!,
            precision: selectedToken.value!.precision!
          },
          holder: CTokensProvider.getOperationalPublicKey()!
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

// Navigate to token details page
const navigateToToken = (balance: CTokenBalanceDisplay) => {
  router.push({
    path: '/tokens/token',
    query: {
      'asset-num': balance.assetNum
    }
  });
};

// Set max transfer amount - use raw amount without precision formatting
const setMaxTransferAmount = async () => {
  if (!selectedTokenForTransfer.value) return;

  transferAmount.value = String(selectedTokenForTransfer.value.balance);
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
                      Balances
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
                    v-for="balance in fetchedBalances.items"
                    :key="balance.liquid.assetNum"
                    class="border-b hover:bg-muted/50 transition-colors cursor-pointer"
                    @click="navigateToToken(balance.liquid)"
                  >
                    <!-- Asset Info -->
                    <td class="p-4">
                      <div class="flex items-center gap-3">
                        <div class="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden">
                          <img
                            v-if="balance.liquid.image"
                            :src="balance.liquid.image"
                            :alt="balance.liquid.symbol"
                            class="h-full w-full object-cover"
                          >
                          <span
                            v-else
                            class="text-sm font-medium text-primary"
                          >
                            {{ balance.liquid.symbol?.charAt(0).toUpperCase() || '' }}
                          </span>
                        </div>
                        <div>
                          <div class="flex items-center gap-2">
                            <span class="font-semibold">
                              {{ balance.liquid.name }}
                            </span>
                            <span
                              v-if="balance.vesting.balance > 0n"
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
                            {{ balance.liquid.symbol }}
                          </div>
                          <div class="text-xs text-muted-foreground font-mono">
                            {{ balance.liquid.assetNum }}
                          </div>
                        </div>
                      </div>
                    </td>

                    <!-- Combined Balances -->
                    <td class="p-4 align-middle">
                      <div class="ml-auto flex w-full max-w-[260px] flex-col gap-3 text-sm">
                        <div class="flex items-center justify-between gap-3">
                          <span
                            :class="[
                              'inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold uppercase tracking-wide',
                              balance.liquid.balance === 0n
                                ? 'bg-muted text-muted-foreground border-transparent'
                                : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            ]"
                          >
                            Liquid
                          </span>
                          <span
                            :class="[
                              'font-medium tabular-nums',
                              balance.liquid.balance === 0n ? 'text-muted-foreground' : 'text-foreground'
                            ]"
                          >
                            {{ balance.liquid.displayBalance }}
                          </span>
                        </div>

                        <div class="flex items-center justify-between gap-3">
                          <span
                            :class="[
                              'inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold uppercase tracking-wide',
                              balance.vesting.balance === 0n
                                ? 'bg-muted text-muted-foreground border-transparent'
                                : 'bg-sky-50 text-sky-700 border-sky-200'
                            ]"
                          >
                            Staked
                          </span>
                          <span
                            :class="[
                              'font-medium tabular-nums',
                              balance.vesting.balance === 0n ? 'text-muted-foreground' : 'text-foreground'
                            ]"
                          >
                            {{ balance.vesting.displayBalance }}
                          </span>
                        </div>

                        <template v-if="balance.liquid.balance > 0n || balance.vesting.balance > 0n">
                          <div class="flex h-1.5 w-full overflow-hidden rounded-full bg-muted">
                            <div
                              class="h-full bg-emerald-500 transition-all"
                              :style="{ width: `${(balance.liquid.balance * 100n / (balance.liquid.balance + balance.vesting.balance))}%` }"
                            />
                            <div
                              class="h-full bg-sky-500 transition-all"
                              :style="{ width: `${(balance.vesting.balance * 100n / (balance.liquid.balance + balance.vesting.balance))}%` }"
                            />
                          </div>
                          <div class="flex items-center justify-between text-xs text-muted-foreground">
                            <span>Distribution</span>
                            <span class="tabular-nums">
                              {{ (Number((balance.liquid.balance * 10000n / (balance.liquid.balance + balance.vesting.balance))) / 100).toFixed(1) }}% liquid ·
                              {{ (Number((balance.vesting.balance * 10000n / (balance.liquid.balance + balance.vesting.balance))) / 100).toFixed(1) }}% staked
                            </span>
                          </div>
                        </template>

                        <div
                          v-else
                          class="text-xs text-muted-foreground text-right"
                        >
                          No balance yet
                        </div>
                      </div>
                    </td>

                    <!-- Total Balance -->
                    <td class="p-4 text-right">
                      <div class="font-semibold tabular-nums">
                        {{ balance.displayTotal }}
                      </div>
                    </td>

                    <!-- Actions -->
                    <td class="p-4">
                      <div class="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          :disabled="balance.liquid.balance === 0n"
                          title="Transfer tokens"
                          @click.stop="openTransferDialog(balance.liquid)"
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
                          :disabled="balance.liquid.balance === 0n"
                          title="Stake tokens"
                          @click.stop="openTransformDialog(balance.liquid)"
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
                          :disabled="balance.vesting.balance === 0n"
                          title="Unstake tokens"
                          @click.stop="openTransformDialog(balance.vesting)"
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
          v-if="fetchedBalances.hasMore"
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
        <DialogContent class="sm:max-w-[425px]">
          <DialogHeader>
            <div class="flex items-center gap-3 mb-2">
              <div class="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden">
                <img
                  v-if="selectedTokenForTransfer && selectedTokenForTransfer.image"
                  :src="selectedTokenForTransfer.image"
                  :alt="selectedTokenForTransfer.symbol"
                  class="h-full w-full object-cover"
                >
                <span
                  v-else
                  class="text-base font-medium text-primary"
                >
                  {{ selectedTokenForTransfer ? selectedTokenForTransfer.symbol!.charAt(0).toUpperCase() : '' }}
                </span>
              </div>
              <DialogTitle>Transfer {{ selectedTokenForTransfer ? selectedTokenForTransfer.name : '' }}</DialogTitle>
            </div>
            <DialogDescription>
              Send tokens to another account. Available balance: {{ selectedTokenForTransfer ? selectedTokenForTransfer.displayBalance : '0' }} {{ selectedTokenForTransfer ? selectedTokenForTransfer.symbol : '' }}
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

            <TokenAmountInput
              v-if="selectedTokenForTransfer"
              v-model="transferAmount"
              variant="explicit"
              :token="selectedTokenForTransfer"
              :disabled="isTransferLoading"
              :available-balance="selectedTokenForTransfer!.displayBalance"
              @max="setMaxTransferAmount"
            />

            <!-- memo -->
            <CollapsibleMemoInput
              v-model="transferMemo"
              :disabled="isTransferLoading"
              placeholder="Add memo..."
              :rows="4"
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
