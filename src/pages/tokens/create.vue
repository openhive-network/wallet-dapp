<script setup lang="ts">
import {
  mdiCurrencyUsd,
  mdiRefresh,
  mdiContentCopy,
  mdiCheck,
  mdiAlert,
  mdiRocket,
  mdiLoading
} from '@mdi/js';
import { computed, ref, watch } from 'vue';
import { toast } from 'vue-sonner';

import HTMView from '@/components/HTMView.vue';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { useTokensStore } from '@/stores/tokens.store';
import { copyText } from '@/utils/copy';
import { createHTMAsset, generateNAI as generateHTMNAI, parseAssetAmount } from '@/utils/htm-utils';
import { toastError } from '@/utils/parse-error';
import CTokensProvider from '@/utils/wallet/ctokens/signer';

const tokensStore = useTokensStore();

// Form state
const tokenName = ref('');
const tokenSymbol = ref('');
const tokenDescription = ref('');
const initialSupply = ref('1000000');
const precision = ref('3');
const canStake = ref(false);
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
         initialSupply.value.trim() !== '' &&
         parseInt(initialSupply.value) > 0 &&
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
const generateNAI = () => {
  if (!symbolValidation.value.isValid)
    return;

  try {
    generatedNAI.value = generateHTMNAI();
    naiGenerated.value = true;
    toast.success('Token ID generated successfully!');
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

  // Get the beekeeper wallet from CTokensProvider
  const beekeeperWallet = CTokensProvider.getOperationalWallet();
  if (!beekeeperWallet) {
    toast.error('Beekeeper wallet not available. Please ensure you are logged in with HTM wallet.');
    return;
  }  // Ensure NAI is generated before creating token
  if (!generatedNAI.value) {
    generateNAI();
    // Wait a moment for generation to complete
    await new Promise(resolve => setTimeout(resolve, 100));

    if (!generatedNAI.value) {
      toast.error('Failed to generate token NAI. Please try again.');
      return;
    }
  }

  isCreatingToken.value = true;

  try {
    // Prepare HTM asset definition data
    const assetData = {
      identifier: {
        amount: parseAssetAmount(initialSupply.value, parseInt(precision.value)),
        nai: generatedNAI.value,
        precision: parseInt(precision.value)
      },
      capped: capped.value,
      maxSupply: capped.value ? parseAssetAmount(initialSupply.value, parseInt(precision.value)) : '0',
      owner: tokensStore.wallet.publicKey
    };

    // Create the HTM asset
    await createHTMAsset(
      assetData,
      beekeeperWallet,
      'token-creator', // This should be the operational account
      1.0 // Fee amount
    );

    toast.success('Token created successfully!', {
      description: `Token ${tokenSymbol.value} has been created and deployed to the Hive Token Machine.`
    });

    // Reset form
    resetForm();

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
  canStake.value = false;
  agreedToDisclaimer.value = false;
  generatedNAI.value = '';
  naiGenerated.value = false;
};

// Format number with commas
const formatNumber = (value: string) => {
  const num = parseInt(value.replace(/,/g, ''));
  return isNaN(num) ? value : num.toLocaleString();
};

// Handle supply input
const onSupplyInput = (event: Event) => {
  const target = event.target as HTMLInputElement;
  const value = target.value.replace(/[^0-9]/g, '');
  initialSupply.value = value;
};

// Handle symbol input
const onSymbolInput = (event: Event) => {
  const target = event.target as HTMLInputElement;
  const value = target.value.replace(/[^A-Za-z]/g, '').toUpperCase();
  tokenSymbol.value = value;
};
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
                  :value="tokenSymbol"
                  placeholder="e.g., MAT"
                  class="uppercase"
                  :class="{ 'border-red-500': tokenSymbol.length > 0 && !symbolValidation.isValid }"
                  maxlength="10"
                  :disabled="isCreatingToken"
                  @input="onSymbolInput"
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
                  :value="formatNumber(initialSupply)"
                  placeholder="1,000,000"
                  :disabled="isCreatingToken"
                  @input="onSupplyInput"
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
                <div class="flex items-center space-x-2">
                  <Checkbox
                    id="can-stake"
                    v-model="canStake"
                    :disabled="isCreatingToken"
                  />
                  <Label
                    for="can-stake"
                    class="text-sm font-normal"
                  >
                    Allow token staking
                  </Label>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-2 gap-3 ml-6">
                  <div class="flex items-center space-x-2">
                    <Checkbox
                      id="others-can-stake"
                      :disabled="isCreatingToken || !canStake"
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
                      :disabled="isCreatingToken || !canStake"
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
            <Card>
              <CardHeader>
                <CardTitle>Token Preview</CardTitle>
                <CardDescription>
                  How your token will appear
                </CardDescription>
              </CardHeader>
              <CardContent class="space-y-4">
                <div class="border rounded-lg p-4 space-y-2">
                  <div class="flex items-center justify-between">
                    <div>
                      <h3 class="font-semibold">
                        {{ tokenName || 'Token Name' }}
                      </h3>
                      <p class="text-sm text-muted-foreground">
                        {{ tokenSymbol || 'SYMBOL' }}
                      </p>
                    </div>
                    <span class="inline-flex items-center rounded-md bg-secondary px-2 py-1 text-xs font-medium text-secondary-foreground">{{ naiDisplayValue || 'NAI' }}</span>
                  </div>

                  <p class="text-sm">
                    {{ tokenDescription || 'Token description will appear here...' }}
                  </p>

                  <div class="flex justify-between text-xs text-muted-foreground">
                    <span>Supply: {{ formatNumber(initialSupply) }}</span>
                    <span>Precision: {{ precision }}</span>
                  </div>

                  <div
                    v-if="canStake"
                    class="flex items-center text-xs text-green-600"
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
                        :d="mdiCheck"
                      />
                    </svg>
                    Staking enabled
                  </div>
                </div>
              </CardContent>
            </Card>

            <!-- Disclaimer -->
            <Alert>
              <svg
                width="16"
                height="16"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
              >
                <path
                  style="fill: currentColor"
                  :d="mdiAlert"
                />
              </svg>
              <AlertDescription>
                <div class="space-y-2">
                  <p class="font-semibold">
                    Important Disclaimer
                  </p>
                  <p class="text-sm">
                    Tokens are created on the Hive Token Machine. Please verify all details before creation
                    as they cannot be changed after deployment. Token symbols should be unique to avoid confusion.
                    <strong>A transaction fee will be required to create the token.</strong>
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
