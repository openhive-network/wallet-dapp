<script setup lang="ts">
import { ref } from 'vue';

import { Button } from '@/components/ui/button';
import { useTokensStore } from '@/stores/tokens.store';
import { toastError } from '@/utils/parse-error';

const tokensStore = useTokensStore();

// Google Wallet integration
const googleWalletLoading = ref(false);

const addToGoogleWallet = async () => {
  googleWalletLoading.value = true;

  try {
    const { operationalKey, name } = await tokensStore.getCurrentUserMetadata();
    const baseUrl = window.location.origin;
    const data = await $fetch<{ url?: string; error?: boolean; message?: string }>('/api/google-wallet', {
      method: 'POST',
      body: {
        operationalPublicKey: operationalKey,
        displayName: name || 'User',
        baseUrl
      }
    });
    if (data.url && !data.error)
      window.open(data.url, '_blank');
    else
      toastError('Failed to generate Google Wallet pass', new Error(data.message || 'Unknown error', { cause: data }));
  } catch (error) {
    toastError('Error generating Google Wallet pass', error);
  } finally {
    googleWalletLoading.value = false;
  }
};
</script>

<template>
  <Button
    class="w-full flex items-center justify-center gap-2 px-4 py-2 bg-white text-gray-700 border border-gray-300 rounded-md shadow hover:shadow-md transition-all duration-150 active:shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
    :disabled="googleWalletLoading"
    @click="addToGoogleWallet"
  >
    <svg width="20" height="20" viewBox="0 0 48 48" class="mr-2">
      <g>
        <path fill="#4285F4" d="M24 9.5c3.54 0 6.73 1.22 9.24 3.22l6.9-6.9C36.16 2.36 30.4 0 24 0 14.82 0 6.73 5.48 2.69 13.44l8.06 6.27C12.7 13.13 17.89 9.5 24 9.5z"/>
        <path fill="#34A853" d="M46.1 24.5c0-1.64-.15-3.22-.43-4.75H24v9.02h12.44c-.54 2.9-2.18 5.36-4.64 7.02l7.18 5.59C43.98 37.13 46.1 31.29 46.1 24.5z"/>
        <path fill="#FBBC05" d="M10.75 28.71c-1.13-3.36-1.13-6.97 0-10.33l-8.06-6.27C.64 16.36 0 20.09 0 24c0 3.91.64 7.64 2.69 11.09l8.06-6.27z"/>
        <path fill="#EA4335" d="M24 48c6.4 0 12.16-2.36 16.14-6.48l-7.18-5.59c-2.01 1.35-4.59 2.14-7.46 2.14-6.11 0-11.3-3.63-13.25-8.82l-8.06 6.27C6.73 42.52 14.82 48 24 48z"/>
      </g>
    </svg>
    <span v-if="googleWalletLoading">Adding to Google Wallet...</span>
    <span v-else>Add to Google Wallet</span>
  </Button>
</template>
