<script setup lang="ts">
import { mdiClose, mdiPlus } from '@mdi/js';
import { ref, onMounted } from 'vue';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { UsedWallet, getWalletIcon } from '@/stores/settings.store';
import { GoogleDriveWalletProvider as GoogleDriveProvider } from '@/utils/wallet/google-drive/provider';

import Input from '~/src/components/ui/input/Input.vue';
import Label from '~/src/components/ui/label/Label.vue';

type GoogleDriveWalletStatus = {
  exists: boolean;
  accountName?: string;
  roles?: string[];
};

type GoogleUser = {
  name?: string;
  email?: string;
  picture?: string;
};

type FormState = {
  // Create form
  accountName: string;
  postingKey: string;
  activeKey: string;
  memoKey: string;
};

type KeyRole = 'posting' | 'active' | 'memo';
type ExpandedKeys = {
  [K in KeyRole]?: boolean;
};

const emit = defineEmits(['setaccount', 'close']);

const isLoading = ref(true);
const isProcessing = ref(false);
const error = ref<string | null>(null);
const walletStatus = ref<GoogleDriveWalletStatus>({
  exists: false
});
const googleUser = ref<GoogleUser | null>(null);

const form = ref<FormState>({
  accountName: '',
  postingKey: '',
  activeKey: '',
  memoKey: ''
});

const expandedKeys = ref<ExpandedKeys>({
  posting: false,
  active: false,
  memo: false
});

const toggleKeyInput = (role: KeyRole) => {
  expandedKeys.value[role] = !expandedKeys.value[role];
};

const hasAtLeastOneKey = (): boolean => {
  return !!(form.value.postingKey || form.value.activeKey || form.value.memoKey);
};

const step = ref<'check' | 'connect' | 'create' | 'success'>('check');

const close = () => {
  emit('close');
};

const openGoogleLogin = () => {
  // Redirect to Google OAuth login endpoint
  window.location.href = GoogleDriveProvider.getLoginUrl();
};

const logoutFromGoogle = async () => {
  isProcessing.value = true;
  error.value = null;

  try {
    await GoogleDriveProvider.logout();
    // After logout, check wallet status again (should redirect to connect)
    await checkWalletStatus();
  } catch (err) {
    error.value = `Error logging out: ${err instanceof Error ? err.message : String(err)}`;
    console.error('Logout error:', err);
  } finally {
    isProcessing.value = false;
  }
};

/**
 * Check if wallet exists on Google Drive
 */
async function checkWalletStatus () {
  isLoading.value = true;
  error.value = null;

  try {
    // First check if user is authenticated with Google
    const isAuthenticated = await GoogleDriveProvider.isAuthenticated();
    if (!isAuthenticated) {
      // Not authenticated - prompt user to connect Google
      step.value = 'connect';
      googleUser.value = null;
      return;
    }

    // Fetch Google user info
    try {
      const statusResponse = await fetch('/api/auth/google/status');
      if (statusResponse.ok) {
        const statusData = await statusResponse.json();
        if (statusData.authenticated && statusData.user)
          googleUser.value = statusData.user;
      }
    } catch (userErr) {
      console.warn('Failed to fetch Google user info:', userErr);
    }

    // User is authenticated with Google - now fetch wallet info
    const info = await GoogleDriveProvider.getWalletInfo();

    if (info.exists && info.accountName && info.roles) {
      walletStatus.value = {
        exists: true,
        accountName: info.accountName,
        roles: info.roles
      };

      // Auto-load wallet - it should be automatically unlocked since it's stored in Google Drive
      try {
        const result = await GoogleDriveProvider.loadWallet();
        console.log('Wallet loaded automatically:', result);

        // Save account name and emit event
        emit('setaccount', result.accountName);
        step.value = 'success';
      } catch (autoLoadErr) {
        console.error('Could not auto-load wallet:', autoLoadErr);
        const errorMessage = autoLoadErr instanceof Error ? autoLoadErr.message : String(autoLoadErr);

        // If wallet exists but is invalid (missing keys), prompt to recreate
        if (errorMessage.includes('missing all private keys')) {
          error.value = 'Your wallet file is corrupted or incomplete. Please create a new wallet.';
          walletStatus.value = { exists: false };
          step.value = 'create';
        } else {
          error.value = `Error loading wallet: ${errorMessage}`;
          step.value = 'check';
        }
      }
    } else {
      walletStatus.value = { exists: false };
      step.value = 'create';
    }
  } catch (err) {
    // Check if it's a Google auth expired error
    const errorObj = err as { code?: string; message?: string };
    if (errorObj.code === 'GOOGLE_AUTH_EXPIRED') {
      error.value = 'Your Google authentication has expired. Please log in again.';
      step.value = 'connect'; // Send user back to connect step
    } else {
      error.value = `Error checking wallet: ${err instanceof Error ? err.message : String(err)}`;
      step.value = 'check';
    }
    console.error('Wallet check error:', err);
  } finally {
    isLoading.value = false;
  }
}

/**
 * Create new wallet
 */
async function createWallet () {
  isProcessing.value = true;
  error.value = null;

  try {
    // Validate form
    if (!form.value.accountName)
      throw new Error('Account name is required');

    if (!hasAtLeastOneKey())
      throw new Error('At least one private key is required');

    // Prepare keys object
    const keys: {
      posting?: string;
      active?: string;
      memo?: string;
    } = {};

    if (form.value.postingKey)
      keys.posting = form.value.postingKey;

    if (form.value.activeKey)
      keys.active = form.value.activeKey;

    if (form.value.memoKey)
      keys.memo = form.value.memoKey;

    console.log('Creating wallet for account:', form.value.accountName);

    // Create wallet with password (access token is handled via cookies)
    await GoogleDriveProvider.createWallet(
      form.value.accountName,
      keys
    );

    console.log('Wallet created and loaded successfully');

    // Save account name before clearing form
    const createdAccountName = form.value.accountName;

    // Clear form
    form.value = {
      accountName: '',
      postingKey: '',
      activeKey: '',
      memoKey: ''
    };

    emit('setaccount', createdAccountName);
    step.value = 'success';
  } catch (err) {
    // Check if it's a Google auth expired error
    const errorObj = err as { code?: string; message?: string };
    if (errorObj.code === 'GOOGLE_AUTH_EXPIRED') {
      error.value = 'Your Google authentication has expired. Please log in again.';
      step.value = 'connect'; // Send user back to connect step
    } else
      error.value = `Error creating wallet: ${err instanceof Error ? err.message : String(err)}`;

    console.error('Create wallet error:', err);
  } finally {
    isProcessing.value = false;
  }
}

// Lifecycle
onMounted(() => {
  checkWalletStatus();
});
</script>

<template>
  <Card class="w-[400px]">
    <!-- Header -->
    <CardHeader>
      <CardTitle>
        <div class="inline-flex justify-between w-full">
          <div class="inline-flex items-center">
            <img
              :src="getWalletIcon(UsedWallet.GOOGLE_DRIVE)"
              class="w-[20px] mr-2"
            >
            <span class="mt-[2px]">Google Drive Wallet</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            class="px-2"
            @click="close"
          >
            <svg
              width="24"
              height="24"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
            ><path
              style="fill: hsl(var(--foreground))"
              :d="mdiClose"
            /></svg>
          </Button>
        </div>
      </CardTitle>
      <CardDescription v-if="step === 'check'">
        Checking wallet availability...
      </CardDescription>
      <CardDescription v-else-if="step === 'create'">
        Create a new wallet backed by Google Drive
      </CardDescription>
      <CardDescription v-else-if="step === 'success'">
        Wallet loaded successfully!
      </CardDescription>
    </CardHeader>

    <!-- Content -->
    <CardContent class="text-sm space-y-4">
      <!-- Loading state -->
      <div v-if="isLoading" class="flex items-center justify-center py-8">
        <div class="flex flex-col items-center gap-3">
          <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          <span class="text-muted-foreground">Loading...</span>
        </div>
      </div>

      <!-- Connect Google account (if not authenticated) -->
      <div v-else-if="step === 'connect'" class="space-y-4">
        <div class="p-3 bg-yellow-50 text-yellow-800 rounded-md">
          <div class="font-medium">Google account required</div>
          <div class="text-sm mt-1">Please connect your Google account to check for an existing wallet on Drive.</div>
        </div>

        <div v-if="error" class="p-3 bg-red-50 text-red-800 rounded-md">
          {{ error }}
        </div>

        <div class="flex gap-2 pt-2">
          <Button
            :disabled="isProcessing"
            class="flex-1"
            @click="openGoogleLogin"
          >
            Connect Google
          </Button>
          <Button
            variant="outline"
            :disabled="isProcessing"
            @click="close"
          >
            Cancel
          </Button>
        </div>
      </div>

      <!-- Create new wallet -->
      <div v-else-if="step === 'create'" class="space-y-4">
        <div class="p-3 bg-amber-50 text-amber-800 rounded-md text-xs">
          No wallet found yet. Create a new wallet backed by Google Drive.
        </div>

        <!-- Google User Info -->
        <div v-if="googleUser" class="space-y-2">
          <div class="p-3 bg-muted rounded-lg">
            <div class="flex items-center gap-3 mb-3">
              <div class="flex-1 min-w-0">
                <div class="font-medium text-sm truncate">{{ googleUser.name }}</div>
                <div class="text-xs text-muted-foreground truncate">{{ googleUser.email }}</div>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              class="w-full text-xs hover:text-destructive hover:border-destructive"
              :disabled="isProcessing"
              @click="logoutFromGoogle"
            >
              Logout from Google
            </Button>
          </div>
        </div>

        <div>
          <Label class="block text-sm font-medium mb-2">Hive Account Name</Label>
          <Input
            v-model="form.accountName"
            type="text"
            placeholder="Provide account name"
            class="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            :disabled="isProcessing"
          />
        </div>

        <div class="border-t pt-4">
          <Label class="block text-sm font-medium mb-3">Private Keys (at least one required)</Label>

          <div class="space-y-2">
            <!-- Posting Key -->
            <div>
              <Button
                v-if="!expandedKeys.posting"
                variant="ghost"
                size="sm"
                class="w-full justify-start"
                :disabled="isProcessing"
                @click="toggleKeyInput('posting')"
              >
                <svg
                  width="16"
                  height="16"
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  class="flex-shrink-0"
                >
                  <path
                    style="fill: currentColor"
                    :d="mdiPlus"
                  />
                </svg>
                Add Posting Key
              </Button>
              <div v-else class="space-y-2">
                <Label class="block text-xs text-muted-foreground">Posting Key</Label>
                <Input
                  v-model="form.postingKey"
                  type="password"
                  placeholder="Provide posting key"
                  class="w-full px-3 py-2 border rounded-md text-xs focus:outline-none focus:ring-2 focus:ring-primary"
                  :disabled="isProcessing"
                  @blur="!form.postingKey && toggleKeyInput('posting')"
                />
              </div>
            </div>

            <!-- Active Key -->
            <div>
              <Button
                v-if="!expandedKeys.active"
                variant="ghost"
                size="sm"
                class="w-full justify-start"
                :disabled="isProcessing"
                @click="toggleKeyInput('active')"
              >
                <svg
                  width="16"
                  height="16"
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  class="flex-shrink-0"
                >
                  <path
                    style="fill: currentColor"
                    :d="mdiPlus"
                  />
                </svg>
                Add Active Key
              </Button>
              <div v-else class="space-y-2">
                <Label class="block text-xs text-muted-foreground">Active Key</Label>
                <Input
                  v-model="form.activeKey"
                  type="password"
                  placeholder="Provide active key"
                  class="w-full px-3 py-2 border rounded-md text-xs focus:outline-none focus:ring-2 focus:ring-primary"
                  :disabled="isProcessing"
                  @blur="!form.activeKey && toggleKeyInput('active')"
                />
              </div>
            </div>

            <!-- Memo Key -->
            <div>
              <Button
                v-if="!expandedKeys.memo"
                variant="ghost"
                size="sm"
                class="w-full justify-start"
                :disabled="isProcessing"
                @click="toggleKeyInput('memo')"
              >
                <svg
                  width="16"
                  height="16"
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  class="flex-shrink-0"
                >
                  <path
                    style="fill: currentColor"
                    :d="mdiPlus"
                  />
                </svg>
                Add Memo Key
              </Button>
              <div v-else class="space-y-2">
                <Label class="block text-xs text-muted-foreground">Memo Key</Label>
                <Input
                  v-model="form.memoKey"
                  type="password"
                  placeholder="Provide memo key"
                  class="w-full px-3 py-2 border rounded-md text-xs focus:outline-none focus:ring-2 focus:ring-primary"
                  :disabled="isProcessing"
                  @blur="!form.memoKey && toggleKeyInput('memo')"
                />
              </div>
            </div>
          </div>
        </div>

        <div v-if="error" class="p-3 bg-red-50 text-red-800 rounded-md">
          {{ error }}
        </div>

        <div class="flex gap-2 pt-2">
          <Button
            :disabled="
              isProcessing ||
              !form.accountName ||
              (!form.postingKey && !form.activeKey && !form.memoKey)
            "
            class="flex-1"
            @click="createWallet"
          >
            {{ isProcessing ? 'Creating...' : 'Create Wallet' }}
          </Button>
          <Button
            variant="outline"
            :disabled="isProcessing"
            @click="close"
          >
            Cancel
          </Button>
        </div>
      </div>

      <!-- Success state -->
      <div v-else-if="step === 'success'" class="space-y-4">
        <div class="flex items-center justify-center py-4">
          <svg class="w-12 h-12 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <div class="text-center">
          <div class="font-semibold">Done!</div>
          <div class="text-sm text-muted-foreground mt-1">
            Your wallet is now loaded and ready to sign transactions
          </div>
        </div>
        <Button class="w-full" @click="close">
          Close
        </Button>
      </div>
    </CardContent>
    <CardFooter />
  </Card>
</template>
