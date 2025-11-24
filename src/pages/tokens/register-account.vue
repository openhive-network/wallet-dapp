<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';

import HTMLoginSuccessCard from '@/components/htm/HTMLoginSuccessCard.vue';
import HTMLoginUsingPasswordCard from '@/components/htm/HTMLoginUsingPasswordCard.vue';
import HTMLoginWithOtherAccount from '@/components/htm/HTMLoginWithOtherAccount.vue';
import HTMProvidePasswordForExistingWallet from '@/components/htm/HTMProvidePasswordForExistingWallet.vue';
import { HTMRegistrationForm } from '@/components/htm/HTMRegistrationForm';
import HTMRegistrationOptions from '@/components/htm/HTMRegistrationOptions.vue';
import { useWalletStore } from '@/stores/wallet.store';
import CTokensProvider from '@/utils/wallet/ctokens/signer';

const walletStore = useWalletStore();

const showLoginSuccess = ref(false);
const showRegistrationForm = ref(false);
const showLoginForm = ref(false);
const showLoginUsingPassword = ref(false);
const showLoginUsingOtherAccount = ref(false);

// Go back to main options
const goBack = () => {
  showLoginSuccess.value = false;
  showRegistrationForm.value = false;
  showLoginForm.value = false;
  showLoginUsingPassword.value = false;
  showLoginUsingOtherAccount.value = false;
};

const canLogIntoL2 = computed(() => {
  return !!CTokensProvider.getOperationalPublicKey();
});

onMounted(() => {
  if (walletStore.wallet && !walletStore.isL2Wallet) {
    // If already logged in using L1 wallet,
    // show the registration page in case someone wants to create another account
    showRegistrationForm.value = true;
  }
});
</script>

<template>
  <div class="container mx-auto py-12 px-4 max-w-2xl">
    <HTMProvidePasswordForExistingWallet
      v-if="showLoginForm && canLogIntoL2 && !showLoginUsingPassword && !showLoginUsingOtherAccount"
      @go-back="goBack"
      @show-login-password="showLoginUsingPassword = true"
      @show-login-other-account="showLoginUsingOtherAccount = true"
    />

    <HTMLoginUsingPasswordCard
      v-else-if="showLoginUsingPassword"
      @go-back="goBack"
      @success="showLoginSuccess = true"
    />

    <HTMLoginWithOtherAccount
      v-else-if="showLoginForm || showLoginUsingOtherAccount"
      @go-back="goBack"
      @success="showLoginSuccess = true"
    />

    <!-- Show HTM Login Success -->
    <HTMLoginSuccessCard v-else-if="showLoginSuccess" />

    <!-- Show HTM Registration Form -->
    <HTMRegistrationForm
      v-else-if="showRegistrationForm"
      @go-back="goBack"
      @success="showLoginSuccess = true"
    />

    <!-- Show main registration options -->
    <HTMRegistrationOptions
      v-else
      @show-registration-form="showRegistrationForm = true"
      @show-login-form="showLoginForm = true"
    />
  </div>
</template>
