<script setup lang="ts">
import { LogIn } from 'lucide-vue-next';
import { ref, onMounted, watch, nextTick } from 'vue';

import GoogleDriveKeyManager from '@/components/settings/GoogleDriveKeyManager.vue';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useSettingsStore } from '@/stores/settings.store';

const settingsStore = useSettingsStore();
const isInitializing = ref(true);
const isGoogleDriveConnected = ref(false);
const googleDriveKeyManagerRef = ref<InstanceType<typeof GoogleDriveKeyManager> | null>(null);

const checkGoogleDriveConnection = async () => {
  isInitializing.value = true;
  try {
    await settingsStore.checkGoogleAuth();
    isGoogleDriveConnected.value = settingsStore.isGoogleAuthenticated;
  } catch (_error) {
    isGoogleDriveConnected.value = false;
  } finally {
    isInitializing.value = false;
  }
};

const handleConnectGoogleDrive = () => {
  settingsStore.loginWithGoogle('/settings');
};

/**
 * Handle OAuth callback - called when user returns from Google auth
 * Cleans up URL and triggers wallet info reload
 */
const handleOAuthCallback = async () => {
  // Check if we just returned from Google OAuth
  const urlParams = new URLSearchParams(window.location.search);
  const authStatus = urlParams.get('auth');

  if (authStatus === 'success') {
    // Remove the auth parameter from URL to prevent re-processing on refresh
    const newUrl = window.location.pathname;
    window.history.replaceState({}, document.title, newUrl);

    // Refresh auth state and wait for component to be ready
    await checkGoogleDriveConnection();

    // If now connected, trigger wallet info reload in child component
    if (isGoogleDriveConnected.value) {
      await nextTick();
      googleDriveKeyManagerRef.value?.reloadWalletInfo();
    }
  } else {
    // Normal page load - just check connection
    await checkGoogleDriveConnection();
  }
};

onMounted(() => {
  handleOAuthCallback();
});

// Watch for changes in authentication status (e.g., when user logs out from AccountSwitcher)
watch(() => settingsStore.isGoogleAuthenticated, async (newValue, oldValue) => {
  isGoogleDriveConnected.value = newValue;

  // If auth state changed from false to true, reload wallet info
  if (newValue && !oldValue) {
    await nextTick();
    googleDriveKeyManagerRef.value?.reloadWalletInfo();
  }
});
</script>

<template>
  <div class="container mx-auto p-4 max-w-4xl">
    <h1 class="text-3xl text-center font-bold my-12">
      Google Drive Wallet Management
    </h1>

    <!-- Loading state -->
    <div v-if="isInitializing" class="space-y-6">
      <div class="space-y-4">
        <Skeleton class="h-10 w-full" />
        <Skeleton class="h-10 w-full" />
        <Skeleton class="h-10 w-full" />
      </div>
    </div>

    <!-- Not connected to Google Drive -->
    <div v-else-if="!isGoogleDriveConnected" class="flex justify-center">
      <Card class="w-full max-w-md">
        <CardHeader class="text-center space-y-4 pb-4">
          <div class="flex justify-center">
            <div class="p-6 bg-primary/10 rounded-full">
              <LogIn class="w-12 h-12 text-primary" />
            </div>
          </div>
          <CardTitle class="text-2xl">
            Connect Google Drive
          </CardTitle>
          <CardDescription>
            Secure your encrypted keys in Google Drive
          </CardDescription>
        </CardHeader>
        <CardContent class="space-y-6">
          <div class="space-y-4 text-sm text-muted-foreground">
            <ul class="space-y-2 ml-4">
              <li class="flex items-start gap-2">
                <span class="text-primary mt-1">•</span>
                <span>Store your encrypted keys safely in your Google Drive</span>
              </li>
              <li class="flex items-start gap-2">
                <span class="text-primary mt-1">•</span>
                <span>Load your wallet data from any device by connecting with your Google account</span>
              </li>
            </ul>
          </div>

          <div class="space-y-3">
            <Button
              size="lg"
              class="w-full"
              @click="handleConnectGoogleDrive"
            >
              <LogIn class="w-5 h-5 mr-2" />
              Connect Google Drive
            </Button>
            <p class="text-xs text-center text-muted-foreground">
              You'll be redirected to Google to authorize access
            </p>
          </div>
        </CardContent>
      </Card>
    </div>

    <!-- Connected - show settings -->
    <div v-else>
      <GoogleDriveKeyManager ref="googleDriveKeyManagerRef" />
    </div>
  </div>
</template>
