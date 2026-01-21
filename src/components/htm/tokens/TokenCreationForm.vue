<script setup lang="ts">
import type { asset, ITransaction } from '@hiveio/wax';
import { mdiRocket, mdiLoading } from '@mdi/js';
import type { asset_definition, asset_metadata_update, htm_operation } from '@mtyszczak-cargo/htm';

import HTMTokenPreview from '@/components/htm/HTMTokenPreview.vue';
import TokenCreationCard from '@/components/htm/tokens/TokenCreationCard.vue';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { useSettingsStore } from '@/stores/settings.store';
import type { CTokenDisplayBase } from '@/stores/tokens.store';
import { useTokensStore } from '@/stores/tokens.store';
import { useWalletStore } from '@/stores/wallet.store';
import { getWax } from '@/stores/wax.store';
import { debounce } from '@/utils/debouncers';
import { generateNAI as generateHTMNAI, parseAssetAmount, toVesting, assetNumFromNAI, naiFromAssetNum } from '@/utils/nai-tokens';
import { toastError } from '@/utils/parse-error';
import { waitForTransactionStatus } from '@/utils/transaction-status';
import { isValidTokenSupply, isValidTokenPrecision, validateTokenSymbol } from '@/utils/validators';
import CTokensProvider from '@/utils/wallet/ctokens/signer';

// Generated token ID
const generatedAssetNum = ref('');

const router = useRouter();

const tokensStore = useTokensStore();
const walletStore = useWalletStore();
const settingsStore = useSettingsStore();

// Form state
const tokenName = ref('');
const tokenSymbol = ref('');
const tokenDescription = ref('');
const tokenImage = ref('');
const tokenWebsite = ref('');
const initialSupply = ref('1000000');
const precision = ref('3');
const othersCanStake = ref(true);
const othersCanUnstake = ref(true);
const capped = ref(true);
const agreedToDisclaimer = ref(false);

// Loading states
const isCreatingToken = ref(false);

// Add a computed property for button text and state
const createButtonState = computed(() => {
  if (isCreatingToken.value)
    return { text: 'Creating Token...', disabled: true };
  if (!isFormValid.value)
    return { text: 'Create Token', disabled: true };
  if (!generatedAssetNum.value && symbolValidation.value.isValid)
    return { text: 'Generate Asset Num & Create Token', disabled: false };
  return { text: 'Create Token', disabled: false };
});

// Create token using HTM
const createToken = async () => {
  if (!isFormValid.value) {
    toastError('Please fill all required fields and agree to disclaimer');
    return;
  }

  // Check if user has a wallet connected
  if (!tokensStore.wallet) {
    toastError('Please connect your HTM wallet first');
    return;
  }

  // Check if user has a wallet connected
  if (walletStore.isL2Wallet) {
    toastError('Please connect your L1 wallet first');
    return;
  }

  // For fee payment
  await walletStore.createWalletFor(settingsStore.settings, 'active');

  if (!generatedAssetNum.value) {
    const assetNum = generateAssetNum();

    if (!assetNum) {
      toastError('Failed to generate token Asset Num. Please try again.');
      return;
    }
  }

  isCreatingToken.value = true;

  try {
    const wax = await getWax();

    await tokensStore.reset(await CTokensProvider.for(wax, 'active'));
    const identifierPrecision = parseInt(precision.value);
    const nai = naiFromAssetNum(BigInt(generatedAssetNum.value));

    const identifier: asset = {
      amount: parseAssetAmount(initialSupply.value, identifierPrecision),
      nai,
      precision: identifierPrecision
    };
    const identifierVesting: asset = {
      amount: '0',
      nai: toVesting(nai, identifierPrecision),
      precision: identifierPrecision
    };
    const owner = tokensStore.getUserPublicKey()!;
    const assetTokenName = tokenName.value.trim();
    const trimmedSymbol = tokenSymbol.value.trim();
    const trimmedDescription = tokenDescription.value.trim();
    const trimmedImage = tokenImage.value.trim();
    const trimmedWebsite = tokenWebsite.value.trim();

    const metadataItems = [
      { key: 'name', value: assetTokenName },
      { key: 'symbol', value: trimmedSymbol },
      { key: 'description', value: trimmedDescription }
    ];

    if (trimmedImage)
      metadataItems.push({ key: 'image', value: trimmedImage });

    if (trimmedWebsite)
      metadataItems.push({ key: 'website', value: trimmedWebsite });

    // Prepare HTM asset definition data
    const assetDefinition: asset_definition = {
      identifier,
      capped: capped.value,
      max_supply: capped.value ? parseAssetAmount(initialSupply.value, parseInt(precision.value)) : '0',
      owner,
      metadata: {
        items: [...metadataItems]
      },
      is_nft: false,
      others_can_stake: othersCanStake.value,
      others_can_unstake: othersCanUnstake.value
    };
    const modifyVestingDefinition: asset_metadata_update = {
      identifier: identifierVesting,
      owner,
      metadata: {
        items: [...metadataItems]
      }
    };

    // Wait for transaction status
    await waitForTransactionStatus(
      (tx: ITransaction) => {
        tx.pushOperation({
          transfer_operation: {
            from: settingsStore.settings.account!,
            to: 'htm.fee',
            amount: wax.hiveCoins(1),
            memo: `${assetTokenName} creation fee`
          }
        });

        return [
          { asset_definition_operation: assetDefinition } satisfies htm_operation,
          { asset_metadata_update_operation: modifyVestingDefinition } satisfies htm_operation
        ];
      },
      'Token creation'
    );

    const assetNum = Number(generatedAssetNum.value);

    const redirectUrl = `/tokens/token?asset-num=${assetNum}`;

    resetForm();

    // Success, reset form
    await router.push(redirectUrl);
  } catch (error) {
    toastError('Failed to create token', error);
  } finally {
    isCreatingToken.value = false;
  }
};

// Form data object matching CTokenDisplayBase
const formToken = computed(() => ({
  isNft: false,
  nai: generatedAssetNum.value ? naiFromAssetNum(BigInt(generatedAssetNum.value)) : '',
  assetNum: generatedAssetNum.value ? Number(generatedAssetNum.value) : 0,
  isStaked: false,
  precision: parseInt(precision.value),
  metadata: {},
  name: tokenName.value,
  symbol: tokenSymbol.value,
  description: tokenDescription.value,
  image: tokenImage.value,
  website: tokenWebsite.value,
  othersCanStake: othersCanStake.value,
  othersCanUnstake: othersCanUnstake.value
}));

// Computed property for token preview data
const previewToken = computed(() => {
  const precisionValue = parseInt(precision.value);
  const supplyValue = BigInt(parseAssetAmount(initialSupply.value, precisionValue));

  return {
    ...formToken.value,
    ownerPublicKey: tokensStore.getUserPublicKey() || '',
    displayTotalSupply: initialSupply.value || '0',
    totalSupply: supplyValue,
    maxSupply: capped.value ? supplyValue : BigInt(0),
    displayMaxSupply: capped.value ? initialSupply.value || '0' : '0',
    capped: capped.value
  };
});

// Reset form
const resetForm = () => {
  tokenName.value = '';
  tokenSymbol.value = '';
  tokenDescription.value = '';
  tokenImage.value = '';
  tokenWebsite.value = '';
  initialSupply.value = '1000000';
  precision.value = '3';
  othersCanStake.value = true;
  othersCanUnstake.value = true;
  agreedToDisclaimer.value = false;
  generatedAssetNum.value = '';
};

// Handle symbol input - transform to uppercase letters only
watch(tokenSymbol, (newValue) => {
  const cleaned = newValue.replace(/[^A-Za-z]/g, '').toUpperCase();
  if (cleaned !== newValue)
    tokenSymbol.value = cleaned;
});

// Validation
const isFormValid = computed(() => {
  return tokenName.value.trim() !== '' &&
         symbolValidation.value.isValid &&
         isValidTokenSupply(initialSupply.value) &&
         isValidTokenPrecision(precision.value) &&
         agreedToDisclaimer.value;
});

// Symbol validation state
const symbolValidation = computed(() => validateTokenSymbol(tokenSymbol.value));

// Auto-generate token ID when symbol changes (debounced)
watch(tokenSymbol, debounce((newSymbol) => {
  // Reset state immediately when symbol is invalid
  if (!validateTokenSymbol(newSymbol).isValid) {
    generatedAssetNum.value = '';
    return;
  }

  generateAssetNum();
}));

// Auto-generate token ID when symbol changes (debounced)
watch(precision, debounce(() => {
  generateAssetNum();
}));

// Generate unique token ID
const generateAssetNum = (): string | undefined => {
  if (!symbolValidation.value.isValid)
    return;

  try {
    const nai = generateHTMNAI(tokenSymbol.value, Number(precision.value));
    const assetNum = assetNumFromNAI(nai, Number(precision.value));
    generatedAssetNum.value = assetNum.toString();

    return generatedAssetNum.value;
  } catch (error) {
    toastError('Failed to generate token ID', error);
  }
};

// Handle regenerate Asset Num event from card
const handleRegenerateAssetNum = () => {
  generatedAssetNum.value = '';
  generateAssetNum();
};

// Handle token updates from card
const handleTokenUpdate = (updatedToken: CTokenDisplayBase & { othersCanStake: boolean; othersCanUnstake: boolean }) => {
  tokenName.value = updatedToken.name || '';
  tokenSymbol.value = updatedToken.symbol || '';
  tokenDescription.value = updatedToken.description || '';
  tokenImage.value = updatedToken.image || '';
  tokenWebsite.value = updatedToken.website || '';
  precision.value = String(updatedToken.precision);
  othersCanStake.value = updatedToken.othersCanStake;
  othersCanUnstake.value = updatedToken.othersCanUnstake;
};
</script>

<template>
  <div data-testid="tokencreate-form" class="grid grid-cols-1 lg:grid-cols-2 gap-6">
    <!-- Token Creation Form -->
    <TokenCreationCard
      v-model:initial-supply="initialSupply"
      :token="formToken"
      :generated-asset-num="generatedAssetNum"
      :is-submitting="isCreatingToken"
      :symbol-validation="symbolValidation"
      @update:token="handleTokenUpdate"
      @regenerate-asset-num="handleRegenerateAssetNum"
    />

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
                data-testid="tokencreate-disclaimer"
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
        data-testid="tokencreate-submit-btn"
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
</template>
