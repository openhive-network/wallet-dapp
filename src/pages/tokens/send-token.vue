<script setup lang="ts">
import { mdiArrowLeft, mdiArrowDown, mdiArrowUp, mdiFileDocumentOutline } from '@mdi/js';
import type { htm_operation } from '@mtyszczak-cargo/htm';
import QRCode from 'qrcode';
import { computed, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { toast } from 'vue-sonner';

import HTMView from '@/components/HTMView.vue';
import TokenSelector from '@/components/tokens/TokenSelector.vue';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { useSettingsStore } from '@/stores/settings.store';
import { useTokensStore } from '@/stores/tokens.store';
import { useWalletStore } from '@/stores/wallet.store';
import { getWax } from '@/stores/wax.store';
import { toastError } from '@/utils/parse-error';
import { waitForTransactionStatus } from '@/utils/transaction-status';
import type { CtokensAppToken } from '@/utils/wallet/ctokens/api';
import CTokensProvider from '@/utils/wallet/ctokens/signer';

// Router
const route = useRoute();
const router = useRouter();

const settingsStore = useSettingsStore();
const tokensStore = useTokensStore();
const walletStore = useWalletStore();

// State
const token = ref<CtokensAppToken | null>(null);
const isLoading = ref(true);
const isUpdating = ref(false);
const isSending = ref(false);
const addingMemo = ref(false);
const qrCodeDataUrl = ref<string>('');
const transferCompleted = ref(false);

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
const receiverKey = computed(() => route.query.to as string | undefined);
const queryAmount = computed(() => route.query.amount as string | undefined);
const queryMemo = computed(() => route.query.memo as string | undefined);

// Check if NAI is provided in URL
const hasNaiFromUrl = computed(() => !!route.query.nai);

// Check if we're in receive mode (when 'to' is in query params)
// When 'to' is present, we're actually sending (confirming a transfer request)
const isReceiveMode = computed(() => !!receiverKey.value);

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

// Generate QR Code
const generateQRCode = async () => {
  // Generate QR code even without amount (amount is optional)
  try {
    const baseUrl = window.location.origin;
    const params = new URLSearchParams({
      nai: nai.value,
      precision: precision.value,
      to: userOperationalKey.value || ''
    });

    // Add amount only if provided and valid
    if (form.value.amount.trim() && amountValidation.value.isValid)
      params.append('amount', form.value.amount);

    // Add memo only if provided
    if (form.value.memo.trim())
      params.append('memo', form.value.memo);

    const url = `${baseUrl}/tokens/send-token?${params.toString()}`;
    const dataUrl = await QRCode.toDataURL(url, {
      width: 300,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    });
    qrCodeDataUrl.value = dataUrl;
  } catch (error) {
    console.error('Failed to generate QR code:', error);
    qrCodeDataUrl.value = '';
  }
};

// Watch NAI and precision changes to load token details
watch([() => form.value.nai, () => form.value.precision], async (newValues, oldValues) => {
  const [newNai, newPrecision] = newValues;
  const [oldNai, oldPrecision] = oldValues;

  // Only load if both are provided and have changed
  if (newNai && newPrecision && (newNai !== oldNai || newPrecision !== oldPrecision)) {
    isLoading.value = true;
    await loadTokenDetails();
    isLoading.value = false;

    // Generate QR code if in send mode and logged in
    if (!isReceiveMode.value && isLoggedIn.value)
      await generateQRCode();
  }
});

// Watch form amount and memo changes to regenerate QR code
watch([() => form.value.amount, () => form.value.memo, userOperationalKey], async () => {
  if (!isReceiveMode.value && nai.value && precision.value && isLoggedIn.value)
    await generateQRCode();
}, { immediate: false });

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

    // Wait for transaction status
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

    // Reload balances
    await tokensStore.loadBalances(true);

    // Navigate back
    router.push({
      path: '/tokens/token',
      query: { nai: nai.value, precision: precision.value }
    });
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
  if (isLoggedIn.value)
    await tokensStore.loadBalances();

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

  // Generate initial QR code if not in receive mode and user is logged in and has NAI/precision
  if (!isReceiveMode.value && isLoggedIn.value && nai.value && precision.value)
    await generateQRCode();
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
          <CardContent class="space-y-6">
            <!-- Token Selector (when only 'to' is provided) -->
            <div
              v-if="shouldShowTokenSelector"
              class="space-y-2"
            >
              <Label
                for="token-selector"
                class="text-sm font-medium text-foreground"
              >
                Select Token
              </Label>
              <TokenSelector
                id="token-selector"
                v-model="selectedTokenNai"
                placeholder="Choose a token to send"
              />
              <p class="text-xs text-muted-foreground">
                Select from your owned tokens
              </p>
            </div>

            <!-- NAI Input (only when not provided in URL and not using token selector) -->
            <div
              v-if="!hasNaiFromUrl && !shouldShowTokenSelector"
              class="space-y-2"
            >
              <Label
                for="nai"
                class="text-sm font-medium text-foreground"
              >
                Token NAI
              </Label>
              <Input
                id="nai"
                v-model="form.nai"
                type="text"
                placeholder="Enter token NAI"
                class="transition-colors"
              />
              <p class="text-xs text-muted-foreground">
                The Non-Fungible Asset Identifier of the token
              </p>
            </div>

            <!-- Precision Input (only when not provided in URL and not using token selector) -->
            <div
              v-if="!hasNaiFromUrl && !shouldShowTokenSelector"
              class="space-y-2"
            >
              <Label
                for="precision"
                class="text-sm font-medium text-foreground"
              >
                Precision
              </Label>
              <Input
                id="precision"
                v-model="form.precision"
                type="number"
                placeholder="Enter precision (0-18)"
                min="0"
                max="18"
                class="transition-colors"
              />
              <p class="text-xs text-muted-foreground">
                Number of decimal places for the token (0-18)
              </p>
            </div>

            <Separator v-if="!hasNaiFromUrl" />

            <!-- Sender -->
            <div
              v-if="isReceiveMode"
              class="space-y-2"
            >
              <Label
                for="sender"
                class="text-sm font-medium text-foreground"
              >
                Sender (You)
              </Label>
              <Input
                id="sender"
                :model-value="userOperationalKey || 'Not logged in'"
                readonly
                class="transition-colors bg-muted/50 cursor-not-allowed"
              />
              <p class="text-xs text-muted-foreground">
                {{ userOperationalKey ? 'Sender operational public key' : 'You need to log in to send tokens' }}
              </p>
            </div>

            <Separator v-if="isReceiveMode" />

            <!-- Receiver -->
            <div class="space-y-2">
              <Label
                for="receiver"
                class="text-sm font-medium text-foreground"
              >
                Receiver{{ !isReceiveMode ? ' (You)' : '' }}
              </Label>
              <Input
                id="receiver"
                :model-value="isReceiveMode ? receiverKey : userOperationalKey"
                readonly
                :class="isReceiveMode ? 'transition-colors bg-muted/50 cursor-not-allowed' : 'transition-colors bg-muted/50 cursor-not-allowed'"
              />
              <p class="text-xs text-muted-foreground">
                Receiver operational public key
              </p>
            </div>

            <Separator />

            <!-- Transfer Amount -->
            <div class="space-y-2">
              <Label
                for="amount"
                class="text-sm font-medium text-foreground"
              >
                Amount (optional)
              </Label>
              <div class="relative">
                <Input
                  id="amount"
                  v-model="form.amount"
                  type="text"
                  inputmode="decimal"
                  :placeholder="`Amount in ${tokenSymbol || tokenName}`"
                  class="pr-20 transition-colors"
                  :class="[
                    form.amount ? (amountValidation.isValid ? 'border-green-500 focus-visible:ring-green-500' : 'border-red-500 focus-visible:ring-red-500') : '',
                  ]"
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
              <p
                v-if="form.amount && !amountValidation.isValid && amountValidation.error"
                class="text-xs text-red-500"
              >
                {{ amountValidation.error }}
              </p>
            </div>

            <Separator v-if="!isReceiveMode" />

            <!-- memo -->
            <div
              v-if="addingMemo || (isReceiveMode && form.memo)"
              class="space-y-2"
            >
              <Label
                for="memo"
                class="text-sm font-medium text-foreground"
              >
                Memo
              </Label>
              <Textarea
                id="memo"
                v-model="form.memo"
                placeholder="Add memo..."
                rows="4"
                :readonly="isReceiveMode"
                :disabled="isUpdating"
                :class="[
                  'resize-none',
                  isReceiveMode ? 'bg-muted/50 cursor-not-allowed' : ''
                ]"
              />
              <p class="text-xs text-muted-foreground">
                A brief memo for token transfer
              </p>
            </div>

            <Button
              v-if="!isReceiveMode"
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

            <!-- Send Button (only in receive mode) -->
            <div
              v-if="isReceiveMode"
              class="pt-4 space-y-3"
            >
              <Button
                v-if="!transferCompleted"
                class="w-full"
                :disabled="isSending || !isFormValid"
                @click="handleSend"
              >
                {{ isSending ? 'Sending...' : (isLoggedIn ? 'Send Token' : 'Log in to Send Token') }}
              </Button>
              <Button
                v-if="transferCompleted"
                variant="outline"
                class="w-full gap-2"
                @click="generateInvoice"
              >
                <svg
                  width="18"
                  height="18"
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  class="flex-shrink-0"
                >
                  <path
                    style="fill: currentColor"
                    :d="mdiFileDocumentOutline"
                  />
                </svg>
                Generate Invoice
              </Button>
            </div>
          </CardContent>
        </Card>

        <!-- QR Code Card (visible when NAI and precision are available) -->
        <Card v-if="nai && precision && !isReceiveMode">
          <CardContent class="flex flex-col items-center">
            <div
              v-if="qrCodeDataUrl"
              class="bg-white p-4 rounded-lg my-4"
            >
              <img
                :src="qrCodeDataUrl"
                alt="QR Code for token transfer"
                class="w-full h-auto"
              >
            </div>
            <div
              v-else
              class="bg-white p-4 rounded-lg my-4 flex items-center justify-center"
              style="width: 300px; height: 300px;"
            >
              <p class="text-muted-foreground text-center">
                Generating QR code...
              </p>
            </div>
            <p class="text-xs text-muted-foreground text-center max-w-md">
              This QR code contains the transfer details. The receiver can scan it to accept the token.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  </HTMView>
</template>
