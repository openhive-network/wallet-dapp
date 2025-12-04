<script setup lang="ts">
import type { htm_operation } from '@mtyszczak-cargo/htm';

import CollapsibleMemoInput from '@/components/CollapsibleMemoInput.vue';
import { TokenAmountInput, UserSelector } from '@/components/htm/amount';
import QrScanner from '@/components/QrScanner.vue';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { useSettingsStore } from '@/stores/settings.store';
import { type CTokenUser, useTokensStore, type CTokenBalanceDisplay, type CTokenDefinitionDisplay } from '@/stores/tokens.store';
import { useWalletStore } from '@/stores/wallet.store';
import { toastError } from '@/utils/parse-error';
import { waitForTransactionStatus } from '@/utils/transaction-status';
import { isValidPublicKey, validateAmountPrecision } from '@/utils/validators';
import CTokensProvider from '@/utils/wallet/ctokens/signer';
import { TempCTokensSigner } from '@/utils/wallet/ctokens/temp-signer';

const props = defineProps<{
  token: CTokenDefinitionDisplay;
  userBalance: CTokenBalanceDisplay | null;
  isLoggedIn: boolean;
  assetNum: number;
}>();

const emit = defineEmits<{
  refresh: [];
}>();

const recipientData = ref<CTokenUser | undefined>(undefined);
watch(recipientData, (newVal) => {
  transferForm.value.to = newVal ? newVal.operationalKey : '';
});

const settingsStore = useSettingsStore();
const walletStore = useWalletStore();
const tokensStore = useTokensStore();
const router = useRouter();

const isTransferring = ref(false);
const showQrScanner = ref(false);
const scannedPrivateKey = ref<string | null>(null);
const tempSigner = shallowRef<TempCTokensSigner | undefined>(undefined);

// Transfer form
const transferForm = ref({
  to: '',
  amount: '',
  memo: ''
});

// Validate recipient address (must be a public key)
const isRecipientValid = computed(() => {
  if (!transferForm.value.to) return false;
  return isValidPublicKey(transferForm.value.to);
});

// Validate amount
const amountValidation = computed(() => {
  if (!transferForm.value.amount || !props.token)
    return { isValid: false, error: '' };

  return validateAmountPrecision(transferForm.value.amount, props.token.precision);
});

// Handle QR code scan
const handleQrScan = async (privateKey: string) => {
  try {
    scannedPrivateKey.value = privateKey;

    // Create a temporary signer from the scanned private key
    tempSigner.value = await TempCTokensSigner.for(privateKey);

    showQrScanner.value = false;
  } catch (error) {
    toastError('Invalid private key from QR code', error);
    scannedPrivateKey.value = null;
    tempSigner.value = undefined;
  }
};

// Clear scanned key
const clearScannedKey = () => {
  scannedPrivateKey.value = null;
  if (tempSigner.value) {
    tempSigner.value.destroy();
    tempSigner.value = undefined;
  }
};

// Handle transfer (simplified for now)
const handleTransfer = async () => {
  if (!props.token) {
    toastError('Token information not available', new Error('Token not found'));
    return;
  }

  // For non-logged-in users, require QR code
  if (!props.isLoggedIn && !tempSigner.value) {
    toastError('Please scan your private key QR code to sign the transaction', new Error('No signer available'));
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
  const validation = validateAmountPrecision(transferForm.value.amount, props.token.precision);
  if (!validation.isValid) {
    toastError('Invalid amount', new Error(validation.error || 'Invalid amount format'));
    return;
  }

  try {
    isTransferring.value = true;

    // Determine the sender's public key
    const senderPublicKey = tempSigner.value
      ? tempSigner.value.publicKey
      : tokensStore.getUserPublicKey();

    if (!senderPublicKey)
      throw new Error('Could not determine sender public key');


    // Wait for transaction status
    await waitForTransactionStatus(
      () => ([{
        token_transfer_operation: {
          amount: {
            amount: transferForm.value.amount,
            nai: props.token!.nai!,
            precision: props.token!.precision
          },
          receiver: transferForm.value.to,
          sender: senderPublicKey,
          memo: transferForm.value.memo
        }
      } satisfies htm_operation]),
      'Transfer',
      true,
      tempSigner.value // Use temp signer if available
    );

    // Reset form on success
    transferForm.value = {
      to: '',
      amount: '',
      memo: ''
    };

    // Clear scanned key after successful transfer
    clearScannedKey();

    // Emit refresh event to parent
    emit('refresh');
  } catch (error) {
    toastError('Transfer failed', error);
  } finally {
    isTransferring.value = false;
  }
};

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
</script>

<template>
  <Card v-if="!props.token.isStaked" class="flex flex-col h-full">
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
        Send {{ props.token.symbol || props.token.name }} to another account
      </CardDescription>
    </CardHeader>
    <CardContent class="space-y-6 flex-1">
      <!-- Transfer form - shown when logged in OR has scanned QR code -->
      <div
        class="space-y-5"
      >
        <!-- QR Code Signing Section (for non-logged-in users) -->
        <div
          class="p-4 border rounded-lg bg-muted/50 space-y-3"
        >
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              <svg
                width="20"
                height="20"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                class="text-primary"
              >
                <path
                  style="fill: currentColor"
                  d="M3,11H5V13H3V11M11,5H13V9H11V5M9,11H13V15H11V13H9V11M15,11H17V13H19V11H21V13H19V15H21V19H19V21H17V19H13V21H11V17H15V15H17V13H15V11M19,19V15H17V19H19M15,3H21V9H15V3M17,5V7H19V5H17M3,3H9V9H3V3M5,5V7H7V5H5M3,15H9V21H3V15M5,17V19H7V17H5Z"
                />
              </svg>
              <Label class="text-sm font-medium">Sign with QR Code</Label>
            </div>
            <Button
              v-if="!tempSigner"
              size="sm"
              variant="outline"
              @click="showQrScanner = true"
            >
              <svg
                width="16"
                height="16"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                class="mr-1.5"
              >
                <path
                  style="fill: currentColor"
                  d="M4,4H10V10H4V4M20,4V10H14V4H20M14,15H16V13H14V11H16V13H18V11H20V13H18V15H20V18H18V20H16V18H13V20H11V16H14V15M16,15V18H18V15H16M4,20V14H10V20H4M6,6V8H8V6H6M16,6V8H18V6H16M6,16V18H8V16H6M4,11H6V13H4V11M9,11H13V15H11V13H9V11M11,6H13V10H11V6M2,2V6H0V2A2,2 0 0,1 2,0H6V2H2M22,0A2,2 0 0,1 24,2V6H22V2H18V0H22M2,18V22H6V24H2A2,2 0 0,1 0,22V18H2M22,22V18H24V22A2,2 0 0,1 22,24H18V22H22Z"
                />
              </svg>
              Scan Private Key
            </Button>
          </div>

          <!-- Scanned Key Display -->
          <div
            v-if="tempSigner"
            class="flex items-center gap-2 p-2 bg-background rounded border border-green-500"
          >
            <svg
              width="16"
              height="16"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              class="text-green-500 flex-shrink-0"
            >
              <path
                style="fill: currentColor"
                d="M21,7L9,19L3.5,13.5L4.91,12.09L9,16.17L19.59,5.59L21,7Z"
              />
            </svg>
            <span class="text-xs font-mono text-muted-foreground flex-1 truncate">
              {{ tempSigner.publicKey }}
            </span>
            <Button
              size="sm"
              variant="ghost"
              @click="clearScannedKey"
            >
              <svg
                width="16"
                height="16"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
              >
                <path
                  style="fill: currentColor"
                  d="M19,6.41L17.59,5L12,10.59L6.41,5L5,6.41L10.59,12L5,17.59L6.41,19L12,13.41L17.59,19L19,17.59L13.41,12L19,6.41Z"
                />
              </svg>
            </Button>
          </div>

          <p class="text-xs text-muted-foreground">
            {{ tempSigner ? 'Private key loaded. Ready to sign transaction.' : 'Scan your private key QR code to sign the transfer without logging in.' }}
          </p>

          <!-- Alternative: Connect Wallet -->
          <div v-if="!props.isLoggedIn && !tempSigner" class="pt-2 border-t">
            <Button
              variant="link"
              size="sm"
              class="w-full text-xs"
              @click="connectToHTM"
            >
              Or connect your persistent wallet instead
            </Button>
          </div>
        </div>

        <div class="space-y-2">
          <Label
            for="recipient"
            class="text-sm font-medium text-foreground"
          >
            Recipient Address (Public Key)
          </Label>
          <UserSelector
            id="recipient"
            v-model="recipientData"
            :disabled="isTransferring"
            class="transition-colors font-mono text-sm"
            :class="transferForm.to ? (isRecipientValid ? 'border-green-500 focus-visible:ring-green-500' : 'border-red-500 focus-visible:ring-red-500') : ''"
            placeholder="Enter recipient public key (STM...)"
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

        <TokenAmountInput
          v-model="transferForm.amount"
          :token="props.token"
          :disabled="isTransferring"
          :available-balance="props.userBalance?.displayBalance"
          variant="explicit"
        />

        <CollapsibleMemoInput
          v-model="transferForm.memo"
          :disabled="isTransferring"
          placeholder="Add memo..."
          :rows="4"
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

  <!-- QR Scanner Modal -->
  <QrScanner
    v-model="showQrScanner"
    @scan="handleQrScan"
  />
</template>
