<script setup lang="ts">
import type { IBeekeeperInstance, IBeekeeperOptions } from '@hiveio/beekeeper';
import { HtmTransaction } from '@mtyszczak-cargo/htm';
import { computed, ref } from 'vue';
import { useRouter } from 'vue-router';
import { toast } from 'vue-sonner';

import HTMLoginForm from '@/components/HTMLoginForm.vue';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { getWax } from '@/stores/wax.store';
import { toastError } from '@/utils/parse-error';
import CTokensProvider from '@/utils/wallet/ctokens/signer';

const router = useRouter();

const showLoginForm = ref(false);
const showRegistrationForm = ref(false);
const isLoading = ref(false);

// Registration form data - following the same structure as userStore posting JSON metadata
const registrationData = ref({
  name: '',                 // Account display name
  about: '',                // Description/bio
  website: '',              // Website URL
  profile_image: '',        // Profile image URL (for now, will be replaced with image hoster in future)
  hiveAccount: '',          // Hive account name
  hivePostingPrivateKey: '',// Hive posting private key (WIF format) - needed to sign L1 transaction
  managementPrivateKey: '', // Management private key (WIF format)
  operationalPrivateKey: '',// Operational private key (WIF format)
  walletPassword: '',       // Password to encrypt the wallet
  repeatPassword: ''        // Password confirmation
});

// Form validation
const isFormValid = computed(() => {
  return registrationData.value.name.trim().length > 0 &&
         registrationData.value.about.trim().length > 0 &&
         registrationData.value.hiveAccount.trim().length > 0 &&
         registrationData.value.hivePostingPrivateKey.trim().length > 0 &&
         registrationData.value.operationalPrivateKey.trim().length > 0 &&
         registrationData.value.walletPassword.trim().length > 0 &&
         registrationData.value.repeatPassword.trim().length > 0 &&
         registrationData.value.walletPassword === registrationData.value.repeatPassword;
});

// Validation: Check if keys are different
const keysValidationError = computed(() => {
  const hiveKey = registrationData.value.hivePostingPrivateKey.trim();
  const operationalKey = registrationData.value.operationalPrivateKey.trim();
  const managementKey = registrationData.value.managementPrivateKey.trim();

  if (!hiveKey || !operationalKey) return null;

  if (hiveKey === operationalKey)
    return 'Hive Posting Key and HTM Operational Key must be different!';

  if (managementKey && hiveKey === managementKey)
    return 'Hive Posting Key and HTM Management Key must be different!';

  if (managementKey && operationalKey === managementKey)
    return 'HTM Operational Key and HTM Management Key must be different!';

  return null;
});

// Generate new HTM keys
const generateHTMKeys = async () => {
  try {
    const wax = await getWax();

    // Generate operational key
    const operationalBrainKey = wax.suggestBrainKey();
    registrationData.value.operationalPrivateKey = operationalBrainKey.wifPrivateKey;

    // Generate management key (optional, but recommended)
    const managementBrainKey = wax.suggestBrainKey();
    registrationData.value.managementPrivateKey = managementBrainKey.wifPrivateKey;

    toast.success('HTM keys generated successfully!', {
      description: 'New operational and management keys have been created'
    });
  } catch (error) {
    toastError('Failed to generate HTM keys', error);
  }
};

// Show HTM login form
const showHTMLogin = () => {
  showLoginForm.value = true;
};

// Go back to main options
const goBack = () => {
  showLoginForm.value = false;
  showRegistrationForm.value = false;
  // Reset form data
  registrationData.value = {
    name: '',
    about: '',
    website: '',
    profile_image: '',
    hiveAccount: '',
    hivePostingPrivateKey: '',
    managementPrivateKey: '',
    operationalPrivateKey: '',
    walletPassword: '',
    repeatPassword: ''
  };
};

// Handle successful login
const onLoginSuccess = () => {
  showLoginForm.value = false;
  // Redirect to my balance page after successful login
  router.push('/tokens/my-balance');
};

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

// Handle HTM account registration
const registerHTMAccount = async () => {
  try {
    isLoading.value = true;

    // Validate form data
    if (!isFormValid.value) {
      toast.error('Please fill in all required fields');
      return;
    }

    // Validate that keys are different
    if (keysValidationError.value) {
      toast.error(keysValidationError.value);
      return;
    }

    // Validate passwords match
    if (registrationData.value.walletPassword !== registrationData.value.repeatPassword) {
      toast.error('Passwords do not match');
      return;
    }

    // Validate website URL if provided
    if (registrationData.value.website && !isValidUrl(registrationData.value.website)) {
      toast.error('Please enter a valid website URL');
      return;
    }

    // Validate profile image URL if provided
    if (registrationData.value.profile_image && !isValidUrl(registrationData.value.profile_image)) {
      toast.error('Please enter a valid profile image URL');
      return;
    }

    // Get wax instance
    const wax = await getWax();

    // Create temporary beekeeper wallet to import keys and derive public keys
    toast.info('Creating HTM wallet...');

    const beekeeper = await (import('@hiveio/beekeeper/vite') as unknown as Promise<{ createBeekeeper: (options: Partial<IBeekeeperOptions>) => Promise<IBeekeeperInstance> }>)
      .then(bk => bk.createBeekeeper({ enableLogs: false, inMemory: true }));

    const tempSession = beekeeper.createSession(Math.random().toString());
    const tempWalletName = `registration-${Date.now()}`;

    const { wallet: tempWallet } = await tempSession.createWallet(tempWalletName, 'temp-password', true);

    const hivePostingPublicKey = await tempWallet.importKey(registrationData.value.hivePostingPrivateKey.trim());
    const operationalPublicKey = await tempWallet.importKey(registrationData.value.operationalPrivateKey.trim());

    let managementPublicKey: string | undefined;
    if (registrationData.value.managementPrivateKey.trim().length > 0)
      managementPublicKey = await tempWallet.importKey(registrationData.value.managementPrivateKey.trim());

    const finalManagementKey = managementPublicKey || operationalPublicKey;

    // Create HTM wallet for persistent storage
    await CTokensProvider.createWallet(
      registrationData.value.walletPassword,
      registrationData.value.operationalPrivateKey.trim(),
      registrationData.value.managementPrivateKey.trim() || undefined
    );

    // Set proxy account for HTM transactions
    HtmTransaction.HiveProxyAccount = registrationData.value.hiveAccount;

    // Create Layer 2 HTM transaction for user signup
    toast.info('Preparing HTM registration transaction...');
    const l2Transaction = new HtmTransaction(wax);

    l2Transaction.pushOperation({
      user_signup_operation: {
        hive_account: registrationData.value.hiveAccount,
        management_key: finalManagementKey,
        operational_key: operationalPublicKey
      }
    });

    l2Transaction.sign(tempWallet);

    // Create Layer 1 transaction and broadcast
    const l1Transaction = await wax.createTransaction();
    l1Transaction.pushOperation(l2Transaction);

    // Sign Layer 1 transaction with the Hive posting key
    toast.info('Signing transaction with Hive posting key...');
    l1Transaction.sign(tempWallet, hivePostingPublicKey);

    // Broadcast the transaction
    toast.info('Broadcasting HTM registration transaction...');
    await wax.broadcast(l1Transaction);

    // Success!
    toast.success('HTM Account registered successfully!', {
      description: `Account ${registrationData.value.hiveAccount} has been registered on the Hive Token Machine`
    });

    // After successful registration, redirect to login
    showRegistrationForm.value = false;
    showHTMLogin();

  } catch (error) {
    toastError('Failed to register HTM account', error);
  } finally {
    isLoading.value = false;
  }
};
</script>

<template>
  <div class="container mx-auto py-12 px-4 max-w-2xl">
    <!-- Show HTM Login Form -->
    <div
      v-if="showLoginForm"
      class="flex justify-center"
    >
      <HTMLoginForm
        :show-close-button="true"
        title="HTM Login"
        description="Login to your existing HTM account or create a new one"
        @success="onLoginSuccess"
        @close="goBack"
      />
    </div>

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
          Create your HTM account profile. This information will be stored as metadata following the same structure as Hive posting JSON metadata.
        </CardDescription>
      </CardHeader>
      <CardContent class="space-y-6">
        <form
          class="space-y-4"
          @submit.prevent="registerHTMAccount"
        >
          <!-- Account Name (required) -->
          <div class="space-y-2">
            <Label for="account-name">
              Account Name *
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
              This will be your display name (max 50 characters)
            </p>
          </div>

          <!-- About/Description (required) -->
          <div class="space-y-2">
            <Label for="account-about">
              About *
            </Label>
            <Textarea
              id="account-about"
              v-model="registrationData.about"
              placeholder="Tell us about yourself or your project..."
              required
              rows="4"
              maxlength="500"
            />
            <p class="text-xs text-muted-foreground">
              Brief description about you or your project (max 500 characters)
            </p>
          </div>

          <!-- Website (optional) -->
          <div class="space-y-2">
            <Label for="account-website">
              Website
            </Label>
            <Input
              id="account-website"
              v-model="registrationData.website"
              type="url"
              placeholder="https://your-website.com"
            />
            <p class="text-xs text-muted-foreground">
              Your website or project URL (optional)
            </p>
          </div>

          <!-- Profile Image (optional) -->
          <div class="space-y-2">
            <Label for="account-profile-image">
              Profile Image URL
            </Label>
            <Input
              id="account-profile-image"
              v-model="registrationData.profile_image"
              type="url"
              placeholder="https://example.com/your-image.jpg"
            />
            <p class="text-xs text-muted-foreground">
              Profile image URL (optional) - in the future this will be handled by our image hosting service
            </p>
          </div>

          <!-- HTM Account Configuration -->
          <div class="border-t pt-6 space-y-4">
            <h3 class="text-lg font-semibold">
              HTM Account Configuration
            </h3>
            <p class="text-sm text-muted-foreground">
              Configure your Hive account and cryptographic keys for HTM access
            </p>

            <!-- Warning about different keys -->
            <div class="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-900 rounded-lg p-4">
              <div class="flex items-start gap-3">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  class="h-5 w-5 text-yellow-600 dark:text-yellow-500 mt-0.5"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fill-rule="evenodd"
                    d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                    clip-rule="evenodd"
                  />
                </svg>
                <div class="flex-1">
                  <h4 class="text-sm font-semibold text-yellow-800 dark:text-yellow-200">
                    Important: Use Different Keys!
                  </h4>
                  <p class="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                    HTM keys must be <strong>different</strong> from your Hive posting key. Use your Hive posting key only for the "Hive Posting Private Key" field. Generate new, separate keys for HTM Operational and Management.
                  </p>
                </div>
              </div>
            </div>

            <!-- Show validation error if keys are the same -->
            <div
              v-if="keysValidationError"
              class="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900 rounded-lg p-4"
            >
              <div class="flex items-center gap-2">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  class="h-5 w-5 text-red-600 dark:text-red-500"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fill-rule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                    clip-rule="evenodd"
                  />
                </svg>
                <p class="text-sm font-medium text-red-800 dark:text-red-200">
                  {{ keysValidationError }}
                </p>
              </div>
            </div>

            <!-- Hive Account (required) -->
            <div class="space-y-2">
              <Label for="hive-account">
                Hive Account Name *
              </Label>
              <Input
                id="hive-account"
                v-model="registrationData.hiveAccount"
                type="text"
                placeholder="your-hive-account"
                required
                pattern="[a-z0-9\-\.]+"
                maxlength="16"
              />
              <p class="text-xs text-muted-foreground">
                Your existing Hive blockchain account name
              </p>
            </div>

            <!-- Hive Posting Private Key (required) -->
            <div class="space-y-2">
              <Label for="hive-posting-private-key">
                Hive Posting Private Key *
              </Label>
              <Input
                id="hive-posting-private-key"
                v-model="registrationData.hivePostingPrivateKey"
                type="password"
                placeholder="5..."
                required
                class="font-mono text-sm"
              />
              <p class="text-xs text-muted-foreground">
                Your Hive posting private key from your <strong>existing Hive account</strong> (required to register on HTM). This is different from HTM keys.
              </p>
            </div>

            <!-- Operational Private Key (required) -->
            <div class="space-y-2">
              <div class="flex items-center justify-between">
                <Label for="operational-private-key">
                  HTM Operational Private Key *
                </Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  @click="generateHTMKeys"
                >
                  Generate HTM Keys
                </Button>
              </div>
              <Input
                id="operational-private-key"
                v-model="registrationData.operationalPrivateKey"
                type="password"
                placeholder="5... (will be auto-generated)"
                required
                class="font-mono text-sm"
              />
              <p class="text-xs text-muted-foreground">
                HTM operational private key in WIF format (used for day-to-day operations and transfers). Click "Generate HTM Keys" to create new keys automatically.
              </p>
            </div>

            <!-- Management Private Key (optional) -->
            <div class="space-y-2">
              <Label for="management-private-key">
                HTM Management Private Key (Optional)
              </Label>
              <Input
                id="management-private-key"
                v-model="registrationData.managementPrivateKey"
                type="password"
                placeholder="5... (auto-generated with Operational Key)"
                class="font-mono text-sm"
              />
              <p class="text-xs text-muted-foreground">
                HTM management private key in WIF format (optional, used for account authority and token creation). Auto-generated when you click "Generate HTM Keys".
              </p>
            </div>

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
              <p class="text-xs text-muted-foreground">
                Confirm your wallet password
              </p>
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
              :disabled="isLoading || !isFormValid"
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
