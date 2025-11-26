<script setup lang="ts">
import { onMounted, ref } from 'vue';

import HTMLoginForm from '@/components/htm/HTMLoginForm.vue';
import HTMLoginSuccessCard from '@/components/htm/HTMLoginSuccessCard.vue';
import { HTMRegistrationForm } from '@/components/htm/HTMRegistrationForm';
import HTMRegistrationOptions from '@/components/htm/HTMRegistrationOptions.vue';
import { useWalletStore } from '@/stores/wallet.store';

const walletStore = useWalletStore();

const showLoginSuccess = ref(false);
const showRegistrationForm = ref(false);
const showLoginForm = ref(false);

// Go back to main options
const goBack = () => {
  showLoginSuccess.value = false;
  showRegistrationForm.value = false;
  showLoginForm.value = false;
};

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
    <!-- Show HTM Login Success -->
    <HTMLoginSuccessCard v-if="showLoginSuccess" />

    <!-- Show HTM Registration Form -->
    <HTMRegistrationForm
      v-else-if="showRegistrationForm"
      @go-back="goBack"
      @success="showLoginSuccess = true"
    />

    <!-- Show login form -->
    <HTMLoginForm
      v-else-if="showLoginForm"
      :show-close-button="true"
      title="HTM Access"
      description="Access your HTM wallet to manage custom tokens"
      @success="showLoginSuccess = true"
      @close="goBack"
    />

    <!-- Show main registration options -->
    <HTMRegistrationOptions
      v-else
      @show-registration-form="showRegistrationForm = true"
      @show-login-form="showLoginForm = true"
    />
  </div>
</template>
