<script setup lang="ts">
import {
  mdiCheckCircle,
  mdiDownload,
  mdiInformationSlabCircle,
  mdiLockOpen,
  mdiNumeric1Circle,
  mdiNumeric2Circle,
  mdiNumeric3Circle,
  mdiRefresh
} from '@mdi/js';
import type { htm_operation } from '@mtyszczak-cargo/htm';
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { toast } from 'vue-sonner';

import HTMLoginContent from '@/components/htm/HTMLoginContent.vue';
import HTMProvidePasswordContent from '@/components/htm/HTMProvidePasswordContent.vue';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import AddToGoogleWallet from '@/components/wallet/AddToGoogleWallet.vue';
import { useSettingsStore } from '@/stores/settings.store';
import { useTokensStore } from '@/stores/tokens.store';
import { useWalletStore } from '@/stores/wallet.store';
import { getWax } from '@/stores/wax.store';
import { toastError } from '@/utils/parse-error';
import { waitForTransactionStatus } from '@/utils/transaction-status';
import CTokensProvider from '@/utils/wallet/ctokens/signer';


const walletStore = useWalletStore();
const tokensStore = useTokensStore();
const settingsStore = useSettingsStore();

const router = useRouter();

const showLoginSuccess = ref(false);
const showRegistrationForm = ref(false);
const showLoginForm = ref(false);
const showLoginUsingPassword = ref(false);
const showLoginUsingOtherAccount = ref(false);
const isLoading = ref(false);
const hasConfirmedDownload = ref(false);
const keysGenerated = ref(false);

// Registration form data - simplified to match standard account creation flow
const registrationData = ref({
  name: '',                 // Account display name
  about: '',                // Description/bio (optional)
  website: '',              // Website URL (optional)
  profile_image: '',        // Profile image URL (optional)
  walletPassword: '',       // Password to encrypt the wallet
  repeatPassword: ''        // Password confirmation
});

// Generated HTM keys (auto-generated, not manually entered)
const generatedKeys = ref({
  operationalPrivateKey: '',
  operationalPublicKey: '',
  managementPrivateKey: '',
  managementPublicKey: ''
});

// Step tracking for improved UX (similar to Hive account creation)
const currentStep = computed(() => {
  if (!isBasicInfoValid.value) return 1;
  if (!keysGenerated.value) return 2;
  if (!hasConfirmedDownload.value) return 3;
  return 3;
});

const stepStatus = computed(() => ({
  step1: {
    completed: isBasicInfoValid.value,
    current: currentStep.value === 1,
    icon: mdiNumeric1Circle,
    title: 'Account Info',
    description: 'Basic information'
  },
  step2: {
    completed: keysGenerated.value,
    current: currentStep.value === 2,
    icon: mdiNumeric2Circle,
    title: 'Generate Keys',
    description: 'Auto-create HTM keys'
  },
  step3: {
    completed: hasConfirmedDownload.value,
    current: currentStep.value === 3,
    icon: mdiNumeric3Circle,
    title: 'Confirm & Register',
    description: 'Save keys & register'
  }
}));

// Form validation - only basic info needed in step 1
const isBasicInfoValid = computed(() => {
  return registrationData.value.name.trim().length > 0 &&
         registrationData.value.walletPassword.trim().length > 0 &&
         registrationData.value.repeatPassword.trim().length > 0 &&
         registrationData.value.walletPassword === registrationData.value.repeatPassword;
});

// Validate URL format
const isValidUrl = (url: string): boolean => {
  if (!url) return true; // Empty URL is valid (optional field)
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

// Generate HTM keys automatically (called during registration)
const generateAndDownloadKeys = async () => {
  if (!isBasicInfoValid.value) {
    toast.error('Please fill in all required fields');
    return;
  }

  try {
    isLoading.value = true;

    const wax = await getWax();

    // Derive public key for operational key
    // Generate management key (optional, but recommended)
    const managementBrainKey = wax.suggestBrainKey();

    // Generate operational key
    const operationalBrainKey = wax.suggestBrainKey();

    generatedKeys.value = {
      operationalPrivateKey: operationalBrainKey.wifPrivateKey,
      operationalPublicKey: operationalBrainKey.associatedPublicKey,
      managementPrivateKey: managementBrainKey.wifPrivateKey,
      managementPublicKey: managementBrainKey.associatedPublicKey
    };

    keysGenerated.value = true;

    // Auto-download the keys file
    downloadKeysFile();

    toast.success('HTM keys generated successfully!', {
      description: 'Keys have been auto-generated and downloaded'
    });
  } catch (error) {
    toastError('Failed to generate HTM keys', error);
  } finally {
    isLoading.value = false;
  }
};

// Download HTM keys file (similar to Hive authority data file)
const downloadKeysFile = () => {
  const cleanAccountName = generatedKeys.value.operationalPublicKey;

  const keysFile = {
    account_name: cleanAccountName,
    display_name: registrationData.value.name,
    generated_at: new Date().toISOString(),
    htm_keys: {
      operational: {
        public_key: generatedKeys.value.operationalPublicKey,
        private_key: generatedKeys.value.operationalPrivateKey
      },
      management: {
        public_key: generatedKeys.value.managementPublicKey,
        private_key: generatedKeys.value.managementPrivateKey
      }
    },
    _note: 'KEEP THIS FILE SAFE! These keys control your HTM account. Store them in a secure location and never share them with anyone.',
    generator: 'Hive Bridge HTM Registration'
  };

  const dataStr = JSON.stringify(keysFile, null, 2);
  const dataBlob = new Blob([dataStr], { type: 'application/json' });
  const url = URL.createObjectURL(dataBlob);

  const link = document.createElement('a');
  link.href = url;
  link.download = `htm-keys-${keysFile.display_name}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  URL.revokeObjectURL(url);
};

// Reset process
const resetProcess = () => {
  keysGenerated.value = false;
  hasConfirmedDownload.value = false;
  generatedKeys.value = {
    operationalPrivateKey: '',
    operationalPublicKey: '',
    managementPrivateKey: '',
    managementPublicKey: ''
  };
};

// Go back to main options
const goBack = () => {
  showLoginSuccess.value = false;
  showRegistrationForm.value = false;
  showLoginForm.value = false;
  showLoginUsingPassword.value = false;
  showLoginUsingOtherAccount.value = false;
  // Reset form data
  registrationData.value = {
    name: '',
    about: '',
    website: '',
    profile_image: '',
    walletPassword: '',
    repeatPassword: ''
  };
  resetProcess();
};

// Show HTM login success
const showHTMLogin = () => {
  showLoginForm.value = true;
};

// Handle successful login
const goToMyAccount = () => {
  goBack();
  // Redirect to my balance page after successful login
  router.push('/tokens/my-balance');
};

const successShow = () => {
  goBack();
  showLoginSuccess.value = true;
};

// @internal
const registerHTMAccount = async () => {
  try {
    isLoading.value = true;

    // Validate that keys have been generated
    if (!keysGenerated.value)
      throw new Error('Please generate HTM keys first');

    // Validate that user confirmed download
    if (!hasConfirmedDownload.value)
      throw new Error('Please confirm you have saved the keys file');


    // Validate passwords match
    if (registrationData.value.walletPassword !== registrationData.value.repeatPassword)
      throw new Error('Passwords do not match');


    // Validate website URL if provided
    if (registrationData.value.website && !isValidUrl(registrationData.value.website))
      throw new Error('Please enter a valid website URL');


    // Validate profile image URL if provided
    if (registrationData.value.profile_image && !isValidUrl(registrationData.value.profile_image))
      throw new Error('Please enter a valid profile image URL');

    // Get wax instance
    const wax = await getWax();

    // Create temporary beekeeper wallet to import keys and sign transactions

    // Create HTM wallet for persistent storage
    const keys = await CTokensProvider.createWallet(
      registrationData.value.walletPassword,
      generatedKeys.value.operationalPrivateKey,
      generatedKeys.value.managementPrivateKey
    );

    await CTokensProvider.login(
      registrationData.value.walletPassword
    );

    const explicitWallet = await CTokensProvider.for(wax, 'owner', false);

    // Wait for transaction status
    await waitForTransactionStatus(
      () => ([{
        user_signup_operation: {
          hive_account: walletStore.isL2Wallet ? undefined : settingsStore.settings.account,
          management_key: keys.management!,
          operational_key: keys.operational
        }
      } satisfies htm_operation, {
        user_metadata_update_operation: {
          user: keys.operational,
          metadata: {
            items: [
              { key: 'name', value: registrationData.value.name.trim() },
              ...(registrationData.value.about.trim() ? [{ key: 'about', value: registrationData.value.about.trim() }] : []),
              ...(registrationData.value.website.trim() ? [{ key: 'website', value: registrationData.value.website.trim() }] : []),
              ...(registrationData.value.profile_image.trim() ? [{ key: 'profile_image', value: registrationData.value.profile_image.trim() }] : [])
            ]
          }
        }
      } satisfies htm_operation]),
      'HTM account registration',
      true,
      explicitWallet
    );

    tokensStore.reset(await CTokensProvider.for(wax, 'posting', false));

    // After successful registration, redirect to login
    successShow();
  } catch (error) {
    toastError('Failed to create HTM account', error);
  } finally {
    isLoading.value = false;
  }
};

const canLogIntoL2 = computed(() => {
  return !!CTokensProvider.getOperationalPublicKey();
});

const isLoggedIntoL2 = computed(() => {
  return !!tokensStore.wallet;
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
    <Card
      v-if="showLoginForm && canLogIntoL2 && !showLoginUsingPassword && !showLoginUsingOtherAccount"
      class="w-full"
    >
      <CardContent class="pt-6">
        <div class="flex flex-col items-center text-center space-y-6">
          <!-- Info Icon -->
          <div class="w-16 h-16 bg-blue-100 dark:bg-blue-900/20 rounded-full flex items-center justify-center">
            <svg
              width="32"
              height="32"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              class="text-blue-600 dark:text-blue-400"
            >
              <path
                style="fill: currentColor"
                :d="mdiInformationSlabCircle"
              />
            </svg>
          </div>

          <div class="space-y-2">
            <h2 class="text-2xl font-semibold text-blue-600 dark:text-blue-400">
              Detected existing HTM Wallet
            </h2>
            <p class="text-muted-foreground">
              You already have an HTM account.
              You can log in using your wallet password or choose to log in to a different account.
            </p>
          </div>

          <div v-if="!isLoggedIntoL2" class="flex flex-col w-full space-y-6">
            <Button
              size="lg"
              class="mt-4 w-full"
              @click="showLoginUsingPassword = true"
            >
              Provide your password
            </Button>

            <div class="relative w-full">
              <div class="absolute inset-0 flex items-center">
                <span class="w-full border-t" />
              </div>
              <div class="relative flex justify-center text-xs uppercase">
                <span class="bg-background px-2 text-muted-foreground">
                  Or
                </span>
              </div>
            </div>
          </div>

          <!-- Action Button -->
          <div class="flex flex-row gap-4 w-full">
            <Button
              variant="outline"
              size="lg"
              class="mt-4 flex-1"
              @click="goBack()"
            >
              Go Back
            </Button>
            <Button
              size="lg"
              class="mt-4 flex-1"
              @click="showLoginUsingOtherAccount = true"
            >
              Log in to other account
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>

    <Card
      v-else-if="showLoginUsingPassword"
      class="w-full"
    >
      <CardContent class="pt-6">
        <div class="flex flex-col items-center text-center space-y-6">
          <!-- Info Icon -->
          <div class="w-16 h-16 bg-blue-100 dark:bg-blue-900/20 rounded-full flex items-center justify-center">
            <svg
              width="32"
              height="32"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              class="text-blue-600 dark:text-blue-400"
            >
              <path
                style="fill: currentColor"
                :d="mdiLockOpen"
              />
            </svg>
          </div>

          <div class="space-y-2">
            <h2 class="text-2xl font-semibold text-blue-600 dark:text-blue-400">
              Unlock your wallet
            </h2>
            <p class="text-muted-foreground">
              You already have an HTM account.
              Please login using your wallet password to access your tokens and manage your account.
            </p>
          </div>

          <HTMProvidePasswordContent embed @success="successShow()" />

          <!-- Action Button -->
          <div class="flex flex-row gap-4 w-full">
            <Button
              variant="outline"
              size="lg"
              class="mt-4 flex-1"
              @click="goBack()"
            >
              Go Back
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>

    <Card
      v-else-if="showLoginForm || showLoginUsingOtherAccount"
      class="w-full"
    >
      <CardContent class="pt-6">
        <div class="flex flex-col items-center space-y-6">
          <!-- Info Icon -->
          <div class="w-16 h-16 bg-blue-100 dark:bg-blue-900/20 rounded-full flex items-center justify-center">
            <svg
              width="32"
              height="32"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              class="text-blue-600 dark:text-blue-400"
            >
              <path
                style="fill: currentColor"
                :d="mdiLockOpen"
              />
            </svg>
          </div>

          <div class="space-y-2 text-center">
            <h2 class="text-2xl font-semibold text-blue-600 dark:text-blue-400">
              Log in to your HTM account
            </h2>
            <p class="text-muted-foreground">
              You already have an HTM account.
              Provide your credentials to import them to the underlying wallet and access your tokens and manage your account.
            </p>
          </div>

          <HTMLoginContent :show-steps="false" @setaccount="successShow()" />

          <!-- Action Button -->
          <div class="flex flex-row gap-4 w-full">
            <Button
              variant="outline"
              size="lg"
              class="mt-4 flex-1"
              @click="goBack()"
            >
              Go Back
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>

    <!-- Show HTM Login Success -->
    <Card
      v-else-if="showLoginSuccess"
      class="w-full"
    >
      <CardContent class="pt-6">
        <div class="flex flex-col items-center text-center space-y-6">
          <!-- Success Icon -->
          <div class="w-16 h-16 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center">
            <svg
              width="32"
              height="32"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              class="text-green-600 dark:text-green-400"
            >
              <path
                style="fill: currentColor"
                :d="mdiCheckCircle"
              />
            </svg>
          </div>

          <div class="space-y-2">
            <h2 class="text-2xl font-semibold text-green-600 dark:text-green-400">
              Welcome to HTM!
            </h2>
            <p class="text-muted-foreground">
              You are now successfully logged in to your HTM account. You can manage your tokens, create new ones, and explore all the features available.
            </p>
          </div>

          <!-- Action Button -->
          <div class="flex flex-col gap-4 w-full">
            <Button
              size="lg"
              class="mt-4"
              @click="goToMyAccount"
            >
              Go to My Account
            </Button>
            <AddToGoogleWallet class="mt-2" />
          </div>
        </div>
      </CardContent>
    </Card>

    <!-- Show HTM Registration Form -->
    <Card
      v-else-if="showRegistrationForm"
      class="w-full"
    >
      <CardHeader>
        <CardTitle class="text-2xl">
          Register New HTM Account
        </CardTitle>
        <CardDescription>
          Create your HTM account with auto-generated secure keys. Follow the simple steps below.
        </CardDescription>
      </CardHeader>
      <CardContent class="space-y-6">
        <!-- Progress Steps Indicator -->
        <div class="grid grid-cols-3 gap-2 mb-6">
          <div
            v-for="(step, key) in stepStatus"
            :key="key"
            class="flex flex-col items-center text-center"
          >
            <div
              class="w-8 h-8 rounded-full flex items-center justify-center mb-2 transition-all duration-200"
              :class="{
                'bg-green-100 text-green-600': step.completed,
                'bg-blue-100 text-blue-600': step.current && !step.completed,
                'bg-gray-100 text-gray-400': !step.current && !step.completed
              }"
            >
              <svg
                v-if="step.completed"
                width="16"
                height="16"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
              >
                <path
                  style="fill: currentColor"
                  :d="mdiCheckCircle"
                />
              </svg>
              <svg
                v-else
                width="16"
                height="16"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
              >
                <path
                  style="fill: currentColor"
                  :d="step.icon"
                />
              </svg>
            </div>
            <div class="text-xs">
              <p
                class="font-medium transition-colors duration-200"
                :class="{
                  'text-green-600': step.completed,
                  'text-blue-600': step.current && !step.completed,
                  'text-gray-500': !step.current && !step.completed
                }"
              >
                {{ step.title }}
              </p>
              <p class="text-gray-400 mt-1">
                {{ step.description }}
              </p>
            </div>
          </div>
        </div>

        <Separator />

        <form
          class="space-y-4"
          @submit.prevent="registerHTMAccount"
        >
          <!-- Step 1: Basic Account Information -->
          <div class="space-y-4">
            <div class="flex items-center justify-between">
              <div class="flex items-center space-x-2">
                <svg
                  width="18"
                  height="18"
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                >
                  <path
                    style="fill: hsl(var(--primary))"
                    :d="mdiNumeric1Circle"
                  />
                </svg>
                <Label class="text-base font-semibold">Account Information</Label>
              </div>
            </div>

            <!-- Display Name (required) -->
            <div class="space-y-2">
              <Label for="account-name">
                Display Name *
              </Label>
              <Input
                id="account-name"
                v-model="registrationData.name"
                type="text"
                placeholder="Enter your display name"
                required
                maxlength="50"
              />
              <p class="text-xs text-muted-foreground">
                Your public display name (max 50 characters)
              </p>
            </div>

            <!-- About/Description (optional) -->
            <div class="space-y-2">
              <Label for="account-about">
                About (Optional)
              </Label>
              <Textarea
                id="account-about"
                v-model="registrationData.about"
                placeholder="Tell us about yourself or your project..."
                rows="3"
                maxlength="500"
              />
            </div>

            <!-- Website (optional) -->
            <div class="space-y-2">
              <Label for="account-website">
                Website (Optional)
              </Label>
              <Input
                id="account-website"
                v-model="registrationData.website"
                type="url"
                placeholder="https://your-website.com"
              />
            </div>

            <!-- Profile Image (optional) -->
            <div class="space-y-2">
              <Label for="account-profile-image">
                Profile Image URL (Optional)
              </Label>
              <Input
                id="account-profile-image"
                v-model="registrationData.profile_image"
                type="url"
                placeholder="https://example.com/your-image.jpg"
              />
            </div>
          </div>

          <Separator />

          <!-- Wallet Password (required) -->
          <div class="space-y-2">
            <Label for="wallet-password">
              Wallet Password *
            </Label>
            <Input
              id="wallet-password"
              v-model="registrationData.walletPassword"
              type="password"
              placeholder="Enter a secure password"
              required
            />
            <p class="text-xs text-muted-foreground">
              Create a password to encrypt and secure your HTM wallet locally
            </p>
          </div>

          <!-- Repeat Password (required) -->
          <div class="space-y-2">
            <Label for="repeat-password">
              Repeat Password *
            </Label>
            <Input
              id="repeat-password"
              v-model="registrationData.repeatPassword"
              type="password"
              placeholder="Repeat your password"
              required
            />
          </div>

          <div v-if="registrationData.walletPassword && registrationData.repeatPassword && registrationData.walletPassword !== registrationData.repeatPassword">
            <p class="text-sm text-red-500">
              Passwords do not match
            </p>
          </div>

          <Separator />

          <!-- Step 2: Generate HTM Keys -->
          <div class="space-y-4">
            <div class="flex items-center justify-between">
              <div class="flex items-center space-x-2">
                <svg
                  width="18"
                  height="18"
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                >
                  <path
                    style="fill: hsl(var(--primary))"
                    :d="mdiNumeric2Circle"
                  />
                </svg>
                <Label class="text-base font-semibold">HTM Keys Generation</Label>
              </div>
              <Button
                v-if="keysGenerated"
                variant="ghost"
                size="sm"
                class="text-gray-400"
                type="button"
                @click="resetProcess"
              >
                <svg
                  width="14"
                  height="14"
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  class="mr-1"
                >
                  <path
                    style="fill: currentColor"
                    :d="mdiRefresh"
                  />
                </svg>
                Reset
              </Button>
            </div>

            <div class="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-900 rounded-lg p-4">
              <p class="text-sm text-blue-800 dark:text-blue-200">
                HTM keys will be <strong>automatically generated</strong> for you. No need to manually enter keys. Simply click the button below to generate and download your secure keys.
              </p>
            </div>

            <Button
              type="button"
              :disabled="!isBasicInfoValid || isLoading"
              class="w-full"
              @click="keysGenerated ? downloadKeysFile() : generateAndDownloadKeys()"
            >
              <svg
                v-if="!isLoading"
                width="16"
                height="16"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                class="mr-2"
              >
                <path
                  style="fill: currentColor"
                  :d="keysGenerated ? mdiDownload : mdiNumeric2Circle"
                />
              </svg>
              <span v-if="isLoading">Generating...</span>
              <span v-else-if="keysGenerated">Download Keys File Again</span>
              <span v-else>Generate & Download HTM Keys</span>
            </Button>

            <!-- Show generated public keys (read-only) -->
            <div
              v-if="keysGenerated"
              class="space-y-3 mt-4 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg"
            >
              <h4 class="text-sm font-semibold">
                Generated Public Keys (Read-Only)
              </h4>
              <div class="space-y-2">
                <div>
                  <Label class="text-xs text-muted-foreground">Operational Public Key</Label>
                  <Input
                    :default-value="generatedKeys.operationalPublicKey"
                    readonly
                    class="font-mono text-xs bg-white dark:bg-gray-800"
                  />
                </div>
                <div>
                  <Label class="text-xs text-muted-foreground">Management Public Key</Label>
                  <Input
                    :default-value="generatedKeys.managementPublicKey"
                    readonly
                    class="font-mono text-xs bg-white dark:bg-gray-800"
                  />
                </div>
              </div>
            </div>
          </div>

          <Separator />

          <!-- Step 3: Confirm Download and Register -->
          <div
            v-if="keysGenerated"
            class="space-y-4"
          >
            <div class="flex items-center space-x-2">
              <svg
                width="18"
                height="18"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
              >
                <path
                  style="fill: hsl(var(--primary))"
                  :d="mdiNumeric3Circle"
                />
              </svg>
              <Label class="text-base font-semibold">Confirm & Register</Label>
            </div>

            <div class="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-900 rounded-lg p-4">
              <div class="flex items-center space-x-2">
                <input
                  id="confirm-download"
                  v-model="hasConfirmedDownload"
                  type="checkbox"
                  class="w-4 h-4"
                >
                <label
                  for="confirm-download"
                  class="text-sm text-yellow-800 dark:text-yellow-200 cursor-pointer"
                >
                  I confirm that I have <strong>downloaded and safely stored</strong> my HTM keys file
                </label>
              </div>
            </div>
          </div>

          <!-- Form Actions -->
          <div class="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              class="flex-1"
              @click="goBack"
            >
              Back
            </Button>
            <Button
              type="submit"
              :disabled="isLoading || !keysGenerated || !hasConfirmedDownload"
              class="flex-1"
            >
              <span v-if="isLoading">Registering...</span>
              <span v-else>Register HTM Account</span>
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>

    <!-- Show main registration options -->
    <Card v-else>
      <CardHeader class="text-center">
        <CardTitle class="text-2xl">
          Register HTM Account
        </CardTitle>
        <CardDescription>
          Create an account on the Hive Token Machine to manage your custom tokens
        </CardDescription>
      </CardHeader>
      <CardContent class="space-y-6">
        <div class="text-center space-y-4">
          <p class="text-sm text-muted-foreground">
            HTM accounts allow you to create, manage, and transfer custom tokens on the Hive blockchain.
            You can create a new HTM account or login to an existing one.
          </p>

          <!-- Registration options -->
          <div class="space-y-3">
            <Button
              size="lg"
              class="w-full"
              @click="showRegistrationForm = true"
            >
              Register New HTM Account
            </Button>

            <div class="relative">
              <div class="absolute inset-0 flex items-center">
                <span class="w-full border-t" />
              </div>
              <div class="relative flex justify-center text-xs uppercase">
                <span class="bg-background px-2 text-muted-foreground">
                  Or
                </span>
              </div>
            </div>

            <Button
              variant="outline"
              size="lg"
              class="w-full"
              @click="showHTMLogin"
            >
              Login to Existing HTM Account
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  </div>
</template>
