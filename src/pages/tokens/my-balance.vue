<script setup lang="ts">
import {
  mdiCurrencyUsd,
  mdiRefresh,
  mdiSend,
  mdiAccount,
  mdiLock,
  mdiLockOpen,
  mdiWater
} from '@mdi/js';
import { computed, onMounted, ref } from 'vue';
import { toast } from 'vue-sonner';

import HTMView from '@/components/HTMView.vue';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { useTokensStore } from '@/stores/tokens.store';
import { transferNAIToken, stakeNAIToken } from '@/utils/nai-tokens';
import { toastError } from '@/utils/parse-error';
import type { CtokensAppBalance } from '@/utils/wallet/ctokens/api';

const tokensStore = useTokensStore();

// State
const isLoading = ref(false);
const searchQuery = ref('');

// Transfer dialog state
const isTransferDialogOpen = ref(false);
const transferAmount = ref('');
const transferRecipient = ref('');
const selectedTokenForTransfer = ref<CtokensAppBalance | null>(null);
const isTransferLoading = ref(false);

// Transform dialog state
const isTransformDialogOpen = ref(false);
const transformAmount = ref('');
const transformDirection = ref<'liquid-to-staked' | 'staked-to-liquid'>('liquid-to-staked');
const selectedToken = ref<CtokensAppBalance | null>(null);
const isTransformLoading = ref(false);

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

// For now, since the API doesn't distinguish between liquid and staked,
// we'll treat all balance as liquid (this may need to be updated based on actual API behavior)
const getLiquidBalance = (balance: CtokensAppBalance): string => {
  return balance.amount || '0';
};

const getStakedBalance = (_balance: CtokensAppBalance): string => {
  // TODO: Update this when staked balance info is available from API
  return '0';
};

const getTotalBalance = (balance: CtokensAppBalance): string => {
  const liquid = parseFloat(getLiquidBalance(balance));
  const staked = parseFloat(getStakedBalance(balance));
  return (liquid + staked).toString();
};

// Computed
const filteredBalances = computed(() => {
  if (!searchQuery.value) return tokensStore.balances;

  return tokensStore.balances.filter(balance => {
    const symbol = getTokenSymbol(balance);
    const name = getTokenName(balance);
    const nai = balance.nai || '';

    return symbol.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
      name.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
      nai.includes(searchQuery.value);
  });
});

const totalValue = computed(() => {
  return tokensStore.totalValue;
});

// Methods
const loadAccountBalances = async () => {
  try {
    isLoading.value = true;

    await tokensStore.loadBalances(true);
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
  isTransferDialogOpen.value = true;
};

const transferTokens = async () => {
  if (!selectedTokenForTransfer.value || !transferAmount.value || !transferRecipient.value) {
    toast.error('Please fill in all fields');
    return;
  }

  try {
    isTransferLoading.value = true;

    await transferNAIToken({
      to: transferRecipient.value,
      amount: transferAmount.value,
      symbol: getTokenSymbol(selectedTokenForTransfer.value)
    });

    const symbol = getTokenSymbol(selectedTokenForTransfer.value);
    toast.success(`Successfully transferred ${transferAmount.value} ${symbol} to ${transferRecipient.value}`);

    // Refresh balances
    await loadAccountBalances();

    isTransferDialogOpen.value = false;
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

    await stakeNAIToken({
      amount: transformAmount.value,
      symbol: getTokenSymbol(selectedToken.value),
      direction: transformDirection.value === 'liquid-to-staked' ? 'stake' : 'unstake'
    });

    const action = transformDirection.value === 'liquid-to-staked' ? 'staked' : 'unstaked';
    const symbol = getTokenSymbol(selectedToken.value);
    toast.success(`Successfully ${action} ${transformAmount.value} ${symbol}`);

    // Refresh balances
    await loadAccountBalances();

    isTransformDialogOpen.value = false;
  } catch (error) {
    toastError('Failed to transform tokens', error);
  } finally {
    isTransformLoading.value = false;
  }
};

const getMaxTransferAmount = (balance: CtokensAppBalance) => {
  return parseFloat(getLiquidBalance(balance));
};

const getMaxTransformAmount = (balance: CtokensAppBalance, direction: 'liquid-to-staked' | 'staked-to-liquid') => {
  return direction === 'liquid-to-staked'
    ? parseFloat(getLiquidBalance(balance))
    : parseFloat(getStakedBalance(balance));
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
              Total Portfolio Value
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
                :d="mdiCurrencyUsd"
              />
            </svg>
          </CardHeader>
          <CardContent>
            <div class="text-2xl font-bold">
              ${{ totalValue.toFixed(2) }}
            </div>
            <p class="text-xs text-muted-foreground">
              +2.1% from last month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle class="text-sm font-medium">
              Total Tokens
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
                :d="mdiAccount"
              />
            </svg>
          </CardHeader>
          <CardContent>
            <div class="text-2xl font-bold">
              {{ tokensStore.tokenCount }}
            </div>
            <p class="text-xs text-muted-foreground">
              Different token types
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle class="text-sm font-medium">
              Liquid Balance
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
                :d="mdiWater"
              />
            </svg>
          </CardHeader>
          <CardContent>
            <div class="text-2xl font-bold">
              {{ tokensStore.balances.reduce((sum, b) => sum + parseFloat(getLiquidBalance(b)), 0).toFixed(3) }}
            </div>
            <p class="text-xs text-muted-foreground">
              Available for transfer
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle class="text-sm font-medium">
              Staked Balance
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
                :d="mdiLock"
              />
            </svg>
          </CardHeader>
          <CardContent>
            <div class="text-2xl font-bold">
              {{ tokensStore.balances.reduce((sum, b) => sum + parseFloat(getStakedBalance(b)), 0).toFixed(3) }}
            </div>
            <p class="text-xs text-muted-foreground">
              Earning rewards
            </p>
          </CardContent>
        </Card>
      </div>

      <!-- Search -->
      <div class="flex items-center gap-4">
        <div class="flex-1">
          <Input
            v-model="searchQuery"
            placeholder="Search tokens by symbol, name, or NAI..."
            class="max-w-sm"
          />
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
                    class="border-b hover:bg-muted/50 transition-colors"
                  >
                    <!-- Asset Info -->
                    <td class="p-4">
                      <div class="flex items-center gap-3">
                        <div class="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                          <img
                            v-if="getTokenLogoUrl(balance)"
                            :src="getTokenLogoUrl(balance)"
                            :alt="getTokenSymbol(balance)"
                            class="h-6 w-6 rounded-full"
                          >
                          <span
                            v-else
                            class="text-sm font-medium text-primary"
                          >
                            {{ getTokenSymbol(balance).charAt(0) }}
                          </span>
                        </div>
                        <div>
                          <div class="font-semibold">
                            {{ getTokenSymbol(balance) }}
                          </div>
                          <div class="text-sm text-muted-foreground">
                            {{ getTokenName(balance) }}
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
                          @click="openTransferDialog(balance)"
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
                          @click="openTransformDialog(balance, 'liquid-to-staked')"
                        >
                          <svg
                            width="14"
                            height="14"
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 24 24"
                          >
                            <path
                              style="fill: currentColor"
                              :d="mdiLock"
                            />
                          </svg>
                        </Button>

                        <Button
                          variant="ghost"
                          size="sm"
                          :disabled="parseFloat(getStakedBalance(balance)) === 0"
                          title="Unstake tokens"
                          @click="openTransformDialog(balance, 'staked-to-liquid')"
                        >
                          <svg
                            width="14"
                            height="14"
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 24 24"
                          >
                            <path
                              style="fill: currentColor"
                              :d="mdiLockOpen"
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
            <DialogTitle>Transfer {{ selectedTokenForTransfer ? getTokenSymbol(selectedTokenForTransfer) : '' }}</DialogTitle>
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
              <div class="flex gap-2">
                <Input
                  id="amount"
                  v-model="transferAmount"
                  type="number"
                  :step="1 / Math.pow(10, selectedTokenForTransfer?.precision || 3)"
                  :max="getMaxTransferAmount(selectedTokenForTransfer!)"
                  placeholder="0.000"
                />
                <Button
                  variant="outline"
                  @click="transferAmount = selectedTokenForTransfer ? getLiquidBalance(selectedTokenForTransfer) : ''"
                >
                  Max
                </Button>
              </div>
            </div>
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
            <DialogTitle>
              {{ transformDirection === 'liquid-to-staked' ? 'Stake' : 'Unstake' }} {{ selectedToken ? getTokenSymbol(selectedToken) : '' }}
            </DialogTitle>
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
              <div class="flex gap-2">
                <Input
                  id="transformAmount"
                  v-model="transformAmount"
                  type="number"
                  :step="1 / Math.pow(10, selectedToken?.precision || 3)"
                  :max="getMaxTransformAmount(selectedToken!, transformDirection)"
                  placeholder="0.000"
                />
                <Button
                  variant="outline"
                  @click="transformAmount = (transformDirection === 'liquid-to-staked'
                    ? (selectedToken ? getLiquidBalance(selectedToken) : '')
                    : (selectedToken ? getStakedBalance(selectedToken) : '')) || ''"
                >
                  Max
                </Button>
              </div>
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
                  :d="transformDirection === 'liquid-to-staked' ? mdiLock : mdiLockOpen"
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
