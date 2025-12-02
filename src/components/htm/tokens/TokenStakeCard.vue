<script setup lang="ts">
import type { htm_operation } from '@mtyszczak-cargo/htm';

import { TokenAmountInput } from '@/components/htm/amount';
import { AlertDescription, Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useSettingsStore } from '@/stores/settings.store';
import { useTokensStore, type CTokenBalanceDisplay, type CTokenDefinitionDisplay } from '@/stores/tokens.store';
import { useWalletStore } from '@/stores/wallet.store';
import { isVesting, toLiquid, toVesting } from '@/utils/nai-tokens';
import { toastError } from '@/utils/parse-error';
import { waitForTransactionStatus } from '@/utils/transaction-status';
import { validateAmountPrecision, isValidPublicKey } from '@/utils/validators';
import CTokensProvider from '@/utils/wallet/ctokens/signer';

const props = defineProps<{
  token: CTokenDefinitionDisplay;
  userBalance: CTokenBalanceDisplay | null;
  isLoggedIn: boolean;
  isTokenOwner: boolean;
  assetNum: number;
}>();

const emit = defineEmits<{
  refresh: [];
}>();

const settingsStore = useSettingsStore();
const walletStore = useWalletStore();
const tokensStore = useTokensStore();
const router = useRouter();

const isStaking = ref(false);
const isUnstaking = ref(false);

// Stake/Unstake form
const stakeForm = ref({
  amount: '',
  receiver: '' // Optional: can stake to another account
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

// Handle stake tokens
const handleStake = async () => {
  if (!props.token || !props.isLoggedIn) {
    toastError('You must be logged in to stake tokens', new Error('Not logged in'));
    return;
  }

  if (!stakeForm.value.amount) {
    toastError('Please enter amount to stake', new Error('Missing amount'));
    return;
  }

  // Check if staking is allowed
  if (!props.token.othersCanStake && !props.isTokenOwner) {
    toastError('Staking is not allowed for this token', new Error('Staking disabled'));
    return;
  }

  // Validate amount precision
  const validation = validateAmountPrecision(stakeForm.value.amount, props.token.precision);
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

    let nai = props.token!.nai!;
    const isVestingNai = isVesting(props.token.nai!, props.token.precision);
    if (isVestingNai)
      nai = toLiquid(props.token.nai!, props.token.precision);

    // Wait for transaction status
    await waitForTransactionStatus(
      () => ([{
        token_transform_operation: {
          holder: tokensStore.getUserPublicKey()!,
          receiver: stakeForm.value.receiver || undefined,
          amount: {
            amount: stakeForm.value.amount,
            nai,
            precision: props.token!.precision
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

    // Emit refresh event to parent
    emit('refresh');
  } catch (error) {
    toastError('Staking failed', error);
  } finally {
    isStaking.value = false;
  }
};

// Handle unstake tokens
const handleUnstake = async () => {
  if (!props.token || !props.isLoggedIn) {
    toastError('You must be logged in to unstake tokens', new Error('Not logged in'));
    return;
  }

  if (!stakeForm.value.amount) {
    toastError('Please enter amount to unstake', new Error('Missing amount'));
    return;
  }

  // Check if unstaking is allowed
  if (!props.token.othersCanUnstake && !props.isTokenOwner) {
    toastError('Unstaking is not allowed for this token', new Error('Unstaking disabled'));
    return;
  }

  // Validate amount precision
  const validation = validateAmountPrecision(stakeForm.value.amount, props.token.precision);
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

    let nai = props.token!.nai!;
    const isVestingNai = isVesting(props.token.nai!, props.token.precision);
    if (!isVestingNai)
      nai = toVesting(props.token.nai!, props.token.precision);

    // Wait for transaction status
    await waitForTransactionStatus(
      () => ([{
        token_transform_operation: {
          holder: tokensStore.getUserPublicKey()!,
          receiver: stakeForm.value.receiver || undefined,
          amount: {
            amount: stakeForm.value.amount,
            nai,
            precision: props.token!.precision
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

    // Emit refresh event to parent
    emit('refresh');
  } catch (error) {
    toastError('Unstaking failed', error);
  } finally {
    isUnstaking.value = false;
  }
};
</script>

<template>
  <Card
    v-if="props.token && (props.token.othersCanStake || props.token.othersCanUnstake || props.isTokenOwner)"
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
            Your account doesn't have any {{ props.token.symbol || props.token.name }} tokens to stake/unstake.
          </p>
        </div>
      </div>

      <!-- Stake/Unstake form -->
      <div
        v-else
        class="space-y-5"
      >
        <TokenAmountInput
          v-model="stakeForm.amount"
          :token="props.token"
          :disabled="isStaking || isUnstaking"
          variant="explicit"
        />

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
            v-if="props.token.othersCanStake || props.isTokenOwner"
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
            v-if="props.token.othersCanUnstake || props.isTokenOwner"
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
          v-if="!props.token.othersCanStake && !props.isTokenOwner"
          class="bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800"
        >
          <AlertDescription class="text-amber-800 dark:text-amber-200 text-sm">
            ⚠️ Staking is disabled for this token (only owner can stake)
          </AlertDescription>
        </Alert>

        <Alert
          v-if="!props.token.othersCanUnstake && !props.isTokenOwner"
          class="bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800"
        >
          <AlertDescription class="text-amber-800 dark:text-amber-200 text-sm">
            ⚠️ Unstaking is disabled for this token (only owner can unstake)
          </AlertDescription>
        </Alert>
      </div>
    </CardContent>
  </Card>
</template>
