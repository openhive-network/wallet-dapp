<script setup lang="ts">
import { ref, onMounted } from 'vue';

import SelectWallet from '@/components/onboarding/SelectWallet.vue';
import ThankYou from '@/components/onboarding/ThankYou.vue';
import GoogleDriveConnect from '@/components/onboarding/wallets/google-drive/GoogleDriveConnect.vue';
import HTMConnect from '@/components/onboarding/wallets/htm/HTMConnect.vue';
import KeychainConnect from '@/components/onboarding/wallets/keychain/KeychainConnect.vue';
import MetamaskConnect from '@/components/onboarding/wallets/metamask/MetamaskConnect.vue';
import PeakVaultConnect from '@/components/onboarding/wallets/peakvault/PeakVaultConnect.vue';
import { UsedWallet } from '@/stores/settings.store';

interface Props {
  preselectedWallet?: UsedWallet;
  prefilledAccountName?: string;
}

const props = defineProps<Props>();
const emit = defineEmits(['complete', 'close']);

const selectedWallet = ref<UsedWallet | null>(null);
const selectedAccount = ref<string | null>(null);

const close = () => {
  emit('complete', { wallet: selectedWallet.value!, account: selectedAccount.value! });
};

const stage_1_select_wallet = ref(true);
const stage_2_connect_wallet = ref(false);
const stage_3_thank_you = ref(false);

const setAccount = (account: string) => {
  stage_1_select_wallet.value = false;
  stage_2_connect_wallet.value = false;
  stage_3_thank_you.value = true;

  selectedAccount.value = account;
};

const walletSelect = (type: UsedWallet) => {
  stage_1_select_wallet.value = false;
  stage_2_connect_wallet.value = true;
  stage_3_thank_you.value = false;

  selectedWallet.value = type;
};

const backToStage1 = () => {
  selectedWallet.value = null;
  selectedAccount.value = null;

  stage_1_select_wallet.value = true;
  stage_2_connect_wallet.value = false;
  stage_3_thank_you.value = false;
};

onMounted(() => {
  // If wallet is preselected, skip to stage 2
  if (props.preselectedWallet !== undefined)
    walletSelect(props.preselectedWallet);
});
</script>

<template>
  <div class="bg-black/30 backdrop-blur-sm h-full w-full z-50 flex items-center justify-center">
    <div class="onboarding-container">
      <SelectWallet
        v-if="stage_1_select_wallet"
        @close="emit('close')"
        @wallet-select="walletSelect"
      />
      <div v-if="stage_2_connect_wallet">
        <GoogleDriveConnect
          v-if="selectedWallet === UsedWallet.GOOGLE_DRIVE"
          :account-name="prefilledAccountName"
          @close="backToStage1"
          @setaccount="setAccount"
        />
        <KeychainConnect
          v-if="selectedWallet === UsedWallet.KEYCHAIN"
          @close="backToStage1"
          @setaccount="setAccount"
        />
        <PeakVaultConnect
          v-if="selectedWallet === UsedWallet.PEAKVAULT"
          @close="backToStage1"
          @setaccount="setAccount"
        />
        <MetamaskConnect
          v-if="selectedWallet === UsedWallet.METAMASK"
          @close="backToStage1"
          @setaccount="setAccount"
        />
        <HTMConnect
          v-if="selectedWallet === UsedWallet.CTOKENS_IMPLEMENTATION"
          @close="backToStage1"
          @setaccount="setAccount"
        />
      </div>
      <ThankYou
        v-if="stage_3_thank_you"
        :wallet="selectedWallet!"
        :account="selectedAccount!"
        @close="close"
      />
    </div>
  </div>
</template>

<style scoped>
.onboarding-container {
  max-height: 90vh;
  overflow-x: hidden;
  overflow-y: auto;
}
</style>
