<script setup lang="ts">
import {
  mdiCurrencyUsd,
  mdiRefresh,
  mdiContentCopy,
  mdiRocket,
  mdiLoading
} from '@mdi/js';
import { HtmTransaction, type asset, type asset_definition } from '@mtyszczak-cargo/htm';
import { computed, ref, watch } from 'vue';
import { toast } from 'vue-sonner';

import HTMTokenPreview from '@/components/HTMTokenPreview.vue';
import HTMView from '@/components/HTMView.vue';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { useSettingsStore } from '@/stores/settings.store';
import { useTokensStore } from '@/stores/tokens.store';
import { useWalletStore } from '@/stores/wallet.store';
import { getWax } from '@/stores/wax.store';
import { copyText } from '@/utils/copy';
import { parseAssetAmount } from '@/utils/htm-utils';
import { generateNAI as generateHTMNAI, toVesting } from '@/utils/nai-tokens';
import { toastError } from '@/utils/parse-error';
import { waitForTransactionStatus } from '@/utils/transaction-status';
import CTokensProvider from '@/utils/wallet/ctokens/signer';

const tokensStore = useTokensStore();
const walletStore = useWalletStore();
const settingsStore = useSettingsStore();

// Form state
const tokenName = ref('');
const tokenSymbol = ref('');
const tokenDescription = ref('');
const initialSupply = ref('1000000');
const precision = ref('3');
const othersCanStake = ref(true);
const othersCanUnstake = ref(true);
const capped = ref(true);
const agreedToDisclaimer = ref(false);

// Loading states
const isCreatingToken = ref(false);

// Generated token ID
const generatedNAI = ref('');
const naiGenerated = ref(false);

// Symbol validation state
const symbolValidation = computed(() => {
  const symbol = tokenSymbol.value.trim();
  if (symbol.length === 0)
    return { isValid: false, message: '' };
  if (symbol.length < 3)
    return { isValid: false, message: 'Symbol must be at least 3 characters' };
  if (symbol.length > 10)
    return { isValid: false, message: 'Symbol must be 10 characters or less' };
  if (!/^[A-Z]+$/.test(symbol))
    return { isValid: false, message: 'Symbol must contain only letters' };
  return { isValid: true, message: 'Valid symbol' };
});

// Computed property to show NAI status
const naiDisplayValue = computed(() => {
  if (generatedNAI.value)
    return generatedNAI.value;
  if (tokenSymbol.value.trim().length >= 3)
    return 'Generating...';
  return '';
});

const shouldShowNAIField = computed(() => {
  return symbolValidation.value.isValid;
});

// Validation
const isFormValid = computed(() => {
  return tokenName.value.trim() !== '' &&
         symbolValidation.value.isValid &&
         initialSupply.value !== '' &&
         parseInt(initialSupply.value) > 0 &&
         BigInt(initialSupply.value) <= BigInt('9223372036854775807') &&
         parseInt(precision.value) >= 0 &&
         parseInt(precision.value) <= 12 &&
         agreedToDisclaimer.value;
});

// Add a computed property for button text and state
const createButtonState = computed(() => {
  if (isCreatingToken.value)
    return { text: 'Creating Token...', disabled: true };
  if (!isFormValid.value)
    return { text: 'Create Token', disabled: true };
  if (!generatedNAI.value && symbolValidation.value.isValid)
    return { text: 'Generate NAI & Create Token', disabled: false };
  return { text: 'Create Token', disabled: false };
});

// Debounced token ID generation
let debounceTimer: NodeJS.Timeout | null = null;

// Auto-generate token ID when symbol changes (debounced)
watch(tokenSymbol, (newSymbol) => {
  // Clear previous timer
  if (debounceTimer)
    clearTimeout(debounceTimer);

  // Reset state immediately when symbol is invalid
  if (newSymbol.trim().length < 3 || !/^[A-Z]+$/i.test(newSymbol.trim())) {
    generatedNAI.value = '';
    naiGenerated.value = false;
    return;
  }

  // Debounce the generation to avoid excessive calls
  debounceTimer = setTimeout(() => {
    if (symbolValidation.value.isValid)
      generateNAI();
  }, 300); // Wait 300ms after user stops typing
});

// Generate unique token ID
const generateNAI = (): string | undefined => {
  if (!symbolValidation.value.isValid)
    return;

  try {
    generatedNAI.value = generateHTMNAI(tokenSymbol.value, Number(precision.value));
    naiGenerated.value = true;

    return generatedNAI.value;
  } catch (error) {
    toastError('Failed to generate token ID', error);
  }
};

const regenerateNAI = () => {
  naiGenerated.value = false;
  generatedNAI.value = '';
  generateNAI();
};

// Copy NAI to clipboard
const copyNAI = async () => {
  try {
    copyText(generatedNAI.value);
    toast.success('NAI copied to clipboard!');
  } catch (_error) {
    toast.error('Failed to copy NAI');
  }
};

// Create token using HTM
const createToken = async () => {
  if (!isFormValid.value) {
    toast.error('Please fill all required fields and agree to disclaimer');
    return;
  }

  // Check if user has a wallet connected
  if (!tokensStore.wallet) {
    toast.error('Please connect your HTM wallet first');
    return;
  }

  // Check if user has a wallet connected
  if (walletStore.isL2Wallet) {
    toast.error('Please connect your L1 wallet first');
    return;
  }

  // For fee payment
  await walletStore.createWalletFor(settingsStore.settings, 'active');

  if (!generatedNAI.value) {
    const nai = generateNAI();

    if (!nai) {
      toast.error('Failed to generate token NAI. Please try again.');
      return;
    }
  }

  isCreatingToken.value = true;

  try {
    const wax = await getWax();

    await tokensStore.reset(await CTokensProvider.for(wax, 'active'));
    const identifierPrecision = parseInt(precision.value);

    const identifier: asset = {
      amount: parseAssetAmount(initialSupply.value, identifierPrecision),
      nai: generatedNAI.value,
      precision: identifierPrecision
    };
    const identifierVesting: asset = {
      amount: '0',
      nai: toVesting(generatedNAI.value, identifierPrecision),
      precision: identifierPrecision
    };
    const owner = CTokensProvider.getOperationalPublicKey()!;
    const assetTokenName = tokenName.value.trim();

    // Prepare HTM asset definition data
    const assetDefinition: asset_definition = {
      identifier,
      capped: capped.value,
      max_supply: capped.value ? parseAssetAmount(initialSupply.value, parseInt(precision.value)) : '0',
      owner,
      metadata: {
        items: [
          { key: 'name', value: assetTokenName },
          { key: 'symbol', value: tokenSymbol.value.trim() },
          { key: 'description', value: tokenDescription.value.trim() }
        ]
      },
      is_nft: false,
      others_can_stake: othersCanStake.value,
      others_can_unstake: othersCanUnstake.value
    };

    // Set proxy account for HTM transactions
    HtmTransaction.HiveProxyAccount = settingsStore.settings.account!;

    // Create Layer 2 HTM transaction for user signup
    const l2Transaction = new HtmTransaction(wax);

    l2Transaction.pushOperation({
      asset_definition_operation: assetDefinition
    });

    l2Transaction.pushOperation({
      asset_metadata_update_operation: {
        identifier: identifierVesting,
        owner,
        metadata: {
          items: [
            { key: 'name', value: assetTokenName },
            { key: 'symbol', value: tokenSymbol.value.trim() },
            { key: 'description', value: tokenDescription.value.trim() }
          ]
        }
      }
    });

    await tokensStore.wallet!.signTransaction(l2Transaction);

    // Create Layer 1 transaction and broadcast
    const l1Transaction = await wax.createTransaction();
    l1Transaction.pushOperation({
      transfer_operation: {
        from: settingsStore.settings.account!,
        to: 'htm.fee',
        amount: wax.hiveCoins(1),
        memo: `${assetTokenName} creation fee`
      }
    });
    l1Transaction.pushOperation(l2Transaction);

    // Sign Layer 1 transaction with the Hive active key
    await walletStore.wallet!.signTransaction(l1Transaction);

    // Broadcast the transaction
    await wax.broadcast(l1Transaction);

    // Wait for transaction status
    await waitForTransactionStatus(
      l1Transaction.legacy_id,
      1, // First we have transfer, than HTM operation
      'Token creation',
      async () => {
        // Success, reset form
        resetForm();
      }
    );
  } catch (error) {
    toastError('Failed to create token', error);
  } finally {
    isCreatingToken.value = false;
  }
};

// Reset form
const resetForm = () => {
  tokenName.value = '';
  tokenSymbol.value = '';
  tokenDescription.value = '';
  initialSupply.value = '1000000';
  precision.value = '3';
  othersCanStake.value = true;
  othersCanUnstake.value = true;
  agreedToDisclaimer.value = false;
  generatedNAI.value = '';
  naiGenerated.value = false;
};

// Handle symbol input - transform to uppercase letters only
watch(tokenSymbol, (newValue) => {
  const cleaned = newValue.replace(/[^A-Za-z]/g, '').toUpperCase();
  if (cleaned !== newValue)
    tokenSymbol.value = cleaned;
});

// Computed property for token preview data
const previewToken = computed(() => ({
  name: tokenName.value || undefined,
  symbol: tokenSymbol.value || undefined,
  description: tokenDescription.value || undefined,
  nai: generatedNAI.value || undefined,
  totalSupply: initialSupply.value,
  maxSupply: capped.value ? initialSupply.value : undefined,
  precision: parseInt(precision.value) ?? 3,
  capped: capped.value,
  othersCanStake: othersCanStake.value,
  othersCanUnstake: othersCanUnstake.value,
  ownerPublicKey: CTokensProvider.getOperationalPublicKey()
}));
</script>

<template>
  <HTMView>
    <div class="container mx-auto p-6 max-w-4xl">
      <div class="space-y-6">
        <!-- Header -->
        <div class="text-center space-y-2">
          <h1 class="text-3xl font-bold tracking-tight">
            Create Custom Token
          </h1>
          <p class="text-muted-foreground">
            Create your own custom token on the Hive Token Machine
          </p>
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <!-- Token Creation Form -->
          <Card>
            <CardHeader>
              <CardTitle class="flex items-center gap-2">
                <svg
                  width="20"
                  height="20"
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                >
                  <path
                    style="fill: currentColor"
                    :d="mdiCurrencyUsd"
                  />
                </svg>
                Token Details
              </CardTitle>
              <CardDescription>
                Enter the details for your new NAI token. Note: The token name is only a display property that can be changed. The NAI (Network Asset Identifier) is the only unique identifier for your token.
              </CardDescription>
            </CardHeader>
            <CardContent class="space-y-4">
              <!-- Token Name -->
              <div class="space-y-2">
                <Label for="token-name">Token Name *</Label>
                <Input
                  id="token-name"
                  v-model="tokenName"
                  placeholder="e.g., My Awesome Token"
                  :disabled="isCreatingToken"
                />
              </div>

              <!-- Token Symbol -->
              <div class="space-y-2">
                <Label for="token-symbol">Token Symbol *</Label>
                <Input
                  id="token-symbol"
                  v-model="tokenSymbol"
                  placeholder="e.g., MAT"
                  class="uppercase"
                  :class="{ 'border-red-500': tokenSymbol.length > 0 && !symbolValidation.isValid }"
                  maxlength="10"
                  :disabled="isCreatingToken"
                />
                <p
                  class="text-xs"
                  :class="tokenSymbol.length > 0 && !symbolValidation.isValid ? 'text-red-500' : 'text-muted-foreground'"
                >
                  {{ tokenSymbol.length > 0 && !symbolValidation.isValid ? symbolValidation.message : '3-10 characters, letters only' }}
                </p>
              </div>

              <!-- Token Description -->
              <div class="space-y-2">
                <Label for="token-description">Description</Label>
                <Textarea
                  id="token-description"
                  v-model="tokenDescription"
                  placeholder="Describe your token..."
                  :disabled="isCreatingToken"
                  rows="3"
                />
              </div>

              <!-- Initial Supply -->
              <div class="space-y-2">
                <Label for="initial-supply">Initial Supply *</Label>
                <Input
                  id="initial-supply"
                  v-model="initialSupply"
                  placeholder="1000000"
                  :disabled="isCreatingToken"
                />
                <p class="text-xs text-muted-foreground">
                  Total number of tokens to create
                </p>
              </div>

              <!-- Precision -->
              <div class="space-y-2">
                <Label for="precision">Decimal Precision *</Label>
                <Input
                  id="precision"
                  v-model="precision"
                  type="number"
                  min="0"
                  max="12"
                  step="1"
                  placeholder="3"
                  :disabled="isCreatingToken"
                  class="w-full"
                />
                <p class="text-xs text-muted-foreground">
                  Number of decimal places for token amounts (0-12)
                </p>
              </div>

              <!-- Staking Options -->
              <div class="space-y-3">
                <div class="grid grid-cols-1 md:grid-cols-2 gap-3 ml-6">
                  <div class="flex items-center space-x-2">
                    <Checkbox
                      id="others-can-stake"
                      v-model="othersCanStake"
                      :disabled="isCreatingToken"
                    />
                    <Label
                      for="others-can-stake"
                      class="text-sm font-normal"
                    >
                      Others can stake
                    </Label>
                  </div>

                  <div class="flex items-center space-x-2">
                    <Checkbox
                      id="others-can-unstake"
                      v-model="othersCanUnstake"
                      :disabled="isCreatingToken"
                    />
                    <Label
                      for="others-can-unstake"
                      class="text-sm font-normal"
                    >
                      Others can unstake
                    </Label>
                  </div>
                </div>
              </div>

              <Separator />

              <!-- Generated NAI -->
              <div class="space-y-2">
                <div class="flex items-center justify-between">
                  <Label>Generated NAI</Label>
                  <Button
                    v-if="naiGenerated"
                    variant="outline"
                    size="sm"
                    :disabled="isCreatingToken"
                    @click="regenerateNAI"
                  >
                    <svg
                      width="16"
                      height="16"
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      class="mr-1"
                    >
                      <path
                        style="fill: currentColor"
                        :d="mdiRefresh"
                      />
                    </svg>
                    Regenerate
                  </Button>
                </div>

                <div
                  v-if="shouldShowNAIField"
                  class="flex items-center gap-2"
                >
                  <Input
                    :value="naiDisplayValue"
                    readonly
                    class="font-mono"
                    :class="{ 'text-muted-foreground': !generatedNAI }"
                  />
                  <Button
                    v-if="naiGenerated"
                    variant="outline"
                    size="sm"
                    @click="copyNAI"
                  >
                    <svg
                      width="16"
                      height="16"
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                    >
                      <path
                        style="fill: currentColor"
                        :d="mdiContentCopy"
                      />
                    </svg>
                  </Button>
                </div>

                <div
                  v-else
                  class="text-sm text-muted-foreground"
                >
                  Enter a token symbol (3+ characters) to generate unique ID
                </div>
              </div>
            </CardContent>
          </Card>

          <!-- Preview and Actions -->
          <div class="space-y-6">
            <!-- Token Preview -->
            <HTMTokenPreview :token="previewToken" />

            <!-- Disclaimer -->
            <Alert variant="warning">
              <AlertDescription>
                <div class="space-y-2">
                  <p class="font-semibold">
                    Important Disclaimer
                  </p>
                  <p class="text-sm">
                    Tokens are created on the Hive Token Machine. Please verify all details before creation
                    as they cannot be changed after deployment. Token symbols should be unique to avoid confusion.
                    <strong>A transaction fee of 1.000 (one) HIVE will be required to create the token.
                      This will require user to have a Hive account with active key configured</strong>
                  </p>

                  <div class="flex items-center space-x-2 mt-3">
                    <Checkbox
                      id="disclaimer"
                      v-model="agreedToDisclaimer"
                      :disabled="isCreatingToken"
                    />
                    <Label
                      for="disclaimer"
                      class="text-sm"
                    >
                      I understand and agree to this disclaimer
                    </Label>
                  </div>
                </div>
              </AlertDescription>
            </Alert>

            <!-- Create Button -->
            <Button
              class="w-full"
              size="lg"
              :disabled="createButtonState.disabled"
              @click="createToken"
            >
              <svg
                width="20"
                height="20"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                class="mr-2"
                :class="{ 'animate-spin': isCreatingToken }"
              >
                <path
                  style="fill: currentColor"
                  :d="isCreatingToken ? mdiLoading : mdiRocket"
                />
              </svg>
              {{ createButtonState.text }}
            </Button>
          </div>
        </div>
      </div>
    </div>
  </HTMView>
</template>
