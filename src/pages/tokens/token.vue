<script setup lang="ts">
import { mdiPencilOutline, mdiContentCopy, mdiCheck } from '@mdi/js';
import type { htm_operation } from '@mtyszczak-cargo/htm';
import { onMounted, ref, computed, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { toast } from 'vue-sonner';

import HTMView from '@/components/HTMView.vue';
import MemoInput from '@/components/MemoInput.vue';
import { AlertDescription, Alert } from '@/components/ui/alert';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { useSettingsStore } from '@/stores/settings.store';
import { useTokensStore } from '@/stores/tokens.store';
import { useWalletStore } from '@/stores/wallet.store';
import { getWax } from '@/stores/wax.store';
import { copyText } from '@/utils/copy';
import { isVesting } from '@/utils/nai-tokens';
import { toastError } from '@/utils/parse-error';
import { waitForTransactionStatus } from '@/utils/transaction-status';
import type { CtokensAppToken, CtokensAppBalance, CtokensAppTopHolder } from '@/utils/wallet/ctokens/api';
import CTokensProvider from '@/utils/wallet/ctokens/signer';

// Router
const route = useRoute();
const router = useRouter();

// Stores
const tokensStore = useTokensStore();
const settingsStore = useSettingsStore();
const walletStore = useWalletStore();

// State
const token = ref<CtokensAppToken | null>(null);
const userBalance = ref<CtokensAppBalance | null>(null);
const topHolders = ref<CtokensAppTopHolder[]>([]);
const isLoading = ref(true);
const isLoadingHolders = ref(false);
const isTransferring = ref(false);
const isStaking = ref(false);
const isUnstaking = ref(false);
const isCopied = ref(false);
const isNaiCopied = ref(false);

const isStaked = ref(false);

// Transfer form
const transferForm = ref({
  to: '',
  amount: '',
  memo: ''
});

// Stake/Unstake form
const stakeForm = ref({
  amount: '',
  receiver: '' // Optional: can stake to another account
});

// Get NAI from route parameter
const nai = computed(() => route.query.nai as string);
const precision = computed(() => route.query.precision);

// Check if user is logged in
const isLoggedIn = computed(() => !!tokensStore.wallet);

// Check if current user is the token owner
const isTokenOwner = computed(() => {
  if (!token.value?.owner || !CTokensProvider.getOperationalPublicKey()) return false;
  return token.value.owner === CTokensProvider.getOperationalPublicKey();
});

// Connect to HTM
const connectToHTM = async () => {
  try {
    const hasStoredWallet = await CTokensProvider.hasWallet();

    if (settingsStore.settings?.account || hasStoredWallet) {
      walletStore.isProvideWalletPasswordModalOpen = true;
      return;
    }

    router.push('/tokens/register-account');
  } catch (error) {
    toastError('Failed to connect to HTM', error);
  }
};

const isValidPublicKey = (key: string): boolean => {
  // Simple validation for Hive public key (starts with STM and has correct length)
  const hivePublicKeyRegex = /^STM[0-9A-Za-z]{50}$/;
  return hivePublicKeyRegex.test(key);
};

// Validate recipient address (must be a public key)
const isRecipientValid = computed(() => {
  if (!transferForm.value.to) return false;
  return isValidPublicKey(transferForm.value.to);
});

// Validate amount
const amountValidation = computed(() => {
  if (!transferForm.value.amount || !token.value)
    return { isValid: false, error: '' };

  return validateAmountPrecision(transferForm.value.amount, token.value.precision || 0);
});

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

const tokenOwnerShort = computed(() => {
  if (!token.value?.owner) return '';
  const owner = token.value.owner;
  if (owner.length <= 16) return owner;
  return `${owner.slice(0, 8)}...${owner.slice(-8)}`;
});

const formattedTotalSupply = ref('0');
const formattedMaxSupply = ref('0');
const formattedUserBalance = ref('0.000');

// Formatted top holders with proper balance display
const formattedTopHolders = computed(() => {
  if (!token.value || topHolders.value.length === 0) return [];

  return topHolders.value.map(holder => {
    return {
      ...holder,
      formattedAmount: formatAmount(holder.amount || '0', token.value!.precision || 0)
    };
  });
});

// Helper to format amount synchronously (fallback for top holders)
const formatAmount = (amount: string, precision: number): string => {
  try {
    const num = parseFloat(amount);
    if (isNaN(num)) return amount;

    // Format with precision and add thousand separators
    const parts = num.toFixed(precision).split('.');
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return parts.join('.');
  } catch {
    return amount;
  }
};

// Parse asset amount - convert decimal to base units (integer with precision zeros)
const parseAssetAmount = (amountStr: string, precision: number): string => {
  const [integerPart, fractionalPart = ''] = amountStr.split('.');
  const normalizedFractional = fractionalPart.padEnd(precision, '0').slice(0, precision);
  return integerPart + normalizedFractional;
};

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

    isStaked.value = isVesting(token.value.nai!, token.value.precision || 0);

    // Update formatted values
    await updateFormattedValues();

    // Load user balance if user is logged in
    // FIX THIS
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

// Set max amount - use raw amount without precision formatting
const setMaxAmount = async () => {
  if (!userBalance.value || !token.value) return;

  try {
    // Use the raw amount directly from the balance
    transferForm.value.amount = userBalance.value.amount!;
  } catch (error) {
    console.error('Failed to set max amount:', error);
  }
};

// Validate amount precision and overflow
const validateAmountPrecision = (amount: string, precision: number): { isValid: boolean; error?: string; parsedAmount?: string } => {
  try {
    // Remove thousand separators (commas, spaces) to get clean number
    const cleanAmount = amount.replace(/[,\s]/g, '');

    // Check if amount contains only valid characters (digits, decimal point)
    if (!/^\d*\.?\d*$/.test(cleanAmount))
      return { isValid: false, error: 'Amount must contain only digits and decimal point' };

    // Check if amount is a valid number
    const numAmount = parseFloat(cleanAmount);
    if (isNaN(numAmount) || numAmount <= 0)
      return { isValid: false, error: 'Amount must be a positive number' };

    // Check for infinity
    if (!isFinite(numAmount))
      return { isValid: false, error: 'Amount value is too large' };

    // Check decimal places - count actual decimal places in input
    const decimalIndex = cleanAmount.indexOf('.');
    if (decimalIndex !== -1) {
      const decimalPlaces = cleanAmount.length - decimalIndex - 1;
      if (decimalPlaces > precision) {
        return {
          isValid: false,
          error: `Amount has too many decimal places. Maximum ${precision} decimal places allowed for this token.`
        };
      }
    }

    // Convert to base units to check for overflow
    const multiplier = Math.pow(10, precision);
    const baseUnits = numAmount * multiplier;

    // Check for overflow - ensure it's within safe integer range
    // Maximum safe integer in JavaScript is 2^53 - 1
    const MAX_SAFE_BASE_UNITS = Number.MAX_SAFE_INTEGER;
    if (baseUnits > MAX_SAFE_BASE_UNITS)
      return { isValid: false, error: 'Amount is too large and would cause overflow' };

    // Ensure conversion to base units produces an integer (no precision loss)
    const roundedBaseUnits = Math.round(baseUnits);
    if (Math.abs(baseUnits - roundedBaseUnits) > 0.0001) {
      return {
        isValid: false,
        error: `Amount precision mismatch. Please use at most ${precision} decimal places.`
      };
    }

    // Check if user has sufficient balance
    // Note: Based on API response, userBalance.value.amount appears to be a decimal value
    if (userBalance.value) {
      const userBalanceDecimal = parseFloat(userBalance.value.amount!);
      // Compare decimal values directly (both numAmount and userBalanceDecimal are decimal)
      if (numAmount > userBalanceDecimal)
        return { isValid: false, error: 'Insufficient balance for this transfer' };
    }

    return { isValid: true, parsedAmount: roundedBaseUnits.toString() };
  } catch (_error) {
    return { isValid: false, error: 'Invalid amount format' };
  }
};

// Handle transfer (simplified for now)
const handleTransfer = async () => {
  if (!token.value || !isLoggedIn.value) {
    toastError('You must be logged in to transfer tokens', new Error('Not logged in'));
    return;
  }

  if (!transferForm.value.to || !transferForm.value.amount) {
    toastError('Please fill in recipient address and amount', new Error('Missing fields'));
    return;
  }

  // Validate that recipient is a public key, not a Hive account name
  if (!isValidPublicKey(transferForm.value.to)) {
    toastError('Invalid recipient address', new Error('Recipient must be a valid public key address (starts with STM)'));
    return;
  }

  // Validate amount precision and check for overflow
  const validation = validateAmountPrecision(transferForm.value.amount, token.value.precision || 0);
  if (!validation.isValid) {
    toastError('Invalid amount', new Error(validation.error || 'Invalid amount format'));
    return;
  }

  if (typeof settingsStore.settings.account === 'undefined' || walletStore.isL2Wallet)
    throw new Error('Transferring via proxy is not supported yet. Please log in using your L1 wallet first.');

  try {
    isTransferring.value = true;

    // Convert decimal amount to base units (add precision zeros)
    const baseAmount = parseAssetAmount(transferForm.value.amount, token.value.precision || 0);

    // Wait for transaction status
    await waitForTransactionStatus(
      () => ([{
        token_transfer_operation: {
          amount: {
            amount: baseAmount,
            nai: token.value!.nai!,
            precision: token.value!.precision || 0
          },
          receiver: transferForm.value.to,
          sender: CTokensProvider.getOperationalPublicKey()!,
          memo: transferForm.value.memo
        }
      } satisfies htm_operation]),
      'Transfer'
    );

    // Reset form on success
    transferForm.value = {
      to: '',
      amount: '',
      memo: ''
    };

    // Reload user balance
    await Promise.allSettled([
      tokensStore.loadBalances(true),
      loadTokenDetails(),
      loadTopHolders()
    ]);
    userBalance.value = tokensStore.balances.find((b: CtokensAppBalance) => b.nai === nai.value) || null;
  } catch (error) {
    toastError('Transfer failed', error);
  } finally {
    isTransferring.value = false;
  }
};

// Handle stake tokens
const handleStake = async () => {
  if (!token.value || !isLoggedIn.value) {
    toastError('You must be logged in to stake tokens', new Error('Not logged in'));
    return;
  }

  if (!tokensStore.wallet?.publicKey) {
    toastError('HTM wallet not available', new Error('No wallet'));
    return;
  }

  if (!stakeForm.value.amount) {
    toastError('Please enter amount to stake', new Error('Missing amount'));
    return;
  }

  // Check if staking is allowed
  if (!token.value.others_can_stake && !isTokenOwner.value) {
    toastError('Staking is not allowed for this token', new Error('Staking disabled'));
    return;
  }

  // Validate amount precision
  const validation = validateAmountPrecision(stakeForm.value.amount, token.value.precision || 0);
  if (!validation.isValid) {
    toastError('Invalid amount', new Error(validation.error || 'Invalid amount format'));
    return;
  }

  // Validate receiver if provided
  if (stakeForm.value.receiver && !isValidPublicKey(stakeForm.value.receiver)) {
    toastError('Invalid receiver address', new Error('Receiver must be a valid public key'));
    return;
  }

  try {
    isStaking.value = true;

    // Convert decimal amount to base units (add precision zeros)
    const baseAmount = parseAssetAmount(stakeForm.value.amount, token.value.precision || 0);

    // Wait for transaction status
    await waitForTransactionStatus(
      () => ([{
        token_transform_operation: {
          holder: CTokensProvider.getOperationalPublicKey()!,
          receiver: stakeForm.value.receiver || undefined,
          amount: {
            amount: baseAmount,
            nai: token.value!.nai!,
            precision: token.value!.precision || 0
          }
        }
      } satisfies htm_operation]),
      'Stake'
    );

    // Reset form on success
    stakeForm.value = {
      amount: '',
      receiver: ''
    };

    // Reload user balance
    await Promise.allSettled([
      tokensStore.loadBalances(true),
      loadTokenDetails(),
      loadTopHolders()
    ]);
    userBalance.value = tokensStore.balances.find((b: CtokensAppBalance) => b.nai === nai.value) || null;
  } catch (error) {
    toastError('Staking failed', error);
  } finally {
    isStaking.value = false;
  }
};

// Handle unstake tokens
const handleUnstake = async () => {
  if (!token.value || !isLoggedIn.value) {
    toastError('You must be logged in to unstake tokens', new Error('Not logged in'));
    return;
  }

  if (!tokensStore.wallet?.publicKey) {
    toastError('HTM wallet not available', new Error('No wallet'));
    return;
  }

  if (!stakeForm.value.amount) {
    toastError('Please enter amount to unstake', new Error('Missing amount'));
    return;
  }

  // Check if unstaking is allowed
  if (!token.value.others_can_unstake && !isTokenOwner.value) {
    toastError('Unstaking is not allowed for this token', new Error('Unstaking disabled'));
    return;
  }

  // Validate amount precision
  const validation = validateAmountPrecision(stakeForm.value.amount, token.value.precision || 0);
  if (!validation.isValid) {
    toastError('Invalid amount', new Error(validation.error || 'Invalid amount format'));
    return;
  }

  // Validate receiver if provided
  if (stakeForm.value.receiver && !isValidPublicKey(stakeForm.value.receiver)) {
    toastError('Invalid receiver address', new Error('Receiver must be a valid public key'));
    return;
  }

  try {
    isUnstaking.value = true;

    // Convert decimal amount to base units (add precision zeros)
    const baseAmount = parseAssetAmount(stakeForm.value.amount, token.value.precision || 0);

    // Wait for transaction status
    await waitForTransactionStatus(
      () => ([{
        token_transform_operation: {
          holder: CTokensProvider.getOperationalPublicKey()!,
          receiver: stakeForm.value.receiver || undefined,
          amount: {
            amount: baseAmount,
            nai: token.value!.nai!,
            precision: token.value!.precision || 0
          }
        }
      } satisfies htm_operation]),
      'Unstake'
    );

    // Reset form on success
    stakeForm.value = {
      amount: '',
      receiver: ''
    };

    // Reload user balance
    await Promise.allSettled([
      tokensStore.loadBalances(true),
      loadTokenDetails(),
      loadTopHolders()
    ]);
    userBalance.value = tokensStore.balances.find((b: CtokensAppBalance) => b.nai === nai.value) || null;
  } catch (error) {
    toastError('Unstaking failed', error);
  } finally {
    isUnstaking.value = false;
  }
};

// Navigate back to token list
const goBack = () => {
  router.push('/tokens/list');
};

// Navigate to edit token
const editToken = () => {
  router.push({
    path: '/tokens/edit',
    query: { nai: token.value?.nai, precision: token.value?.precision }
  });
};

// Copy owner address to clipboard
const copyOwnerAddress = () => {
  if (!token.value?.owner) return;

  try {
    copyText(token.value.owner);
    toast.success('Owner address copied to clipboard');
    isCopied.value = true;
    setTimeout(() => {
      isCopied.value = false;
    }, 1000);
  } catch (_error) {
    toast.error('Failed to copy address');
  }
};

// Copy NAI to clipboard
const copyNAI = () => {
  if (!token.value?.nai) return;

  try {
    copyText(token.value.nai);
    toast.success('NAI copied to clipboard');
    isNaiCopied.value = true;
    setTimeout(() => {
      isNaiCopied.value = false;
    }, 1000);
  } catch (_error) {
    toast.error('Failed to copy NAI');
  }
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
          v-if="isTokenOwner"
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
                <AvatarFallback>
                  <svg
                    v-if="!tokenImage"
                    width="48"
                    height="48"
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
                    class="text-xl sm:text-2xl font-bold text-primary"
                  >
                    {{ tokenSymbol ? tokenSymbol.slice(0, 2).toUpperCase() : tokenName.slice(0, 2).toUpperCase() }}
                  </span>
                </AvatarFallback>
              </Avatar>

              <div class="flex-1 min-w-0">
                <div class="flex flex-col sm:flex-row sm:items-center gap-2 mb-3">
                  <h1 class="text-2xl sm:text-3xl font-bold text-foreground">
                    {{ tokenName }}
                  </h1>
                  <span
                    v-if="token.is_nft"
                    class="inline-flex items-center rounded-md bg-purple-500/10 text-[16px]/[18px] px-2 font-medium text-purple-500 border border-purple-500/20"
                  >
                    nft
                  </span>
                  <span
                    v-if="isStaked"
                    class="inline-flex items-center rounded-md bg-blue-500/10  text-[16px]/[18px] px-2 font-medium text-blue-500 border border-blue-500/20"
                  >
                    staked
                  </span>
                </div>

                <p
                  v-if="tokenDescription"
                  class="text-muted-foreground text-base mb-4 leading-relaxed"
                  style="word-break:break-word"
                >
                  {{ tokenDescription }}
                </p>

                <!-- Technical Details - Compact -->
                <div class="flex flex-wrap items-center gap-3 text-sm text-muted-foreground mb-4">
                  <div class="flex items-center gap-1">
                    <span class="font-medium">NAI:</span>
                    <button
                      type="button"
                      class="bg-muted px-1.5 py-0.5 rounded text-xs font-mono hover:bg-muted/80 transition-colors inline-flex items-center gap-1.5"
                      @click="copyNAI"
                    >
                      {{ token.nai }}
                      <svg
                        width="14"
                        height="14"
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        class="transition-all"
                      >
                        <path
                          style="fill: currentColor"
                          :d="isNaiCopied ? mdiCheck : mdiContentCopy"
                        />
                      </svg>
                    </button>
                  </div>
                  <div class="flex items-center gap-1">
                    <span class="font-medium">Precision:</span>
                    <span class="bg-muted px-1.5 py-0.5 rounded text-xs">{{ token.precision }}</span>
                  </div>
                  <div class="flex items-center gap-1">
                    <span class="font-medium">Owner:</span>
                    <button
                      type="button"
                      class="bg-muted px-1.5 py-0.5 rounded text-xs font-mono hover:bg-muted/80 transition-colors inline-flex items-center gap-1.5"
                      @click="copyOwnerAddress"
                    >
                      {{ tokenOwnerShort }}
                      <svg
                        width="14"
                        height="14"
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        class="transition-all"
                      >
                        <path
                          style="fill: currentColor"
                          :d="isCopied ? mdiCheck : mdiContentCopy"
                        />
                      </svg>
                    </button>
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
              <!-- Not logged in state -->
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
                  @click="connectToHTM"
                >
                  Connect Wallet
                </Button>
              </div>

              <!-- No balance / token not owned state -->
              <div
                v-else-if="!userBalance || Number(userBalance.amount) === 0"
                class="text-center py-12 space-y-4"
              >
                <div class="w-16 h-16 mx-auto bg-amber-100 dark:bg-amber-900/20 rounded-full flex items-center justify-center">
                  <svg
                    width="24"
                    height="24"
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    class="text-amber-600 dark:text-amber-400"
                  >
                    <path
                      style="fill: currentColor"
                      d="M13,9H11V7H13M13,17H11V11H13M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2Z"
                    />
                  </svg>
                </div>
                <div>
                  <p class="text-foreground font-semibold mb-2">
                    You don't own this token
                  </p>
                  <p class="text-sm text-muted-foreground">
                    Your account doesn't have any {{ tokenSymbol || tokenName }} tokens to transfer.
                  </p>
                </div>
              </div>

              <!-- Transfer form - only shown when logged in and has balance -->
              <div
                v-else
                class="space-y-5"
              >
                <div class="space-y-2">
                  <Label
                    for="recipient"
                    class="text-sm font-medium text-foreground"
                  >
                    Recipient Address (Public Key)
                  </Label>
                  <Input
                    id="recipient"
                    v-model="transferForm.to"
                    placeholder="Enter recipient public key address (STM...)"
                    :disabled="isTransferring"
                    class="transition-colors font-mono text-sm"
                    :class="transferForm.to ? (isRecipientValid ? 'border-green-500 focus-visible:ring-green-500' : 'border-red-500 focus-visible:ring-red-500') : ''"
                  />
                  <p class="text-xs text-muted-foreground">
                    Enter a valid public key address starting with STM (not a Hive account name)
                  </p>
                  <p
                    v-if="transferForm.to && !isRecipientValid"
                    class="text-xs text-red-500"
                  >
                    Invalid address format. Must be a public key (STM...)
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
                      type="text"
                      inputmode="decimal"
                      :placeholder="`Amount in ${tokenSymbol || tokenName}`"
                      :disabled="isTransferring"
                      class="pr-20 transition-colors"
                      :class="transferForm.amount ? (amountValidation.isValid ? 'border-green-500 focus-visible:ring-green-500' : 'border-red-500 focus-visible:ring-red-500') : ''"
                    />
                    <span class="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground font-medium">
                      {{ tokenSymbol }}
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
                      @click="setMaxAmount"
                    >
                      MAX
                    </button>
                  </div>
                  <p
                    v-if="token"
                    class="text-xs text-muted-foreground"
                  >
                    Precision: {{ token.precision }} decimal places
                  </p>
                  <p
                    v-if="transferForm.amount && !amountValidation.isValid && amountValidation.error"
                    class="text-xs text-red-500"
                  >
                    {{ amountValidation.error }}
                  </p>
                </div>

                <MemoInput
                  v-model="transferForm.memo"
                  :disabled="isTransferring"
                />

                <Button
                  class="w-full"
                  size="lg"
                  :disabled="isTransferring || !isRecipientValid || !amountValidation.isValid"
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

          <!-- Stake/Unstake Section -->
          <Card
            v-if="token && (token.others_can_stake || token.others_can_unstake || isTokenOwner)"
            class="flex flex-col h-full"
          >
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
                    d="M12,2A7,7 0 0,1 19,9C19,11.38 17.81,13.47 16,14.74V17A1,1 0 0,1 15,18H9A1,1 0 0,1 8,17V14.74C6.19,13.47 5,11.38 5,9A7,7 0 0,1 12,2M9,21V20H15V21A1,1 0 0,1 14,22H10A1,1 0 0,1 9,21M12,4A5,5 0 0,0 7,9C7,11.05 8.23,12.81 10,13.58V16H14V13.58C15.77,12.81 17,11.05 17,9A5,5 0 0,0 12,4Z"
                  />
                </svg>
                Stake / Unstake Tokens
              </CardTitle>
              <CardDescription>
                Transform between liquid and staked tokens
              </CardDescription>
            </CardHeader>
            <CardContent class="space-y-6 flex-1">
              <!-- Not logged in state -->
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
                  Connect your wallet to stake/unstake tokens
                </p>
                <Button
                  size="lg"
                  @click="connectToHTM"
                >
                  Connect Wallet
                </Button>
              </div>

              <!-- No balance state -->
              <div
                v-else-if="!userBalance || Number(userBalance.amount) === 0"
                class="text-center py-12 space-y-4"
              >
                <div class="w-16 h-16 mx-auto bg-amber-100 dark:bg-amber-900/20 rounded-full flex items-center justify-center">
                  <svg
                    width="24"
                    height="24"
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    class="text-amber-600 dark:text-amber-400"
                  >
                    <path
                      style="fill: currentColor"
                      d="M13,9H11V7H13M13,17H11V11H13M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2Z"
                    />
                  </svg>
                </div>
                <div>
                  <p class="text-foreground font-semibold mb-2">
                    You don't own this token
                  </p>
                  <p class="text-sm text-muted-foreground">
                    Your account doesn't have any {{ tokenSymbol || tokenName }} tokens to stake/unstake.
                  </p>
                </div>
              </div>

              <!-- Stake/Unstake form -->
              <div
                v-else
                class="space-y-5"
              >
                <div class="space-y-2">
                  <Label
                    for="stake-amount"
                    class="text-sm font-medium text-foreground"
                  >
                    Amount
                  </Label>
                  <div class="relative">
                    <Input
                      id="stake-amount"
                      v-model="stakeForm.amount"
                      type="text"
                      inputmode="decimal"
                      :placeholder="`Amount in ${tokenSymbol || tokenName}`"
                      :disabled="isStaking || isUnstaking"
                      class="pr-20 transition-colors"
                    />
                    <span class="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground font-medium">
                      {{ tokenSymbol }}
                    </span>
                  </div>
                  <p
                    v-if="token"
                    class="text-xs text-muted-foreground"
                  >
                    Precision: {{ token.precision }} decimal places
                  </p>
                </div>

                <div class="space-y-2">
                  <Label
                    for="stake-receiver"
                    class="text-sm font-medium text-foreground"
                  >
                    Receiver (Optional)
                  </Label>
                  <Input
                    id="stake-receiver"
                    v-model="stakeForm.receiver"
                    placeholder="Receiver public key (defaults to you)"
                    :disabled="isStaking || isUnstaking"
                    class="transition-colors font-mono text-sm"
                  />
                  <p class="text-xs text-muted-foreground">
                    Leave empty to stake/unstake to yourself
                  </p>
                </div>

                <div class="grid grid-cols-2 gap-3">
                  <Button
                    v-if="token.others_can_stake || isTokenOwner"
                    size="lg"
                    :disabled="isStaking || isUnstaking || !stakeForm.amount"
                    @click="handleStake"
                  >
                    <svg
                      v-if="isStaking"
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
                        d="M12,2A7,7 0 0,1 19,9C19,11.38 17.81,13.47 16,14.74V17A1,1 0 0,1 15,18H9A1,1 0 0,1 8,17V14.74C6.19,13.47 5,11.38 5,9A7,7 0 0,1 12,2Z"
                      />
                    </svg>
                    {{ isStaking ? 'Staking...' : 'Stake' }}
                  </Button>

                  <Button
                    v-if="token.others_can_unstake || isTokenOwner"
                    variant="outline"
                    size="lg"
                    :disabled="isStaking || isUnstaking || !stakeForm.amount"
                    @click="handleUnstake"
                  >
                    <svg
                      v-if="isUnstaking"
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
                        d="M12,2A7,7 0 0,1 19,9C19,11.38 17.81,13.47 16,14.74V17A1,1 0 0,1 15,18H9A1,1 0 0,1 8,17V14.74C6.19,13.47 5,11.38 5,9A7,7 0 0,1 12,2M12,4A5,5 0 0,0 7,9C7,11.05 8.23,12.81 10,13.58V16H14V13.58C15.77,12.81 17,11.05 17,9A5,5 0 0,0 12,4Z"
                      />
                    </svg>
                    {{ isUnstaking ? 'Unstaking...' : 'Unstake' }}
                  </Button>
                </div>

                <Alert
                  v-if="!token.others_can_stake && !isTokenOwner"
                  class="bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800"
                >
                  <AlertDescription class="text-amber-800 dark:text-amber-200 text-sm">
                    ⚠️ Staking is disabled for this token (only owner can stake)
                  </AlertDescription>
                </Alert>

                <Alert
                  v-if="!token.others_can_unstake && !isTokenOwner"
                  class="bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800"
                >
                  <AlertDescription class="text-amber-800 dark:text-amber-200 text-sm">
                    ⚠️ Unstaking is disabled for this token (only owner can unstake)
                  </AlertDescription>
                </Alert>
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
                  v-for="(holder, index) in formattedTopHolders.slice(0, 10)"
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
                      {{ holder.formattedAmount }}
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
