<script setup lang="ts">
import { UsedWallet } from '@/stores/settings.store';
import { ref } from 'vue';
import SelectWallet from '@/components/onboarding/SelectWallet.vue';
import PeakVaultConnect from '@/components/onboarding/wallets/peakvault/PeakVaultConnect.vue';
import KeychainConnect from '@/components/onboarding/wallets/keychain/KeychainConnect.vue';
import MetamaskConnect from '@/components/onboarding/wallets/metamask/MetamaskConnect.vue';
import ThankYou from '@/components/onboarding/ThankYou.vue';

const emit = defineEmits(["complete", "close"]);

const selectedWallet = ref<UsedWallet | null>(null);
const selectedAccount = ref<string | null>(null);

const close = () => {
  emit("complete", { wallet: selectedWallet.value!, account: selectedAccount.value! });
};

const stage_1_SelectWallet = ref(true);
const stage_2_ConnectWallet = ref(false);
const stage_3_ThankYou = ref(false);

const setAccount = (account: string) => {
  stage_1_SelectWallet.value = false;
  stage_2_ConnectWallet.value = false;
  stage_3_ThankYou.value = true;

  selectedAccount.value = account;
};

const walletSelect = (type: UsedWallet) => {
  stage_1_SelectWallet.value = false;
  stage_2_ConnectWallet.value = true;
  stage_3_ThankYou.value = false;

  selectedWallet.value = type;
};

const backToStage1 = () => {
  selectedWallet.value = null;
  selectedAccount.value = null;

  stage_1_SelectWallet.value = true;
  stage_2_ConnectWallet.value = false;
  stage_3_ThankYou.value = false;
}
</script>

<template>
  <div class="bg-black/30 backdrop-blur-sm h-full w-full z-50 flex items-center justify-center">
    <div class="onboarding-container">
      <SelectWallet v-if="stage_1_SelectWallet" @close="emit('close')" @walletSelect="walletSelect" />
      <div v-if="stage_2_ConnectWallet">
        <KeychainConnect v-if="selectedWallet === UsedWallet.KEYCHAIN" @close="backToStage1" @setaccount="setAccount" />
        <PeakVaultConnect v-if="selectedWallet === UsedWallet.PEAKVAULT" @close="backToStage1" @setaccount="setAccount" />
        <MetamaskConnect v-if="selectedWallet === UsedWallet.METAMASK" @close="backToStage1" @setaccount="setAccount" />
      </div>
      <ThankYou v-if="stage_3_ThankYou" :wallet="selectedWallet!" :account="selectedAccount!" @close="close" />
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
