<script setup lang="ts">
import HTMLoginForm from '@/components/htm/HTMLoginForm.vue';
import { HTMRegistrationForm } from '@/components/htm/HTMRegistrationForm';
import HTMRegistrationOptions from '@/components/htm/HTMRegistrationOptions.vue';
import CommonLayout from '@/layouts/common/CommonLayout.vue';
import { useTokensStore } from '@/stores/tokens.store';
import { useWalletStore } from '@/stores/wallet.store';
import { canAutoLogin, performAutoLogin } from '@/utils/auto-login';
import { toastError } from '@/utils/parse-error';

const route = useRoute();
const tokensStore = useTokensStore();
const walletStore = useWalletStore();

// Access meta
const isPublicPage = computed(() => route.meta.isPublicPage ?? false); // Default to false
const isAuthenticated = computed(() => !!tokensStore.wallet);

const hasL1WalletConnected = computed(() => walletStore.hasWallet && !walletStore.isL2Wallet);

const showRegistrationForm = ref(false);
const showLoginForm = ref(false);

const tryAutoLogin = async () => {
  if (!import.meta.client || isAuthenticated.value) return;

  try {
    const canLogin = await canAutoLogin();
    if (canLogin)
      await performAutoLogin();
  } catch (error) {
    toastError('Auto-login failed', error);
  }
};

onMounted(() => {
  void tryAutoLogin();
});

// Handle showing registration form
const handleShowRegistration = () => {
  showRegistrationForm.value = true;
  showLoginForm.value = false;
};

// Handle showing login form
const handleShowLogin = () => {
  showLoginForm.value = true;
  showRegistrationForm.value = false;
};

// Handle successful login or registration
const handleSuccess = () => {
  showRegistrationForm.value = false;
  showLoginForm.value = false;
};

// Go back to options
const goBack = () => {
  showRegistrationForm.value = false;
  showLoginForm.value = false;
};
</script>

<template>
  <CommonLayout>
    <!-- Show account overview component -->
    <div v-if="isAuthenticated || isPublicPage">
      <NuxtPage />
    </div>
    <!-- Show login/registration options when not authenticated -->
    <div
      v-else
      class="container mx-auto py-12 px-4 max-w-2xl"
    >
      <!-- Show registration form -->
      <HTMRegistrationForm
        v-if="showRegistrationForm"
        @go-back="goBack"
        @success="handleSuccess"
      />

      <!-- Show login form -->
      <HTMLoginForm
        v-else-if="showLoginForm"
        :show-close-button="true"
        title="HTM Access"
        description="Access your HTM wallet to manage custom tokens"
        @success="handleSuccess"
        @close="goBack"
      />

      <!-- Show options -->
      <HTMRegistrationOptions
        v-else
        @show-registration-form="handleShowRegistration"
        @show-login-form="handleShowLogin"
      />
    </div>
    <div
      v-if="!hasL1WalletConnected"
      class="fixed bottom-0 z-12 select-none cursor-pointer dark:bg-blue-800 bg-blue-600 px-4 h-[20px] w-full md:w-[calc(100%-var(--sidebar-width))] flex flex-row justify-center items-center"
      @click="walletStore.openWalletSelectModal()"
    >
      <span class="text-xs font-semibold text-white/90">
        You are using L1 proxy account.
      </span>
    </div>
  </CommonLayout>
</template>
