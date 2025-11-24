<script setup lang="ts">
import type { htm_operation } from '@mtyszczak-cargo/htm';

import CollapsibleMemoInput from '@/components/CollapsibleMemoInput.vue';
import { TokenAmountInput } from '@/components/htm/amount';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useSettingsStore } from '@/stores/settings.store';
import type { CTokenBalanceDisplay, CTokenDefinitionDisplay } from '@/stores/tokens.store';
import { useWalletStore } from '@/stores/wallet.store';
import { toastError } from '@/utils/parse-error';
import { waitForTransactionStatus } from '@/utils/transaction-status';
import { isValidPublicKey, validateAmountPrecision } from '@/utils/validators';
import CTokensProvider from '@/utils/wallet/ctokens/signer';

const props = defineProps<{
  token: CTokenDefinitionDisplay;
  userBalance: CTokenBalanceDisplay | null;
  isLoggedIn: boolean;
  assetNum: number;
}>();

const emit = defineEmits<{
  refresh: [];
}>();

const settingsStore = useSettingsStore();
const walletStore = useWalletStore();
const router = useRouter();

const isTransferring = ref(false);

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

// Handle transfer (simplified for now)
const handleTransfer = async () => {
  if (!props.token || !props.isLoggedIn) {
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
  const validation = validateAmountPrecision(transferForm.value.amount, props.token.precision);
  if (!validation.isValid) {
    toastError('Invalid amount', new Error(validation.error || 'Invalid amount format'));
    return;
  }

  try {
    isTransferring.value = true;

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
      <!-- Not logged in state -->
      <div
        v-if="!props.isLoggedIn"
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
        v-else-if="!props.userBalance || props.userBalance.balance === 0n"
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
            Your account doesn't have any {{ props.token.symbol || props.token.name }} tokens to transfer.
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
</template>
