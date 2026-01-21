<script setup lang="ts">
import type { htm_operation } from '@mtyszczak-cargo/htm';
import { toast } from 'vue-sonner';

import { StepsDeclaration, Steps } from '@/components/htm/HTMRegistrationForm/steps';
import { HTM_REGISTRATION_KEY } from '@/components/htm/HTMRegistrationForm/types';
import type { HTMRegistrationContext } from '@/components/htm/HTMRegistrationForm/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { useHTMAutoLogin } from '@/composables/useHTMAutoLogin';
import { UsedWallet, useSettingsStore } from '@/stores/settings.store';
import { useTokensStore } from '@/stores/tokens.store';
import { useUserStore } from '@/stores/user.store';
import { useWalletStore } from '@/stores/wallet.store';
import { getWax } from '@/stores/wax.store';
import { toastError } from '@/utils/parse-error';
import { generateQrCode } from '@/utils/qr/create-qr';
import { waitForTransactionStatus } from '@/utils/transaction-status';
import { isValidUrl } from '@/utils/validators';
import CTokensProvider from '@/utils/wallet/ctokens/signer';

const settingsStore = useSettingsStore();
const tokensStore = useTokensStore();
const walletStore = useWalletStore();
const userStore = useUserStore();

const emit = defineEmits(['goBack', 'success']);

const isLoading = ref(false);

const goBack = () => {
  emit('goBack');
};

const successShow = () => {
  emit('success');
};

const hasConfirmedDownload = ref(false);
const keysGenerated = ref(false);
const autoImport = ref(true);

// Use auto-login composable
const {
  encryptKeys,
  password,
  repeatPassword,
  showEncryptionWarning,
  passwordsMatch,
  isPasswordValid,
  getPasswordToUse
} = useHTMAutoLogin();

// Registration form data - simplified to match standard account creation flow
const registrationData = ref({
  name: '',                 // Account display name
  about: '',                // Description/bio (optional)
  website: '',              // Website URL (optional)
  profile_image: ''         // Profile image URL (optional)
});

// Generated HTM keys (auto-generated, not manually entered)
const generatedKeys = ref({
  operationalPrivateKey: '',
  operationalPublicKey: '',
  managementPrivateKey: '',
  managementPublicKey: ''
});

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

// Generate HTM keys automatically (called during registration)
const generateAndDownloadKeys = async () => {
  if (!isBasicInfoValid.value) {
    toastError('Please fill in all required fields');
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

// Form validation - only basic info needed in step 1
const isBasicInfoValid = computed(() => {
  const hasName = registrationData.value.name.trim().length > 0;
  return hasName && isPasswordValid.value;
});

// Download operational private key as QR code
const downloadPrivateKeyQR = async () => {
  try {
    // Prepare text
    const description = `HTM Operational Private key: ${registrationData.value.name}`;

    const blob = await generateQrCode(
      generatedKeys.value.operationalPrivateKey,
      description
    );

    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = `htm-operational-key-${registrationData.value.name}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    URL.revokeObjectURL(url);

    toast.success('QR code downloaded successfully');
  } catch (error) {
    toastError('Failed to generate QR code', error);
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

const handleConditionalSiteLogin = async (operationalKey: string) => {
  const wax = await getWax();

  if (walletStore.wallet !== undefined && !walletStore.isL2Wallet) {
    // Already logged in using L1 wallet, so just add another layer on top of that
    await tokensStore.reset(await CTokensProvider.for(wax, 'posting'));

    return;
  }

  await tokensStore.getCurrentUserMetadata();

  // Not logged in using any wallet so allow user log in using HTM wallet

  // Set settings with the operational key as account and CTOKENS wallet
  settingsStore.setSettings({
    account: operationalKey,
    wallet: UsedWallet.CTOKENS_IMPLEMENTATION
  });

  // Create wallet provider and parse user data
  await walletStore.createWalletFor(settingsStore.settings, 'posting');
  await userStore.parseUserData(operationalKey);
};

const registerHTMAccount = async () => {
  try {
    isLoading.value = true;

    // Validate that keys have been generated
    if (!keysGenerated.value)
      throw new Error('Please generate HTM keys first');

    // Validate that user confirmed download
    if (!hasConfirmedDownload.value)
      throw new Error('Please confirm you have saved the keys file');

    // Validate passwords match (only if encrypting)
    if (encryptKeys.value && !passwordsMatch.value)
      throw new Error('Passwords do not match');

    // Validate website URL if provided
    if (registrationData.value.website && !isValidUrl(registrationData.value.website))
      throw new Error('Please enter a valid website URL');

    // Validate profile image URL if provided
    if (registrationData.value.profile_image && !isValidUrl(registrationData.value.profile_image))
      throw new Error('Please enter a valid profile image URL');

    // Get wax instance
    const wax = await getWax();

    // Get the password to use (user-provided or random)
    const passwordToUse = getPasswordToUse();

    // Create HTM wallet for persistent storage (only if auto-import is enabled)
    let keys;
    if (autoImport.value) {
      keys = await CTokensProvider.createWallet(
        passwordToUse,
        generatedKeys.value.operationalPrivateKey,
        generatedKeys.value.managementPrivateKey
      );

      await CTokensProvider.login(passwordToUse);
    } else {
      // Just use the keys without creating a wallet
      keys = {
        operational: generatedKeys.value.operationalPublicKey,
        management: generatedKeys.value.managementPublicKey
      };
    }

    const explicitWallet = autoImport.value
      ? await CTokensProvider.for(wax, 'owner', false)
      : undefined;

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

    // Only handle login if auto-import is enabled
    if (autoImport.value)
      await handleConditionalSiteLogin(keys.operational!);

    // After successful registration, redirect to login
    successShow();
  } catch (error) {
    toastError('Failed to create HTM account', error);
  } finally {
    isLoading.value = false;
  }
};

// Provide context to child components
provide<HTMRegistrationContext>(HTM_REGISTRATION_KEY, {
  registrationData,
  generatedKeys,
  keysGenerated,
  hasConfirmedDownload,
  encryptKeys,
  password,
  repeatPassword,
  showEncryptionWarning,
  passwordsMatch,
  autoImport,
  isLoading,
  isBasicInfoValid,
  generateAndDownloadKeys,
  downloadKeysFile,
  downloadPrivateKeyQR,
  resetProcess
});
</script>

<template>
  <Card class="w-full max-w-2xl mx-auto">
    <CardHeader>
      <CardTitle class="text-2xl">
        Register New HTM Account
      </CardTitle>
      <CardDescription>
        Create your HTM account with auto-generated secure keys.
      </CardDescription>
    </CardHeader>
    <CardContent class="space-y-6">
      <!-- Progress Steps Indicator -->
      <StepsDeclaration />

      <Separator />

      <form
        class="space-y-4"
        @submit.prevent="registerHTMAccount"
      >
        <Steps />

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
            data-testid="htm-register-btn"
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
</template>
