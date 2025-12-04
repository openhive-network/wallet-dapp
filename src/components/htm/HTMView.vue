<script setup lang="ts">
import { computed, ref, onMounted } from 'vue';

import HTMLoginForm from '@/components/htm/HTMLoginForm.vue';
import { HTMRegistrationForm } from '@/components/htm/HTMRegistrationForm';
import HTMRegistrationOptions from '@/components/htm/HTMRegistrationOptions.vue';
import { useTokensStore } from '@/stores/tokens.store';
import { canAutoLogin, performAutoLogin } from '@/utils/auto-login';
import { toastError } from '@/utils/parse-error';

const tokensStore = useTokensStore();

defineProps<{
  isPublicPage?: boolean;
}>();

const showRegistrationForm = ref(false);
const showLoginForm = ref(false);

const isAuthenticated = computed(() => tokensStore.wallet);

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
  <div class="p-8">
    <!-- Show account overview component -->
    <div v-if="isAuthenticated || isPublicPage">
      <slot />
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
  </div>
</template>
