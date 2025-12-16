<script setup lang="ts">
import type { htm_operation } from '@mtyszczak-cargo/htm';
import { computed, ref, watch } from 'vue';
import { useRouter } from 'vue-router';

import CollapsibleMemoInput from '@/components/CollapsibleMemoInput.vue';
import { TokenAmountInput } from '@/components/htm/amount';
import QrScanner from '@/components/QrScanner.vue';
import ReceiverTokenSummary from '@/components/ReceiverTokenSummary.vue';
import TransferCompletedSummary from '@/components/TransferCompletedSummary.vue';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { useTokensStore, type CTokenDisplayBase } from '@/stores/tokens.store';
import { useWalletStore } from '@/stores/wallet.store';
import { toastError } from '@/utils/parse-error';
import { waitForTransactionStatus } from '@/utils/transaction-status';
import CTokensProvider from '@/utils/wallet/ctokens/signer';
import { TempCTokensSigner } from '@/utils/wallet/ctokens/temp-signer';

interface TransferSummary {
  amount: string;
  tokenLabel: string;
  senderPublicKey: string;
  receiver: string;
  receiverPublicKey: string;
  remainingBalance?: string;
  timestamp?: string;
}

interface Props {
  receiverKey?: string;
  tokenData: CTokenDisplayBase | undefined;
  queryAmount?: string;
  queryMemo?: string;
  assetNum: number;
}

const props = defineProps<Props>();

const senderPublicKey = ref('');

const receiverName = ref('');
const receiverAvatar = ref<string | undefined>(undefined);

const fetchUserMetadata = async () => {
  try {
    if (!props.receiverKey) return;

    const { name, profileImage } = await tokensStore.getUser(props.receiverKey);
    receiverName.value = name || '';
    receiverAvatar.value = profileImage;
  } catch (error) {
    toastError('Failed to load receiver metadata', error);
  }
};

const emit = defineEmits<{
  transferCompleted: [summary: TransferSummary];
}>();

const tokensStore = useTokensStore();
const walletStore = useWalletStore();

const tokenComputed = computed(() => props.tokenData);
const amountComputed = computed(() => {
  if (props.tokenData === undefined || props.queryAmount === undefined)
    return '';

  if (props.tokenData.precision === 0)
    return props.queryAmount || '';

  return ((props.queryAmount.slice(0, -props.tokenData.precision) || '0') + '.' + props.queryAmount.slice(-props.tokenData.precision));
});

// QR code signing state
const showQrScanner = ref(false);
const scannedPrivateKey = ref<string | null>(null);
const tempSigner = shallowRef<TempCTokensSigner | undefined>(undefined);

const router = useRouter();

// Form state
const form = ref({
  amount: amountComputed.value || '',
  token: tokenComputed.value,
  memo: props.queryMemo || ''
});

const isSending = ref(false);
const transferCompleted = ref(false);
const sentSummary = ref<TransferSummary | null>(null);

// Check if user is logged in
const isLoggedIn = computed(() => !!tokensStore.wallet);

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
  senderPublicKey.value = tokensStore.getUserPublicKey() || '';
};

// TODO: Fix validation

const isFormValid = computed(() => {
  if (!form.value.token) return false;
  if (form.value.amount.trim() === '') return false;
  return true;
});

const handleSend = async () => {
  if (!form.value.token) {
    toastError('Token not loaded', new Error('Token details not available'));
    return;
  }

  // For non-logged-in users, require QR code
  if (!isLoggedIn.value && !tempSigner.value) {
    toastError('Please scan your private key QR code to sign the transaction', new Error('No signer available'));
    return;
  }

  if (!form.value.amount || !props.receiverKey) {
    toastError('Missing required fields', new Error('Amount and receiver are required'));
    return;
  }

  try {
    isSending.value = true;

    // Determine the sender's public key
    const sender = tempSigner.value
      ? tempSigner.value.publicKey
      : tokensStore.getUserPublicKey();

    if (!sender)
      throw new Error('Could not determine sender public key');


    await waitForTransactionStatus(
      () => ([{
        token_transfer_operation: {
          amount: {
            amount: form.value.amount,
            nai: form.value.token!.nai!,
            precision: form.value.token!.precision || 0
          },
          receiver: props.receiverKey!,
          sender,
          memo: form.value.memo
        }
      } satisfies htm_operation]),
      'Transfer',
      true,
      tempSigner.value // Use temp signer if available
    );

    transferCompleted.value = true;

    let remainingBalance = `0 ${form.value.token.symbol}`;

    try {
      const balanceObj = await tokensStore.getBalanceSingleToken(sender, form.value.token.assetNum);
      remainingBalance = balanceObj.displayBalance;
    } catch {}

    const receiverLabel = receiverName.value || props.receiverKey || 'Recipient';
    const tokenLabel = form.value.token.symbol || form.value.token.name || String(form.value.token.assetNum) || '';

    const ts = new Date().toISOString();

    sentSummary.value = {
      amount: form.value.amount,
      tokenLabel,
      senderPublicKey: senderPublicKey.value,
      receiver: receiverLabel,
      receiverPublicKey: props.receiverKey!,
      remainingBalance,
      timestamp: ts
    };

    // Clear scanned key after successful transfer
    clearScannedKey();

    emit('transferCompleted', sentSummary.value);
  } catch (error) {
    toastError('Transfer failed', error);
  } finally {
    isSending.value = false;
  }
};

const conditionalLogin = async () => {
  if (await CTokensProvider.hasWallet())
    walletStore.isProvideWalletPasswordModalOpen = true;
  else
    router.push({ path: '/tokens/register-account' });

};

// Watch query params changes to update form
watch(() => props.queryAmount, (newValue) => {
  if (newValue)
    form.value.amount = amountComputed.value;
});

watch(() => props.tokenData, (newValue) => {
  if (newValue)
    form.value.token = newValue;
});

watch(() => props.queryMemo, (newValue) => {
  if (newValue)
    form.value.memo = newValue;
});

watch(isLoggedIn, (newValue) => {
  const key = tokensStore.getUserPublicKey();
  senderPublicKey.value = newValue && key ? key : '';
});

onMounted(() => {
  fetchUserMetadata();

  senderPublicKey.value = tokensStore.getUserPublicKey() || '';
});
</script>

<template>
  <Card>
    <CardHeader>
      <CardTitle>Confirm Transfer</CardTitle>
      <CardDescription>
        Review the transfer details and confirm
      </CardDescription>
    </CardHeader>
    <CardContent class="space-y-4">
      <!-- QR Code Signing Section (for non-logged-in users) - moves to bottom on mobile -->
      <div class="flex flex-col space-y-5">
        <!-- QR Code Signing Section - order last on mobile -->
        <div
          class="order-last sm:order-first p-4 border rounded-lg bg-muted/50 space-y-3"
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
          <div v-if="!isLoggedIn && !tempSigner" class="pt-2 border-t">
            <Button
              variant="link"
              size="sm"
              class="w-full text-xs"
              @click="conditionalLogin()"
            >
              Or connect your persistent wallet instead
            </Button>
          </div>
        </div>
      </div>

      <!-- Compact recipient + token summary -->
      <ReceiverTokenSummary
        :receiver-name="receiverName"
        :receiver-key="receiverKey"
        :receiver-avatar="receiverAvatar"
        label="Recipient"
      />

      <!-- Amount compact -->
      <TokenAmountInput
        id="token-amount"
        v-model="form.amount"
        :public-key="senderPublicKey"
        :variant="tokenComputed ? 'explicit' : 'selector'"
        :token="form.token"
      />

      <!-- Memo compact -->
      <CollapsibleMemoInput
        v-model="form.memo"
        :readonly="true"
        :auto-expand="!!queryMemo"
      />

      <!-- Actions / Summary -->
      <div class="pt-3">
        <!-- Send button -->
        <Button
          v-if="!transferCompleted"
          class="w-full"
          :disabled="isSending || !isFormValid || (!isLoggedIn && !tempSigner)"
          @click="handleSend"
        >
          <template v-if="isSending">Sending...</template>
          <template v-else-if="isLoggedIn || tempSigner">Send Token</template>
          <template v-else>
            <span class="sm:hidden">Scan QR</span>
            <span class="hidden sm:inline">Scan QR Code or Log in to Send Token</span>
          </template>
        </Button>

        <!-- Bank-style confirmation summary shown after a successful transfer -->
        <TransferCompletedSummary
          v-if="transferCompleted"
          :amount="sentSummary?.amount || form.amount"
          :token-symbol="tokenData?.symbol"
          :token-name="tokenData!.name!"
          :is-receive-mode="true"
          :receiver-key="receiverKey"
          :receiver-name="receiverName"
          :remaining-balance="sentSummary?.remainingBalance"
          :timestamp="sentSummary?.timestamp"
          :asset-num="assetNum"
          :memo="form.memo"
        />
      </div>
    </CardContent>
  </Card>

  <!-- QR Scanner Modal -->
  <QrScanner
    v-model="showQrScanner"
    @scan="handleQrScan"
  />
</template>
