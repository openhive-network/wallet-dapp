<script setup lang="ts">
import { mdiArrowLeft, mdiArrowUp, mdiArrowDown, mdiCheckCircle } from '@mdi/js';
import type { htm_operation } from '@mtyszczak-cargo/htm';
import { computed, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { toast } from 'vue-sonner';

import HTMView from '@/components/HTMView.vue';
import TokenSelector from '@/components/tokens/TokenSelector.vue';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { useSettingsStore } from '@/stores/settings.store';
import { useTokensStore } from '@/stores/tokens.store';
import { useUserStore } from '@/stores/user.store';
import { useWalletStore } from '@/stores/wallet.store';
import { getWax } from '@/stores/wax.store';
import { toastError } from '@/utils/parse-error';
import { waitForTransactionStatus } from '@/utils/transaction-status';
import type { CtokensAppToken, CtokensAppBalance } from '@/utils/wallet/ctokens/api';
import CTokensProvider from '@/utils/wallet/ctokens/signer';

import QRCodeCard from '~/src/components/tokens/QRCodeCard.vue';
import { Tooltip, TooltipTrigger, TooltipProvider, TooltipContent } from '~/src/components/ui/tooltip';

// Router
const route = useRoute();
const router = useRouter();

const settingsStore = useSettingsStore();
const tokensStore = useTokensStore();
const walletStore = useWalletStore();
const userStore = useUserStore();

// State
const token = ref<CtokensAppToken | null>(null);
const isLoading = ref(true);
const isUpdating = ref(false);
const isSending = ref(false);
const addingMemo = ref(false);
const transferCompleted = ref(false);

// Summary of the last transfer (snapshot at time of send)
const sentSummary = ref<{ amount: string; tokenLabel: string; receiver: string; remainingBalance?: string; timestamp?: string } | null>(null);

// UI toggles for compact view
const showDetails = ref(false);

// Form state
const form = ref({
  nai: '',
  precision: '',
  amount: '',
  memo: ''
});

// Selected token NAI from TokenSelector (used when only 'to' is provided)
const selectedTokenNai = ref<string>('');

// Get NAI and precision from route parameters or form or selected token
const nai = computed(() => {
  if (route.query.nai) return route.query.nai as string;
  if (selectedTokenNai.value) return selectedTokenNai.value;
  return form.value.nai;
});
const precision = computed(() => route.query.precision as string || form.value.precision);
const receiverKey = computed(() => route.query.to as string || CTokensProvider.getOperationalPublicKey());
const queryAmount = computed(() => route.query.amount as string | undefined);
const queryMemo = computed(() => route.query.memo as string | undefined);

// Check if NAI is provided in URL
const hasNaiFromUrl = computed(() => !!route.query.nai);

// Check if we're in receive mode (when 'to' is in query params)
// When 'to' is present, we're actually sending (confirming a transfer request)
const isReceiveMode = computed(() => !!route.query.to);

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
  } catch (_error) {
    // toastError('Error fetching HTM user data', error); // TODO: Reformat this code to better handle edge cases...
  }
};

// Check if we should show token selector (when only 'to' is provided)
const shouldShowTokenSelector = computed(() => {
  return isReceiveMode.value && !hasNaiFromUrl.value && isLoggedIn.value;
});

const userOperationalKey = computed(() => CTokensProvider.getOperationalPublicKey());

// Check if user is logged in
const isLoggedIn = computed(() => !!settingsStore.settings.account);

// Check if current user is the token owner

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

// Receiver display helpers (compact UI)
const receiverDisplayName = computed(() => {
  // In receive mode the recipient is you — prefer parsed user name (L2 if available)
  if (isReceiveMode.value) {
    // userStore.name is a transformed display name if parseUserData ran
    const name = userStore.name || settingsStore.settings.account || userOperationalKey.value || '';
    if (name) return name;
    return 'You';
  }

  // Otherwise prefer explicit name from query if present
  const qName = route.query.toName as string | undefined;
  if (qName && qName.trim()) return qName;

  // Fall back to short key derived from receiverKey
  const rk = receiverKey.value;
  if (!rk) return '';
  return `${rk.slice(0, 6)}…${rk.slice(-4)}`;
});

const receiverShortKey = computed(() =>
  isReceiveMode.value
    ? (userOperationalKey.value || '')
    : (receiverKey.value ? `${receiverKey.value.slice(0, 8)}…` : '')
);

const tokenImage = computed(() => {
  if (!token.value) return '';
  const metadata = token.value.metadata as { image?: string } | undefined;
  return metadata?.image || '';
});

const receiverAvatarLetter = computed(() => {
  const name = receiverDisplayName.value;
  if (!name) return '?';
  // Use first non-space character as avatar letter
  const ch = name.trim().charAt(0).toUpperCase();
  return ch || '?';
});

const amountValidation = computed(() => {
  if (!form.value.amount) {
    // Empty amount is valid (amount is optional)
    return { isValid: true, error: '' };
  }
  if (!token.value) {
    // If token is not loaded, don't validate amount
    return { isValid: true, error: '' };
  }
  return validateAmountPrecision(form.value.amount, token.value.precision || 0);
});

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

    return { isValid: true, parsedAmount: roundedBaseUnits.toString() };
  } catch (_error) {
    return { isValid: false, error: 'Invalid amount format' };
  }
};

// Form validation
const isFormValid = computed(() => {
  // Receive mode: only token and amount validation matter
  if (isReceiveMode.value) {
    if (!token.value) return false;
    if (form.value.amount.trim() === '') return true;
    return amountValidation.value.isValid;
  }
  // Send mode: NAI and precision required if not from URL or selector
  if (!hasNaiFromUrl.value && !shouldShowTokenSelector.value) {
    if (!form.value.nai.trim() || !form.value.precision.trim()) return false;
    const precisionNum = parseInt(form.value.precision);
    if (isNaN(precisionNum) || precisionNum < 0 || precisionNum > 18) return false;
  }
  if (shouldShowTokenSelector.value && !selectedTokenNai.value) return false;
  if (form.value.amount.trim() === '') return true;
  return amountValidation.value.isValid;
});

// Watch NAI and precision changes to load token details
watch([() => form.value.nai, () => form.value.precision], async (newValues, oldValues) => {
  const [newNai, newPrecision] = newValues;
  const [oldNai, oldPrecision] = oldValues;

  // Only load if both are provided and have changed
  if (newNai && newPrecision && (newNai !== oldNai || newPrecision !== oldPrecision)) {
    isLoading.value = true;
    await loadTokenDetails();
    isLoading.value = false;
  }
});

// Watch selected token NAI changes to load token details
watch(selectedTokenNai, async (newNai, oldNai) => {
  if (newNai && newNai !== oldNai && shouldShowTokenSelector.value) {
    isLoading.value = true;
    // Get precision from the selected token's balance
    const balance = tokensStore.balances.find(b => b.nai === newNai);
    if (balance) {
      form.value.precision = balance.precision?.toString() || '';
      form.value.nai = newNai;
      await loadTokenDetails();
    } else
      token.value = null;

    isLoading.value = false;
  }
});

// Parse asset amount - convert decimal to base units (integer with precision zeros)
const parseAssetAmount = (amountStr: string, precision: number): string => {
  const [integerPart, fractionalPart = ''] = amountStr.split('.');
  const normalizedFractional = fractionalPart.padEnd(precision, '0').slice(0, precision);
  return integerPart + normalizedFractional;
};

// Helper to format decimal amounts (used synchronously when wax formatter isn't available)
const formatAmount = (amount: string, precision: number, symbol?: string) => {
  try {
    const num = parseFloat(amount);
    if (isNaN(num)) return amount;

    // Format with precision and add thousand separators
    const parts = num.toFixed(precision).split('.');
    parts[0] = parts[0]!.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    const formatted = parts.join('.');
    return symbol ? `${formatted} ${symbol}` : formatted;
  } catch {
    return amount;
  }
};

// Compute remaining balance for currently selected token from tokens store (display-friendly)
const remainingBalanceDisplay = computed(() => {
  if (!token.value) return '';
  const balance = tokensStore.balances.find((b: CtokensAppBalance) => b.nai === token.value!.nai) as CtokensAppBalance | undefined;
  if (!balance || !balance.amount) return '';

  return formatAmount(balance.amount!, token.value!.precision || 0, tokenSymbol.value || tokenName.value);
});

// Handle send transaction
const handleSend = async () => {
  if (!token.value) {
    toastError('Token not loaded', new Error('Token details not available'));
    return;
  }

  // Check if user is logged in - if not, prompt them to log in first
  if (!isLoggedIn.value || !CTokensProvider.getOperationalPublicKey()) {
    toast.error('Please log in to your wallet first');
    // Redirect to home page for login
    router.push({
      path: '/',
      query: {
        // Store the current URL to redirect back after login
        redirect: route.fullPath
      }
    });
    return;
  }

  if (!form.value.amount || !receiverKey.value) {
    toastError('Missing required fields', new Error('Amount and receiver are required'));
    return;
  }

  // Validate amount
  if (!amountValidation.value.isValid) {
    toastError('Invalid amount', new Error(amountValidation.value.error || 'Invalid amount format'));
    return;
  }

  if (typeof settingsStore.settings.account === 'undefined' || walletStore.isL2Wallet)
    throw new Error('Transferring via proxy is not supported yet. Please log in using your L1 wallet first.');

  try {
    isSending.value = true;

    // Convert decimal amount to base units (add precision zeros)
    const baseAmount = parseAssetAmount(form.value.amount, token.value.precision || 0);

    // Wait for transaction status and capture its result if available
    await waitForTransactionStatus(
      () => ([{
        token_transfer_operation: {
          amount: {
            amount: baseAmount,
            nai: token.value!.nai!,
            precision: token.value!.precision || 0
          },
          receiver: receiverKey.value!,
          sender: CTokensProvider.getOperationalPublicKey()!,
          memo: form.value.memo
        }
      } satisfies htm_operation]),
      'Transfer'
    );

    toast.success('Token sent successfully!');

    // Mark transfer as completed to show invoice generation option
    transferCompleted.value = true;

    // Reload balances so we can compute remaining balance
    await tokensStore.loadBalances(true);

    // Capture a snapshot summary to show to the user (amount, token label, receiver and remaining balance)
    const receiverLabel = receiverDisplayName.value || receiverShortKey.value || receiverKey.value || 'Recipient';
    const tokenLabel = tokenSymbol.value || tokenName.value || token.value!.nai || '';

    // Compute remaining balance if available using the same approach as token.vue (balance.amount decimal string)
    let remaining = '';
    const balanceObj = tokensStore.balances.find((b: CtokensAppBalance) => b.nai === token.value!.nai) as CtokensAppBalance | undefined;
    if (balanceObj && balanceObj.amount) {
      try {
        // Prefer wax formatter for localized formatting when available
        const wax = await getWax();
        const formatted = wax.formatter.formatNumber(balanceObj.amount!, token.value!.precision || 0);
        remaining = tokenSymbol.value ? `${formatted} ${tokenSymbol.value}` : formatted;
      } catch (_e) {
        // Fallback to synchronous formatter
        remaining = formatAmount(balanceObj.amount!, token.value!.precision || 0, tokenSymbol.value || tokenName.value);
      }
    }

    const ts = new Date().toISOString();

    sentSummary.value = {
      amount: form.value.amount,
      tokenLabel,
      receiver: receiverLabel,
      remainingBalance: remaining,
      timestamp: ts
    };
  } catch (error) {
    toastError('Transfer failed', error);
  } finally {
    isSending.value = false;
  }
};

// Load token details
const loadTokenDetails = async () => {
  if (!nai.value) return;

  try {
    const wax = await getWax();

    // Fetch token details by NAI
    const params: { nai: string; precision?: number } = { nai: nai.value };
    if (precision.value) params.precision = Number(precision.value);
    const tokens = await wax.restApi.ctokensApi.registeredTokens(params);

    if (!tokens || tokens.length === 0)
      throw new Error(`Token with NAI ${nai.value} not found`);

    token.value = tokens[0]!.liquid?.nai === nai.value ? tokens[0]!.liquid! : tokens[0]?.vesting?.nai === nai.value ? tokens[0]!.vesting! : null;

    if (!token.value)
      throw new Error(`Token with NAI ${nai.value} not found`);

    // Update precision if not set from balance
    if (token.value && !form.value.precision)
      form.value.precision = token.value.precision?.toString() || '';
  } catch (error) {
    toastError('Failed to load token details', error);
    router.push('/tokens/list');
  }
};

// Navigate back to token detail
const goBack = () => {
  router.push({
    path: '/tokens/token',
    query: { nai: nai.value, precision: precision.value }
  });
};

// Generate invoice
const generateInvoice = () => {
  const params = new URLSearchParams({
    fromPk: isReceiveMode.value ? userOperationalKey.value || '' : userOperationalKey.value || '',
    toPk: isReceiveMode.value ? receiverKey.value || '' : userOperationalKey.value || '',
    amount: form.value.amount || '0',
    nai: nai.value,
    precision: precision.value
  });

  // Add optional fields
  if (form.value.memo)
    params.append('memo', form.value.memo);

  // You can add names if they are available from your stores/context
  // params.append('fromName', 'Sender Name');
  // params.append('toName', 'Receiver Name');

  router.push({
    path: '/tokens/invoice',
    query: Object.fromEntries(params)
  });
};

// Initialize
onMounted(async () => {
  // In receive mode (when someone scans QR code), allow viewing without login
  // Login will be required when clicking "Send Token"
  if (!isLoggedIn.value && !isReceiveMode.value) {
    // Only require login immediately in send/generate QR mode
    toast.error('You must be logged in to use this feature');
    return;
  }

  isLoading.value = true;

  // Load user balances if logged in (needed for token selector)
  if (isLoggedIn.value) {
    await tokensStore.loadBalances();
    await fetchHTMUserData();
  }

  // Initialize form with query params
  form.value.nai = route.query.nai as string || '';
  form.value.precision = route.query.precision as string || '';

  // Initialize form with query params if in receive mode
  if (isReceiveMode.value) {
    form.value.amount = queryAmount.value || '';
    form.value.memo = queryMemo.value || '';
    if (form.value.memo)
      addingMemo.value = true;
  }

  // Load token details if NAI and precision are available
  if (nai.value && precision.value)
    await loadTokenDetails();

  isLoading.value = false;
});

// If the user logs in after the page mounted (for example after entering password),
// reload balances, HTM user metadata, token details and QR code as needed.
watch(isLoggedIn, async (loggedIn, wasLoggedIn) => {
  // Only act when the user becomes logged in
  if (!loggedIn || wasLoggedIn === loggedIn) return;

  isLoading.value = true;

  try {
    // Load balances and HTM metadata now that we have an authenticated session
    await tokensStore.loadBalances();
    await fetchHTMUserData();

    // If nai/precision available, load token details
    if (nai.value && precision.value)
      await loadTokenDetails();
  } catch (e) {
    // swallow - errors are handled inside the helpers (toastError)
    console.error('Error reloading data after login', e);
  } finally {
    isLoading.value = false;
  }
});

// Also watch the tokens store wallet instance - this changes when CTokensProvider is set
// (e.g., user unlocked their HTM wallet). React to that to load HTM-related data.
watch(() => tokensStore.wallet, async (newWallet, oldWallet) => {
  if (!newWallet || newWallet === oldWallet) return;

  isLoading.value = true;

  try {
    await tokensStore.loadBalances();
    await fetchHTMUserData();

    if (nai.value && precision.value)
      await loadTokenDetails();
  } catch (e) {
    console.error('Error reloading data after tokensStore.wallet changed', e);
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
          v-if="hasNaiFromUrl || selectedTokenNai"
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

      <!-- Send Form -->
      <div
        v-else-if="(token && isLoggedIn) || isReceiveMode"
        class="space-y-6"
      >
        <!-- Page Title -->
        <div>
          <h1 class="text-3xl font-bold text-foreground mb-2">
            {{ isReceiveMode ? 'Send Token' : (hasNaiFromUrl ? 'Receive Token' : 'Send/Receive Token') }}
          </h1>
          <p class="text-muted-foreground">
            {{ isReceiveMode ? 'Confirm and send the token transfer.' : (hasNaiFromUrl ? 'Scan the generated QR code and transfer the token.' : 'Enter token details and generate a QR code for transfer.') }}
          </p>
        </div>

        <!-- Send token Card -->
        <Card>
          <CardHeader>
            <CardTitle>Transfer details</CardTitle>
            <CardDescription>
              {{ isReceiveMode ? 'Review the transfer details' : (hasNaiFromUrl ? 'Specify the transfer amount' : 'Enter token details and specify the transfer amount') }}
            </CardDescription>
          </CardHeader>
          <CardContent class="space-y-4">
            <!-- Compact recipient + token summary -->
            <div class="flex items-center justify-between gap-4">
              <div>
                <span class="inline-flex items-center text-xs font-semibold uppercase px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">{{ isReceiveMode ? 'Recipient' : 'Receiver' }}</span>
                <div class="flex items-center gap-3 min-w-0 mt-3">
                  <div class="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-sm font-semibold text-foreground flex-shrink-0">
                    {{ htmUserMetadata?.profileImage ? htmUserMetadata.profileImage  : receiverAvatarLetter }}
                  </div>
                  <div class="flex flex-col min-w-0">
                    <div class="text-sm font-bold truncate">{{ htmUserMetadata?.displayName }}</div>
                    <div class="text-xs text-muted-foreground truncate">{{ receiverShortKey }}</div>
                  </div>
                </div>
              </div>
              <div class="flex flex-col items-center text-right">
                <Avatar class="h-10 w-10 sm:h-14 sm:w-14 flex-shrink-0">
                  <AvatarImage
                    v-if="tokenImage"
                    :src="tokenImage"
                    :alt="tokenName"
                  />
                  <AvatarFallback>
                    <svg
                      v-if="!tokenImage"
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
                      class="text-xl sm:text-2xl font-bold text-primary"
                    >
                      {{ tokenSymbol ? tokenSymbol.slice(0, 2).toUpperCase() : tokenName.slice(0, 2).toUpperCase() }}
                    </span>
                  </AvatarFallback>
                </Avatar>
                <div class="text-xs text-muted-foreground mt-2">{{ form.amount || '—' }}</div>
              </div>
            </div>

            <!-- Token selector (compact) -->
            <div v-if="shouldShowTokenSelector" class="mt-1">
              <Label for="amount" class="text-sm font-medium text-foreground">Amount</Label>
              <div class="flex items-center w-full">
                <div class="w-[75%]">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger as-child>
                        <Input id="amount" v-model="form.amount" :disabled="!selectedTokenNai" type="text" inputmode="decimal" :placeholder="`Amount in ${tokenSymbol || tokenName}`" class="pr-12 rounded-r-none border-r-0" />
                      </TooltipTrigger>
                      <TooltipContent v-if="!selectedTokenNai">
                        <p>Select token to send first.</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                  <p v-if="form.amount && !amountValidation.isValid && amountValidation.error" class="text-xs text-red-500 mt-1">{{ amountValidation.error }}</p>
                </div>
                <TokenSelector id="token-selector" v-model="selectedTokenNai" placeholder="Choose token" class="w-[25%]" :class="{ 'mb-5': form.amount && !amountValidation.isValid && amountValidation.error }" />
              </div>
            </div>

            <!-- Small details toggle for NAI/precision when needed -->
            <div v-if="!hasNaiFromUrl && !shouldShowTokenSelector" class="flex items-center justify-between">
              <div class="text-xs text-muted-foreground">Token NAI / precision</div>
              <Button size="sm" variant="ghost" class="px-2 py-1" @click="showDetails = !showDetails">{{ showDetails ? 'Hide' : 'Show' }}</Button>
            </div>

            <div v-if="showDetails && !hasNaiFromUrl && !shouldShowTokenSelector" class="grid grid-cols-2 gap-2">
              <Input id="nai" v-model="form.nai" type="text" placeholder="NAI" class="transition-colors" />
              <Input id="precision" v-model="form.precision" type="number" placeholder="Precision" min="0" max="18" class="transition-colors" />
            </div>

            <!-- Amount compact -->
            <div v-if="!shouldShowTokenSelector">
              <Label for="amount" class="text-sm font-medium text-foreground">Amount</Label>
              <div class="relative mt-1">
                <Input id="amount" v-model="form.amount" type="text" inputmode="decimal" :placeholder="`Amount in ${tokenSymbol || tokenName}`" class="pr-12" />
                <span class="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground font-medium">{{ tokenSymbol }}</span>
              </div>
              <p v-if="form.amount && !amountValidation.isValid && amountValidation.error" class="text-xs text-red-500 mt-1">{{ amountValidation.error }}</p>
            </div>

            <!-- Memo compact -->
            <div>
              <div class="flex items-center justify-between">
                <Button
                  variant="ghost"
                  size="sm"
                  class="gap-2"
                  @click="addingMemo = !addingMemo"
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
                      :d="addingMemo ? mdiArrowUp : mdiArrowDown"
                    />
                  </svg>
                  {{ addingMemo ? 'Collapse' : 'Add Memo' }}
                </Button>

              </div>
              <div v-show="addingMemo" class="mt-2">
                <Textarea id="memo" v-model="form.memo" placeholder="Memo..." rows="3" :readonly="isReceiveMode" :disabled="isUpdating" class="resize-none" />
              </div>
            </div>

            <!-- Actions / Summary -->
            <div class="pt-3">
              <!-- Send button (only shown when confirming a transfer request / receive-mode) -->
              <Button v-if="isReceiveMode && !transferCompleted" class="w-full" :disabled="isSending || !isFormValid" @click="handleSend">{{ isSending ? 'Sending...' : (isLoggedIn ? 'Send Token' : 'Log in to Send Token') }}</Button>

              <!-- Bank-style confirmation summary shown after a successful transfer -->
              <div v-if="transferCompleted" class="mt-4">
                <Card>
                  <CardHeader>
                    <div class="flex items-center gap-3">
                      <div class="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
                        <svg width="28" height="28" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path style="fill: currentColor" :d="mdiCheckCircle" class="text-green-600" />
                        </svg>
                      </div>
                      <div>
                        <CardTitle class="text-lg">Transfer Completed</CardTitle>
                        <CardDescription class="text-sm text-muted-foreground">{{ sentSummary?.timestamp || new Date().toISOString() }}</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent class="space-y-4">
                    <div class="text-3xl font-extrabold text-foreground">
                      {{ sentSummary?.amount || form.amount }} <span class="text-xl font-semibold">{{ tokenSymbol || tokenName }}</span>
                    </div>

                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                      <div class="space-y-1">
                        <div class="text-xs text-muted-foreground">From</div>
                        <div class="font-medium">{{ isReceiveMode ? receiverKey?.substring(0, 6) + '...' + receiverKey?.substring(receiverKey.length - 4) : htmUserMetadata?.displayName }}</div>
                      </div>
                      <div class="space-y-1">
                        <div class="text-xs text-muted-foreground">To</div>
                        <div class="font-medium truncate">{{ isReceiveMode ? htmUserMetadata?.displayName : receiverKey?.substring(0, 6) + '...' + receiverKey?.substring(receiverKey.length - 4) }}</div>
                      </div>
                    </div>

                    <div class="flex items-center justify-between">
                      <div class="text-sm text-muted-foreground">Remaining balance</div>
                      <div class="font-medium">{{ sentSummary?.remainingBalance || remainingBalanceDisplay }}</div>
                    </div>

                    <div class="border-t pt-3">
                      <Button size="sm" class="w-full" @click.prevent="generateInvoice">Generate Invoice</Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </CardContent>
        </Card>

        <!-- QR Code Card (visible when NAI and precision are available) -->
        <QRCodeCard
          v-if="nai && precision && !isReceiveMode"
          :nai="nai"
          :precision="precision"
          :amount="form.amount"
          :memo="form.memo"
        />
      </div>
  </div></HTMView>
</template>
