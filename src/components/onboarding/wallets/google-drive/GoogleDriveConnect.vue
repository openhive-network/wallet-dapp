<script setup lang="ts">
import type { TRole } from '@hiveio/wax';
import { mdiClose, mdiEye, mdiEyeOff } from '@mdi/js';
import { AlertTriangle, Plus } from 'lucide-vue-next';
import { ref, onMounted, computed } from 'vue';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import Input from '@/components/ui/input/Input.vue';
import Label from '@/components/ui/label/Label.vue';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { UsedWallet, getWalletIcon, useSettingsStore } from '@/stores/settings.store';
import { GoogleDriveWalletProvider as GoogleDriveProvider } from '@/utils/wallet/google-drive/provider';

interface Props {
  accountName?: string;
}

const props = defineProps<Props>();
const settingsStore = useSettingsStore();

type GoogleDriveWalletStatus = {
  exists: boolean;
  accountName?: string;
  role?: string;
};

type GoogleUser = {
  name?: string;
  email?: string;
  picture?: string;
};

type FormState = {
  accountName: string;
  keys: Array<{ role: TRole; privateKey: string }>;
};

const availableRoles: TRole[] = ['posting', 'active', 'owner', 'memo'];

const roleDescriptions: Record<TRole, string> = {
  posting: 'Social actions (posts, comments, votes)',
  active: 'Financial operations (transfers, market)',
  owner: 'Master key - use with extreme caution',
  memo: 'Encrypt/decrypt private messages'
};

const emit = defineEmits(['setaccount', 'close']);

const isLoading = ref(true);
const isProcessing = ref(false);
const error = ref<string | null>(null);
const walletStatus = ref<GoogleDriveWalletStatus>({
  exists: false
});
const googleUser = ref<GoogleUser | null>(null);

// Recovery password input state
const recoveryPassword = ref<string>('');
const confirmRecoveryPassword = ref<string>('');
const showRecoveryPassword = ref(false);

const recoveryPasswordInputType = computed(() => showRecoveryPassword.value ? 'text' : 'password');

const form = ref<FormState>({
  accountName: props.accountName || sessionStorage.getItem('google_drive_account_name') || '',
  keys: [{ role: 'posting', privateKey: '' }]
});

// Track visibility state for each private key input
const keyVisibility = ref<Record<number, boolean>>({});

const passwordsMatch = computed(() => {
  return recoveryPassword.value === confirmRecoveryPassword.value;
});

const isPasswordValid = computed(() => {
  return recoveryPassword.value.length >= 8 && passwordsMatch.value;
});

const hasAtLeastOneKey = computed(() =>
  form.value.keys.some(k => k.privateKey.trim())
);

const usedRoles = computed(() =>
  form.value.keys.map(k => k.role)
);

const availableRolesToAdd = computed(() =>
  availableRoles.filter(role => !usedRoles.value.includes(role))
);

const addKeyField = () => {
  if (availableRolesToAdd.value.length > 0) {
    const nextRole = availableRolesToAdd.value[0];
    if (nextRole) {
      form.value.keys.push({
        role: nextRole,
        privateKey: ''
      });
    }
  }
};

const removeKeyField = (index: number) => {
  if (form.value.keys.length > 1)
    form.value.keys.splice(index, 1);
};

const toggleKeyVisibility = (index: number) => {
  keyVisibility.value[index] = !keyVisibility.value[index];
};

const step = ref<'check' | 'connect' | 'create' | 'success'>('check');

const close = () => {
  emit('close');
};

const openGoogleLogin = () => {
  // Redirect to Google OAuth login endpoint with current path
  const currentPath = window.location.pathname;
  window.location.href = GoogleDriveProvider.getLoginUrl(currentPath);
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
    } catch (_e) {}

    // Get saved account name from multiple sources
    const savedAccountName = settingsStore.settings.account ||
                           props.accountName ||
                           sessionStorage.getItem('google_drive_account_name') ||
                           undefined;

    // If no saved account name, go directly to create step
    // The user will enter it in the form
    if (!savedAccountName) {
      walletStatus.value = { exists: false };
      step.value = 'create';
      return;
    }

    // User is authenticated with Google - now fetch wallet info
    const info = await GoogleDriveProvider.getWalletInfo(savedAccountName, 'posting');

    if (info.exists && info.accountName && info.role) {
      walletStatus.value = {
        exists: true,
        accountName: info.accountName,
        role: info.role
      };

      // Auto-load wallet - it should be automatically unlocked since it's stored in Google Drive
      try {
        const result = await GoogleDriveProvider.loadWallet(savedAccountName, info.role);

        // Save account name and emit event
        emit('setaccount', result.accountName);
        step.value = 'success';
      } catch (autoLoadErr) {
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
    const errorObj = err as { code?: string; message?: string; statusCode?: number; statusMessage?: string; data?: { statusMessage?: string } };
    if (
      errorObj.code === 'GOOGLE_AUTH_EXPIRED' ||
      errorObj.statusCode === 401 ||
      errorObj.statusMessage === 'GOOGLE_AUTH_EXPIRED' ||
      errorObj.data?.statusMessage === 'GOOGLE_AUTH_EXPIRED' ||
      errorObj.message?.includes('invalid_grant')
    ) {
      // Clear error message and show connect step with info message
      error.value = null;
      googleUser.value = null;
      step.value = 'connect';
    } else {
      error.value = `Error checking wallet: ${err instanceof Error ? err.message : String(err)}`;
      step.value = 'check';
    }
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

    sessionStorage.setItem('google_drive_account_name', form.value.accountName);

    const keysToAdd = form.value.keys.filter(k => k.privateKey.trim());
    if (keysToAdd.length === 0)
      throw new Error('At least one private key is required');

    if (!recoveryPassword.value)
      throw new Error('Recovery password is required');

    if (recoveryPassword.value.length < 8)
      throw new Error('Recovery password must be at least 8 characters');

    if (!passwordsMatch.value)
      throw new Error('Recovery passwords do not match');

    const accountName = form.value.accountName;

    // Create wallet with first key
    const firstKey = keysToAdd[0];
    if (!firstKey)
      throw new Error('At least one private key is required');

    await GoogleDriveProvider.createWallet(
      accountName,
      firstKey.privateKey.trim(),
      firstKey.role,
      recoveryPassword.value
    );

    // Add remaining keys if any
    for (let i = 1; i < keysToAdd.length; i++) {
      const keyData = keysToAdd[i];
      if (!keyData) continue;

      await GoogleDriveProvider.addKey(
        accountName,
        keyData.role,
        keyData.privateKey.trim()
      );
    }

    sessionStorage.removeItem('google_drive_account_name');

    // Clear form
    form.value = {
      accountName: '',
      keys: [{ role: 'posting', privateKey: '' }]
    };
    recoveryPassword.value = '';
    confirmRecoveryPassword.value = '';

    emit('setaccount', accountName);
    step.value = 'success';
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);

    if (errorMessage.includes('ENCRYPTED_WALLET_EXISTS'))
      error.value = 'An encrypted wallet already exists on your Google Drive. Please delete it first using the button below, then try creating a new wallet.';
    else if (errorMessage.includes('GOOGLE_AUTH_EXPIRED') || (err as { code?: string }).code === 'GOOGLE_AUTH_EXPIRED') {
      error.value = 'Your Google authentication has expired. Please log in again.';
      step.value = 'connect';
    } else
      error.value = `Error creating wallet: ${errorMessage}`;

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
  <Card class="w-full max-w-[480px]">
    <!-- Header -->
    <CardHeader class="pb-3">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2">
          <img
            :src="getWalletIcon(UsedWallet.GOOGLE_DRIVE)"
            class="w-6 h-6"
            alt="Google Drive"
          >
          <CardTitle class="text-lg">Google Drive Wallet</CardTitle>
        </div>
        <Button
          variant="ghost"
          size="icon"
          class="h-8 w-8 -mr-2"
          @click="close"
        >
          <svg
            width="20"
            height="20"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
          ><path
            style="fill: hsl(var(--foreground))"
            :d="mdiClose"
          /></svg>
        </Button>
      </div>
      <CardDescription v-if="step === 'check'" class="pt-1">
        Checking wallet availability...
      </CardDescription>
      <CardDescription v-else-if="step === 'connect'" class="pt-1">
        Connect your Google account to continue
      </CardDescription>
      <CardDescription v-else-if="step === 'create'" class="pt-1">
        Set up a new wallet backed by Google Drive
      </CardDescription>
      <CardDescription v-else-if="step === 'success'" class="pt-1">
        Your wallet is ready to use
      </CardDescription>
    </CardHeader>

    <!-- Content -->
    <CardContent class="space-y-5">
      <!-- Error display (global) -->
      <Alert v-if="error && !isLoading" variant="destructive">
        <AlertTriangle class="h-4 w-4" />
        <AlertDescription>{{ error }}</AlertDescription>
      </Alert>

      <!-- Loading state -->
      <div v-if="isLoading" class="flex items-center justify-center py-12">
        <div class="flex flex-col items-center gap-3">
          <div class="animate-spin rounded-full h-10 w-10 border-2 border-primary border-t-transparent" />
          <span class="text-sm text-muted-foreground">Loading wallet...</span>
        </div>
      </div>

      <!-- Connect Google account (if not authenticated) -->
      <div v-else-if="step === 'connect'" class="space-y-4">
        <Alert class="border-blue-200 bg-blue-50 dark:bg-blue-950/20">
          <AlertDescription class="text-blue-900 dark:text-blue-100">
            Please connect your Google account to access your wallet. Your session may have expired or been revoked.
          </AlertDescription>
        </Alert>

        <div class="flex flex-col gap-3 pt-2">
          <Button
            :disabled="isProcessing"
            size="lg"
            class="w-full"
            @click="openGoogleLogin"
          >
            <svg class="w-5 h-5 mr-2" viewBox="0 0 24 24">
              <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            Connect with Google
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
      <div v-else-if="step === 'create'" class="space-y-5">
        <!-- Google User Info -->
        <div v-if="googleUser" class="p-4 bg-muted/50 rounded-lg border">
          <div class="flex items-start justify-between gap-3">
            <div class="flex items-center gap-3 flex-1 min-w-0">
              <div class="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <svg class="w-5 h-5 text-primary" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clip-rule="evenodd" />
                </svg>
              </div>
              <div class="flex-1 min-w-0">
                <div class="font-medium text-sm truncate">{{ googleUser.name }}</div>
                <div class="text-xs text-muted-foreground truncate">{{ googleUser.email }}</div>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              class="text-xs hover:text-destructive flex-shrink-0"
              :disabled="isProcessing"
              @click="logoutFromGoogle"
            >
              Logout
            </Button>
          </div>
        </div>

        <!-- Step 1: Account Name -->
        <div class="space-y-3">
          <div class="flex items-center gap-2">
            <div class="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-medium">
              1
            </div>
            <Label class="text-base font-semibold">Hive Account Name</Label>
          </div>
          <Input
            v-model="form.accountName"
            type="text"
            placeholder="e.g., johndoe"
            class="h-10"
            :disabled="isProcessing"
          />
          <p class="text-xs text-muted-foreground">
            Enter your existing Hive account name
          </p>
        </div>

        <!-- Step 2: Private Keys -->
        <div class="space-y-3">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              <div class="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-medium">
                2
              </div>
              <Label class="text-base font-semibold">Private Keys</Label>
            </div>
            <Button
              v-if="availableRolesToAdd.length > 0"
              variant="outline"
              size="sm"
              :disabled="isProcessing"
              @click="addKeyField"
            >
              <Plus class="w-3.5 h-3.5 mr-1" />
              Add Key
            </Button>
          </div>

          <p class="text-xs text-muted-foreground -mt-1">
            Add at least one private key (posting key recommended for basic use)
          </p>

          <div class="space-y-3">
            <div
              v-for="(keyData, index) in form.keys"
              :key="index"
              class="p-3 border rounded-lg bg-card space-y-3"
            >
              <div class="flex items-center gap-2">
                <Select v-model="keyData.role" :disabled="isProcessing">
                  <SelectTrigger class="flex-1 h-9">
                    <SelectValue placeholder="Select key role">
                      <span class="capitalize">{{ keyData.role }}</span>
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem
                      v-for="role in availableRoles"
                      :key="role"
                      :value="role"
                      :disabled="usedRoles.includes(role) && keyData.role !== role"
                    >
                      <div class="flex flex-col items-start gap-0.5">
                        <span class="capitalize font-medium">{{ role }}</span>
                        <span class="text-xs text-muted-foreground">{{ roleDescriptions[role] }}</span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>

                <Button
                  v-if="form.keys.length > 1"
                  variant="ghost"
                  size="icon"
                  class="h-9 w-9 text-muted-foreground hover:text-destructive flex-shrink-0"
                  :disabled="isProcessing"
                  @click="removeKeyField(index)"
                >
                  <svg
                    width="16"
                    height="16"
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                  >
                    <path
                      fill="currentColor"
                      :d="mdiClose"
                    />
                  </svg>
                </Button>
              </div>

              <div class="relative">
                <Input
                  v-model="keyData.privateKey"
                  :type="keyVisibility[index] ? 'text' : 'password'"
                  :placeholder="`Enter ${keyData.role} private key`"
                  class="h-9 font-mono text-xs pr-10"
                  :disabled="isProcessing"
                />
                <Button
                  variant="ghost"
                  size="icon"
                  class="absolute right-0 top-0 h-9 w-9"
                  type="button"
                  tabindex="-1"
                  @click="toggleKeyVisibility(index)"
                >
                  <svg
                    width="16"
                    height="16"
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                  >
                    <path
                      fill="currentColor"
                      :d="keyVisibility[index] ? mdiEyeOff : mdiEye"
                    />
                  </svg>
                </Button>
              </div>
            </div>
          </div>
        </div>

        <!-- Step 3: Recovery Password -->
        <div class="space-y-3">
          <div class="flex items-center gap-2">
            <div class="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-medium">
              3
            </div>
            <Label class="text-base font-semibold">Recovery Password</Label>
          </div>

          <Alert variant="destructive">
            <AlertDescription>
              This password encrypts your wallet. <strong>There is no recovery option</strong> if you forget it. Store it safely!
            </AlertDescription>
          </Alert>

          <div class="space-y-3">
            <div class="relative">
              <Input
                v-model="recoveryPassword"
                :type="recoveryPasswordInputType"
                placeholder="Enter password (min 8 characters)"
                class="h-10 pr-10"
                :disabled="isProcessing"
              />
              <Button
                variant="ghost"
                size="icon"
                class="absolute right-0 top-0 h-10 w-10"
                type="button"
                tabindex="-1"
                @click="showRecoveryPassword = !showRecoveryPassword"
              >
                <svg
                  width="18"
                  height="18"
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                >
                  <path
                    fill="currentColor"
                    :d="showRecoveryPassword ? mdiEyeOff : mdiEye"
                  />
                </svg>
              </Button>
            </div>

            <Input
              v-model="confirmRecoveryPassword"
              :type="recoveryPasswordInputType"
              placeholder="Confirm password"
              class="h-10"
              :disabled="isProcessing"
            />

            <!-- Password validation feedback -->
            <div v-if="recoveryPassword || confirmRecoveryPassword" class="space-y-1">
              <div
                v-if="recoveryPassword.length > 0 && recoveryPassword.length < 8"
                class="flex items-center gap-2 text-xs text-amber-600"
              >
                <svg class="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
                </svg>
                Password must be at least 8 characters
              </div>
              <div
                v-if="recoveryPassword.length >= 8 && confirmRecoveryPassword && !passwordsMatch"
                class="flex items-center gap-2 text-xs text-red-600"
              >
                <svg class="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
                </svg>
                Passwords do not match
              </div>
              <div
                v-if="isPasswordValid"
                class="flex items-center gap-2 text-xs text-green-600"
              >
                <svg class="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
                </svg>
                Password is valid
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Success state -->
      <div v-else-if="step === 'success'" class="py-8">
        <div class="flex flex-col items-center gap-4 text-center">
          <div class="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/20 flex items-center justify-center">
            <svg class="w-8 h-8 text-green-600 dark:text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <div>
            <h3 class="font-semibold text-lg">Wallet Ready!</h3>
            <p class="text-sm text-muted-foreground mt-1">
              Your wallet is now loaded and ready to sign transactions
            </p>
          </div>
        </div>
      </div>
    </CardContent>

    <!-- Footer with actions -->
    <CardFooter v-if="step === 'create'" class="flex gap-2 pt-2">
      <Button
        :disabled="
          isProcessing ||
          !form.accountName ||
          !hasAtLeastOneKey ||
          !isPasswordValid
        "
        size="lg"
        class="flex-1"
        @click="createWallet"
      >
        <svg
          v-if="isProcessing"
          class="w-4 h-4 mr-2 animate-spin"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
        {{ isProcessing ? 'Creating Wallet...' : 'Create Wallet' }}
      </Button>
      <Button
        variant="outline"
        size="lg"
        :disabled="isProcessing"
        @click="close"
      >
        Cancel
      </Button>
    </CardFooter>

    <CardFooter v-else-if="step === 'success'" class="pt-2">
      <Button size="lg" class="w-full" @click="close">
        Close
      </Button>
    </CardFooter>
  </Card>
</template>
