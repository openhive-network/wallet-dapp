<script setup lang="ts">
import { mdiPencilOutline } from '@mdi/js';
import { onMounted, ref, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import HTMView from '@/components/HTMView.vue';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { useSettingsStore } from '@/stores/settings.store';
import { useTokensStore } from '@/stores/tokens.store';
import { getWax } from '@/stores/wax.store';
import { toastError } from '@/utils/parse-error';
import type { CtokensAppToken, CtokensAppBalance, CtokensAppTopHolder } from '@/utils/wallet/ctokens/api';

// Router
const route = useRoute();
const router = useRouter();

// Stores
const tokensStore = useTokensStore();
const settingsStore = useSettingsStore();

// State
const token = ref<CtokensAppToken | null>(null);
const userBalance = ref<CtokensAppBalance | null>(null);
const topHolders = ref<CtokensAppTopHolder[]>([]);
const isLoading = ref(true);
const isLoadingHolders = ref(false);
const isTransferring = ref(false);

// Transfer form
const transferForm = ref({
  to: '',
  amount: '',
  memo: ''
});

// Get NAI from route parameter
const nai = computed(() => route.query.nai as string);
const precision = computed(() => route.query.precision);

// Check if user is logged in
const isLoggedIn = computed(() => !!settingsStore.settings.account);

// Computed properties
const tokenName = computed(() => {
  if (!token.value) return 'Unknown Token';
  const metadata = token.value.metadata as { name?: string } | undefined;
  return metadata?.name || token.value.nai || 'Unknown Token';
});

const tokenSymbol = computed(() => {
  if (!token.value) return '';
  const metadata = token.value.metadata as { symbol?: string } | undefined;
  return metadata?.symbol || '';
});

const tokenDescription = computed(() => {
  if (!token.value) return '';
  const metadata = token.value.metadata as { description?: string } | undefined;
  return metadata?.description || '';
});

const tokenImage = computed(() => {
  if (!token.value) return '';
  const metadata = token.value.metadata as { image?: string } | undefined;
  return metadata?.image || '';
});

const formattedTotalSupply = ref('0');
const formattedMaxSupply = ref('0');
const formattedUserBalance = ref('0.000');

// Update formatted values
const updateFormattedValues = async () => {
  if (!token.value) return;

  try {
    const wax = await getWax();
    const formatAsset = (value: string, precision: number, name?: string): string => {
      const formatted = wax.formatter.formatNumber(value, precision);
      return name ? `${formatted} ${name}` : formatted;
    };

    formattedTotalSupply.value = formatAsset(token.value.total_supply!, token.value.precision || 0, tokenSymbol.value);
    formattedMaxSupply.value = token.value.max_supply === '0'
      ? '∞ (Unlimited)'
      : formatAsset(token.value.max_supply!, token.value.precision || 0, tokenSymbol.value);

    if (userBalance.value)
      formattedUserBalance.value = formatAsset(userBalance.value.amount!, token.value.precision || 0, tokenSymbol.value);
  } catch (error) {
    console.error('Failed to format values:', error);
  }
};

// Load token details
const loadTokenDetails = async () => {
  try {
    const wax = await getWax();

    // Fetch token details by NAI
    // First try with just NAI, if that doesn't work, get all tokens and filter
    let tokens = await wax.restApi.ctokensApi.registeredTokens({ nai: nai.value, precision: Number(precision.value!) });

    // If no token found with just NAI, try getting all tokens and filtering
    if (!tokens || tokens.length === 0) {
      const allTokens = await wax.restApi.ctokensApi.registeredTokens({});
      tokens = allTokens.filter(token => token.nai === nai.value);
    }

    if (!tokens || tokens.length === 0)
      throw new Error(`Token with NAI ${nai.value} not found`);

    token.value = tokens[0];

    // Update formatted values
    await updateFormattedValues();

    // Load user balance if user is logged in
    if (isLoggedIn.value) {
      try {
        // Get user balances from the store
        await tokensStore.loadBalances();
        userBalance.value = tokensStore.balances.find((b: CtokensAppBalance) => b.nai === nai.value) || null;
        if (userBalance.value)
          await updateFormattedValues();

      } catch (error) {
        console.warn('Failed to load user balance:', error);
      }
    }

  } catch (error) {
    toastError('Failed to load token details', error);
  }
};

// Load top holders
const loadTopHolders = async () => {
  if (!token.value) return;

  try {
    isLoadingHolders.value = true;
    topHolders.value = await tokensStore.getTopHolders(
      token.value.nai!,
      token.value.precision || 0
    );
  } catch (error) {
    console.warn('Failed to load top holders:', error);
    toastError('Failed to load top holders', error);
  } finally {
    isLoadingHolders.value = false;
  }
};

// Handle transfer (simplified for now)
const handleTransfer = async () => {
  if (!token.value || !isLoggedIn.value) {
    toastError('You must be logged in to transfer tokens', new Error('Not logged in'));
    return;
  }

  if (!transferForm.value.to || !transferForm.value.amount) {
    toastError('Please fill in recipient and amount', new Error('Missing fields'));
    return;
  }

  try {
    isTransferring.value = true;

    // For now, just show a placeholder message
    // In a real implementation, this would use the transfer API
    console.log('Transfer:', {
      token: token.value.nai,
      to: transferForm.value.to,
      amount: transferForm.value.amount,
      memo: transferForm.value.memo
    });

    // TODO: Implement actual transfer functionality
    throw new Error('Transfer functionality not yet implemented');

  } catch (error) {
    toastError('Transfer failed', error);
  } finally {
    isTransferring.value = false;
  }
};

// Navigate back to token list
const goBack = () => {
  router.push('/tokens/list');
};

// Navigate to edit token (placeholder for now)
const editToken = () => {
  // TODO: Implement token editing functionality
  console.log('Edit token:', token.value?.nai);
};

// Initialize
onMounted(async () => {
  isLoading.value = true;

  await Promise.allSettled([
    loadTokenDetails(),
    loadTopHolders()
  ]);

  isLoading.value = false;
});
</script>

<template>
  <HTMView is-public-page>
    <div class="container mx-auto py-4 sm:py-6 space-y-6 px-4">
      <!-- Header with back button -->
      <div class="flex items-center justify-between gap-4">
        <Button
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
              d="M20,11V13H8L13.5,18.5L12.08,19.92L4.16,12L12.08,4.08L13.5,5.5L8,11H20Z"
            />
          </svg>
          Back to Tokens
        </Button>
        <Button
          variant="default"
          size="sm"
          class="gap-2"
          @click="editToken"
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
          Edit Token Definition
        </Button>
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
        <Card class="overflow-hidden">
          <CardContent class="p-6">
            <!-- Main Token Info -->
            <div class="flex flex-col sm:flex-row items-start gap-6 mb-6">
              <Avatar class="h-20 w-20 sm:h-24 sm:w-24 flex-shrink-0">
                <AvatarImage
                  v-if="tokenImage"
                  :src="tokenImage"
                  :alt="tokenName"
                />
                <AvatarFallback class="text-xl sm:text-2xl font-bold bg-primary/10 text-primary">
                  {{ tokenSymbol ? tokenSymbol.slice(0, 2).toUpperCase() : tokenName.slice(0, 2).toUpperCase() }}
                </AvatarFallback>
              </Avatar>

              <div class="flex-1 min-w-0">
                <div class="flex flex-col sm:flex-row sm:items-center gap-3 mb-3">
                  <h1 class="text-2xl sm:text-3xl font-bold text-foreground">
                    {{ tokenName }}
                  </h1>
                  <div class="flex flex-wrap gap-2">
                    <span
                      v-if="tokenSymbol"
                      class="inline-flex items-center rounded-md bg-primary/10 px-2 py-1 text-xs font-medium text-primary border border-primary/20"
                    >
                      {{ tokenSymbol }}
                    </span>
                    <span
                      v-if="token.is_nft"
                      class="inline-flex items-center rounded-md bg-purple-500/10 px-2 py-1 text-xs font-medium text-purple-500 border border-purple-500/20"
                    >
                      NFT
                    </span>
                    <span
                      :class="[
                        'inline-flex items-center rounded-md px-2 py-1 text-xs font-medium border',
                        token.capped ? 'bg-orange-500/10 text-orange-500 border-orange-500/20' : 'bg-gray-500/10 text-gray-500 border-gray-500/20'
                      ]"
                    >
                      {{ token.capped ? 'Capped' : 'Uncapped' }}
                    </span>
                  </div>
                </div>

                <p
                  v-if="tokenDescription"
                  class="text-muted-foreground text-base mb-4 leading-relaxed"
                >
                  {{ tokenDescription }}
                </p>

                <!-- Technical Details - Compact -->
                <div class="flex flex-wrap items-center gap-3 text-sm text-muted-foreground mb-4">
                  <div class="flex items-center gap-1">
                    <span class="font-medium">NAI:</span>
                    <code class="bg-muted px-1.5 py-0.5 rounded font-mono text-xs">{{ token.nai }}</code>
                  </div>
                  <div class="flex items-center gap-1">
                    <span class="font-medium">Precision:</span>
                    <span class="bg-muted px-1.5 py-0.5 rounded text-xs">{{ token.precision }}</span>
                  </div>
                  <div class="flex items-center gap-1">
                    <span class="font-medium">Owner:</span>
                    <span class="bg-muted px-1.5 py-0.5 rounded text-xs max-w-32 truncate">{{ token.owner }}</span>
                  </div>
                </div>

                <!-- Token Properties - Compact -->
                <div class="flex flex-wrap items-center gap-2 mb-6">
                  <span
                    :class="[
                      'inline-flex items-center rounded-md px-2 py-1 text-xs font-medium border',
                      token.is_nft ? 'bg-purple-50 text-purple-700 border-purple-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    ]"
                  >
                    {{ token.is_nft ? 'NFT' : 'Fungible' }}
                  </span>
                  <span
                    :class="[
                      'inline-flex items-center rounded-md px-2 py-1 text-xs font-medium border',
                      token.others_can_stake ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-gray-50 text-gray-700 border-gray-200'
                    ]"
                  >
                    {{ token.others_can_stake ? 'Staking ✓' : 'Staking ✗' }}
                  </span>
                  <span
                    :class="[
                      'inline-flex items-center rounded-md px-2 py-1 text-xs font-medium border',
                      token.others_can_unstake ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-gray-50 text-gray-700 border-gray-200'
                    ]"
                  >
                    {{ token.others_can_unstake ? 'Unstaking ✓' : 'Unstaking ✗' }}
                  </span>
                </div>
              </div>
            </div>

            <!-- Stats Grid - Dense Layout -->
            <div class="border-t pt-6">
              <h3 class="text-lg font-semibold mb-4 flex items-center gap-2">
                <svg
                  width="20"
                  height="20"
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  class="text-primary"
                >
                  <path
                    style="fill: currentColor"
                    d="M16,6L18.29,8.29L13.41,13.17L9.41,9.17L2,16.59L3.41,18L9.41,12L13.41,16L19.71,9.71L22,12V6H16Z"
                  />
                </svg>
                Token Statistics
              </h3>
              <div class="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <!-- Total Supply -->
                <div class="bg-accent/30 rounded-lg p-4 border">
                  <div class="flex items-center gap-2 mb-2">
                    <div class="w-3 h-3 rounded-full bg-blue-500" />
                    <span class="text-xs font-medium text-muted-foreground">Total Supply</span>
                  </div>
                  <div class="text-sm font-bold text-foreground truncate">
                    {{ formattedTotalSupply }}
                  </div>
                </div>

                <!-- Max Supply -->
                <div class="bg-accent/30 rounded-lg p-4 border">
                  <div class="flex items-center gap-2 mb-2">
                    <div class="w-3 h-3 rounded-full bg-orange-500" />
                    <span class="text-xs font-medium text-muted-foreground">Max Supply</span>
                  </div>
                  <div class="text-sm font-bold text-foreground truncate">
                    {{ formattedMaxSupply }}
                  </div>
                </div>

                <!-- Your Balance -->
                <div class="bg-accent/30 rounded-lg p-4 border">
                  <div class="flex items-center gap-2 mb-2">
                    <div class="w-3 h-3 rounded-full bg-green-500" />
                    <span class="text-xs font-medium text-muted-foreground">Your Balance</span>
                  </div>
                  <div class="text-sm font-bold text-foreground truncate">
                    {{ isLoggedIn ? formattedUserBalance : '—' }}
                  </div>
                </div>

                <!-- Market Cap Placeholder -->
                <div class="bg-accent/30 rounded-lg p-4 border">
                  <div class="flex items-center gap-2 mb-2">
                    <div class="w-3 h-3 rounded-full bg-purple-500" />
                    <span class="text-xs font-medium text-muted-foreground">Market Cap</span>
                  </div>
                  <div class="text-sm font-bold text-foreground">
                    —
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <!-- Actions Section -->
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          <!-- Transfer Section -->
          <Card class="flex flex-col h-full">
            <CardHeader>
              <CardTitle class="flex items-center gap-2">
                <svg
                  width="20"
                  height="20"
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  class="text-primary"
                >
                  <path
                    style="fill: currentColor"
                    d="M2,12A10,10 0 0,1 12,2A10,10 0 0,1 22,12A10,10 0 0,1 12,22A10,10 0 0,1 2,12M18,11H10L13.5,7.5L12.08,6.08L6.16,12L12.08,17.92L13.5,16.5L10,13H18V11Z"
                  />
                </svg>
                Transfer Tokens
              </CardTitle>
              <CardDescription>
                Send {{ tokenSymbol || tokenName }} to another account
              </CardDescription>
            </CardHeader>
            <CardContent class="space-y-6 flex-1">
              <div
                v-if="!isLoggedIn"
                class="text-center py-12 space-y-4"
              >
                <div class="w-16 h-16 mx-auto bg-muted rounded-full flex items-center justify-center">
                  <svg
                    width="24"
                    height="24"
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    class="text-muted-foreground"
                  >
                    <path
                      style="fill: currentColor"
                      d="M12,4A4,4 0 0,1 16,8A4,4 0 0,1 12,12A4,4 0 0,1 8,8A4,4 0 0,1 12,4M12,14C16.42,14 20,15.79 20,18V20H4V18C4,15.79 7.58,14 12,14Z"
                    />
                  </svg>
                </div>
                <p class="text-muted-foreground font-medium">
                  Connect your wallet to transfer tokens
                </p>
                <Button
                  size="lg"
                  @click="$router.push('/')"
                >
                  Connect Wallet
                </Button>
              </div>

              <div
                v-else
                class="space-y-5"
              >
                <div class="space-y-2">
                  <Label
                    for="recipient"
                    class="text-sm font-medium text-foreground"
                  >
                    Recipient Account
                  </Label>
                  <Input
                    id="recipient"
                    v-model="transferForm.to"
                    placeholder="Enter recipient account or address"
                    :disabled="isTransferring"
                    class="transition-colors"
                    :class="transferForm.to && transferForm.to.length > 2 ? 'border-green-500 focus-visible:ring-green-500' : ''"
                  />
                  <p class="text-xs text-muted-foreground">
                    Enter the account name or address to send tokens to
                  </p>
                </div>

                <div class="space-y-2">
                  <Label
                    for="amount"
                    class="text-sm font-medium text-foreground"
                  >
                    Amount
                  </Label>
                  <div class="relative">
                    <Input
                      id="amount"
                      v-model="transferForm.amount"
                      type="number"
                      step="any"
                      min="0"
                      :placeholder="`Amount in ${tokenSymbol || tokenName}`"
                      :disabled="isTransferring"
                      class="pr-20 transition-colors"
                      :class="transferForm.amount && Number(transferForm.amount) > 0 ? 'border-green-500 focus-visible:ring-green-500' : ''"
                    />
                    <span class="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground font-medium">
                      {{ tokenSymbol || 'TOK' }}
                    </span>
                  </div>
                  <div class="flex justify-between text-xs">
                    <span class="text-muted-foreground">
                      Available: {{ formattedUserBalance }}
                    </span>
                    <button
                      v-if="userBalance && Number(userBalance.amount) > 0"
                      type="button"
                      class="text-primary hover:text-primary/80 font-medium"
                      @click="transferForm.amount = formattedUserBalance"
                    >
                      Max
                    </button>
                  </div>
                </div>

                <div class="space-y-2">
                  <Label
                    for="memo"
                    class="text-sm font-medium text-foreground"
                  >
                    Memo (Optional)
                  </Label>
                  <Textarea
                    id="memo"
                    v-model="transferForm.memo"
                    placeholder="Optional transfer memo or note"
                    rows="3"
                    :disabled="isTransferring"
                    class="resize-none"
                  />
                  <p class="text-xs text-muted-foreground">
                    Add an optional note for this transaction
                  </p>
                </div>

                <Button
                  class="w-full"
                  size="lg"
                  :disabled="isTransferring || !transferForm.to || !transferForm.amount || Number(transferForm.amount) <= 0"
                  @click="handleTransfer"
                >
                  <svg
                    v-if="isTransferring"
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
                      d="M2,12A10,10 0 0,1 12,2A10,10 0 0,1 22,12A10,10 0 0,1 12,22A10,10 0 0,1 2,12M18,11H10L13.5,7.5L12.08,6.08L6.16,12L12.08,17.92L13.5,16.5L10,13H18V11Z"
                    />
                  </svg>
                  {{ isTransferring ? 'Processing Transfer...' : 'Send Transfer' }}
                </Button>
              </div>
            </CardContent>
          </Card>

          <!-- Top Holders Section -->
          <Card class="flex flex-col h-full">
            <CardHeader>
              <CardTitle class="flex items-center gap-2">
                <svg
                  width="20"
                  height="20"
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  class="text-primary"
                >
                  <path
                    style="fill: currentColor"
                    d="M16,4C18.11,4 19.81,5.69 19.81,7.8C19.81,9.91 18.11,11.6 16,11.6C13.89,11.6 12.19,9.91 12.19,7.8C12.19,5.69 13.89,4 16,4M16,13.4C18.67,13.4 24,14.73 24,17.4V20H8V17.4C8,14.73 13.33,13.4 16,13.4M8.31,12.7C7.75,12.26 7.12,11.96 6.44,11.84C6.95,11.11 7.31,10.3 7.31,9.36C7.31,7.93 6.75,6.64 5.44,5.9C4.95,5.66 4.41,5.5 3.91,5.44C4.2,5.16 4.53,4.93 4.9,4.76C5.27,4.6 5.66,4.5 6.06,4.5C7.84,4.5 9.19,5.96 9.19,7.8C9.19,9.64 7.84,11.1 6.06,11.1C5.66,11.1 5.27,11 4.9,10.84C5.27,11.01 5.66,11.1 6.06,11.1C6.75,11.1 7.39,10.9 7.94,10.54C8.07,11.13 8.18,11.88 8.31,12.7M6.56,13.4C4.17,13.4 0,14.73 0,17.4V20H6V17.4C6,15.77 6.91,14.32 8.31,13.4H6.56Z"
                  />
                </svg>
                Top Holders
              </CardTitle>
              <CardDescription>
                Accounts with the largest {{ tokenSymbol || tokenName }} balances
              </CardDescription>
            </CardHeader>
            <CardContent class="flex-1">
              <div
                v-if="isLoadingHolders"
                class="space-y-4"
              >
                <div
                  v-for="i in 5"
                  :key="i"
                  class="flex items-center gap-4 p-3 rounded-lg border animate-pulse"
                >
                  <Skeleton class="h-10 w-10 rounded-full flex-shrink-0" />
                  <div class="flex-1 space-y-2">
                    <Skeleton class="h-4 w-32" />
                    <Skeleton class="h-3 w-24" />
                  </div>
                  <div class="text-right space-y-2">
                    <Skeleton class="h-4 w-20" />
                    <Skeleton class="h-3 w-16" />
                  </div>
                </div>
              </div>

              <div
                v-else-if="topHolders.length > 0"
                class="space-y-2"
              >
                <div
                  v-for="(holder, index) in topHolders.slice(0, 10)"
                  :key="holder.user"
                  class="flex items-center gap-4 p-3 rounded-lg border hover:border-primary/20 hover:bg-accent/50 transition-colors"
                >
                  <div class="relative flex-shrink-0">
                    <div class="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-primary/20 to-primary/10 text-sm font-bold text-primary border-2 border-primary/20">
                      {{ index + 1 }}
                    </div>
                    <div
                      v-if="index < 3"
                      class="absolute -top-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center text-xs"
                      :class="{
                        'bg-yellow-500 text-yellow-50': index === 0,
                        'bg-gray-400 text-gray-50': index === 1,
                        'bg-amber-600 text-amber-50': index === 2
                      }"
                    >
                      <svg
                        width="8"
                        height="8"
                        viewBox="0 0 24 24"
                        fill="currentColor"
                      >
                        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                      </svg>
                    </div>
                  </div>

                  <div class="flex-1 min-w-0">
                    <p class="font-semibold text-foreground truncate">
                      {{ holder.user }}
                    </p>
                    <p class="text-sm text-muted-foreground">
                      Rank #{{ holder.rank }}
                    </p>
                  </div>

                  <div class="text-right flex-shrink-0">
                    <p class="font-bold text-foreground">
                      {{ holder.amount }}
                    </p>
                    <p class="text-xs text-muted-foreground">
                      {{ tokenSymbol || 'tokens' }}
                    </p>
                  </div>
                </div>
              </div>

              <div
                v-else
                class="text-center py-12 space-y-4"
              >
                <div class="w-16 h-16 mx-auto bg-muted rounded-full flex items-center justify-center">
                  <svg
                    width="24"
                    height="24"
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    class="text-muted-foreground"
                  >
                    <path
                      style="fill: currentColor"
                      d="M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2M12,17.3C9.5,17.3 7.45,15.25 7.45,12.75C7.45,10.25 9.5,8.2 12,8.2C14.5,8.2 16.55,10.25 16.55,12.75C16.55,15.25 14.5,17.3 12,17.3M12,10.7C10.83,10.7 9.95,11.58 9.95,12.75C9.95,13.92 10.83,14.8 12,14.8C13.17,14.8 14.05,13.92 14.05,12.75C14.05,11.58 13.17,10.7 12,10.7Z"
                    />
                  </svg>
                </div>
                <div>
                  <p class="font-medium text-foreground mb-1">
                    No holder data available
                  </p>
                  <p class="text-sm text-muted-foreground">
                    Top holders information is not available for this token
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  </HTMView>
</template>
