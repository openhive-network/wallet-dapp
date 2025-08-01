<script setup lang="ts">
import type { TRole } from '@hiveio/wax/vite';
import {
  mdiAccountPlusOutline,
  mdiCheckCircle,
  mdiRefresh,
  mdiKeyOutline,
  mdiNumeric1Circle,
  mdiNumeric2Circle,
  mdiNumeric3Circle,
  mdiNumeric4Circle,
  mdiDownload,
  mdiHelpCircleOutline} from '@mdi/js';
import { computed, ref, reactive } from 'vue';
import { toast } from 'vue-sonner';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import AccountNameInput from '@/components/ui/hive/AccountNameInput.vue';
import HiveFriendHelpTooltip from '@/components/ui/hive/HiveFriendHelpTooltip.vue';
import Label from '@/components/ui/label/Label.vue';
import { Separator } from '@/components/ui/separator';
import AccountDetailsExpandablePanel from '@/components/utilcards/AccountDetailsExpandablePanel.vue';
import { getWax } from '@/stores/wax.store';
import { toastError } from '@/utils/parse-error';

import packageJson from '../../../package.json';
import AccountCreationActionButtons from '../ui/hive/AccountCreationActionButtons.vue';

const { version } = packageJson;
const accountName = ref('');
const accountNameValid = ref(false);
const isGeneratingKeys = ref(false);
const authorityDataGenerated = ref(false);
const hasConfirmedDownload = ref(false);
const hasCopiedCreateSignLink = ref(false);
const showDetailsPanel = ref(false);

// Handle account name validation from the component
const onAccountNameValidationChange = (isValid: boolean) => {
  accountNameValid.value = isValid;
};

// Step tracking for improved UX
const currentStep = computed(() => {
  if (!accountNameValid.value) return 1;
  if (!authorityDataGenerated.value) return 2;
  if (!hasConfirmedDownload.value) return 3;
  return 4;
});

const stepStatus = computed(() => ({
  step1: {
    completed: accountNameValid.value,
    current: currentStep.value === 1,
    icon: mdiNumeric1Circle,
    title: 'Account Name',
    description: 'Enter valid account name'
  },
  step2: {
    completed: authorityDataGenerated.value,
    current: currentStep.value === 2,
    icon: mdiNumeric2Circle,
    title: 'Generate Keys',
    description: 'Create authority data'
  },
  step3: {
    completed: hasConfirmedDownload.value,
    current: currentStep.value === 3,
    icon: mdiNumeric3Circle,
    title: 'Confirm Download',
    description: 'Verify file saved'
  },
  step4: {
    completed: hasCopiedCreateSignLink.value,
    current: currentStep.value === 4,
    icon: mdiNumeric4Circle,
    title: 'Get Signing Link',
    description: 'Copy creation link'
  }
}));

const authorityData = reactive<{
  masterPassword: string;
  privateKeys: Record<TRole, string>;
  publicKeys: Record<TRole, string>;
}>({
  masterPassword: '',
  privateKeys: {
    owner: '',
    active: '',
    posting: '',
    memo: ''
  },
  publicKeys: {
    owner: '',
    active: '',
    posting: '',
    memo: ''
  }
});

const resetProcess = () => {
  authorityDataGenerated.value = false;
  hasConfirmedDownload.value = false;
  hasCopiedCreateSignLink.value = false;
  showDetailsPanel.value = false;

  // Clear authority data
  authorityData.masterPassword = '';
  authorityData.privateKeys = {
    owner: '',
    active: '',
    posting: '',
    memo: ''
  };
  authorityData.publicKeys = {
    owner: '',
    active: '',
    posting: '',
    memo: ''
  };

  toast.info('Process reset. You can generate new authority data.');
};

const generateAndDownloadAuthorityData = async () => {
  if (!accountNameValid.value) {
    toast.error('Please enter a valid account name first');
    return;
  }

  try {
    isGeneratingKeys.value = true;

    // Add small delay for better UX feedback
    await new Promise(resolve => setTimeout(resolve, 500));

    const wax = await getWax();

    const masterBrainKey = wax.suggestBrainKey();
    authorityData.masterPassword = masterBrainKey.wifPrivateKey;

    authorityData.privateKeys.owner = masterBrainKey.wifPrivateKey;
    authorityData.publicKeys.owner = masterBrainKey.associatedPublicKey;

    // Use the master brain key to derive keys for different roles
    // In a real implementation, this would use proper key derivation
    const roles: TRole[] = ['active', 'posting', 'memo'];

    for (const role of roles) {
      // For now, generate unique keys for each role (could be derived from master)
      const roleBrainKey = wax.suggestBrainKey();
      authorityData.privateKeys[role] = roleBrainKey.wifPrivateKey;

      // Generate a more realistic looking public key placeholder
      authorityData.publicKeys[role] = roleBrainKey.associatedPublicKey;
    }

    // Automatically download the authority data file
    downloadAuthorityData();

    authorityDataGenerated.value = true;
    toast.success('Authority data generated and downloaded successfully!');

  } catch (error) {
    toast.error('Failed to generate authority data', {
      description: 'Please try again or check your connection.'
    });
    toastError('Failed to generate authority data', error);
  } finally {
    isGeneratingKeys.value = false;
  }
};

const downloadAuthorityData = () => {
  const cleanAccountName = accountName.value.startsWith('@') ? accountName.value.slice(1) : accountName.value;

  const authorityFile = {
    account_name: cleanAccountName,
    master_key: authorityData.masterPassword,
    generated_at: new Date().toISOString(),
    authorities: {
      owner: {
        public_key: authorityData.publicKeys.owner,
        private_key: authorityData.privateKeys.owner
      },
      active: {
        public_key: authorityData.publicKeys.active,
        private_key: authorityData.privateKeys.active
      },
      posting: {
        public_key: authorityData.publicKeys.posting,
        private_key: authorityData.privateKeys.posting
      },
      memo: {
        public_key: authorityData.publicKeys.memo,
        private_key: authorityData.privateKeys.memo
      }
    },
    _note: 'KEEP THIS FILE SAFE! This master key is the key to your entire account. Store it in a secure location and never share it with anyone.',
    generator: `Hive Bridge v${version} #${__COMMIT_HASH__}`
  };

  const dataStr = JSON.stringify(authorityFile, null, 2);
  const dataBlob = new Blob([dataStr], { type: 'application/json' });
  const url = URL.createObjectURL(dataBlob);

  const link = document.createElement('a');
  link.href = url;
  link.download = `${cleanAccountName}-authority-data.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  URL.revokeObjectURL(url);
};

const canShowConfirmation = computed(() => authorityDataGenerated.value);
const canCopyLink = computed(() => authorityDataGenerated.value && hasConfirmedDownload.value);
</script>

<template>
  <Card class="w-full max-w-[600px]">
    <CardHeader>
      <CardTitle class="inline-flex items-center justify-between">
        <span>Wallet Independent Onboarding</span>
        <svg
          width="20"
          height="20"
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
        >
          <path
            style="fill: hsla(var(--foreground) / 80%)"
            :d="mdiAccountPlusOutline"
          />
        </svg>
      </CardTitle>
      <CardDescription class="mr-8">
        <HiveFriendHelpTooltip>
          <template #default>
            <span class="text-left">
              Generate your account authority data to download it, store them in safe place and next create a link shared to your Hive friend.
              <svg
                width="16"
                height="16"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                class="inline-block align-text-bottom"
              >
                <path
                  style="fill: currentColor"
                  :d="mdiHelpCircleOutline"
                />
              </svg>
            </span>
          </template>
        </HiveFriendHelpTooltip>
      </CardDescription>
    </CardHeader>
    <CardContent class="space-y-6">
      <div class="grid grid-cols-4 gap-2 mb-6">
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
      <AccountNameInput
        id="manual_account_name"
        v-model="accountName"
        :show-step-icon="true"
        placeholder="Enter your desired account name"
        @validation-change="onAccountNameValidationChange"
      />
      <div
        class="space-y-4"
        :class="{ 'opacity-50': !accountNameValid }"
      >
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
            <Label class="text-base font-semibold">Authority Data Preparation</Label>
          </div>
          <Button
            v-if="authorityDataGenerated"
            variant="ghost"
            size="sm"
            class="text-gray-400"
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
            Reset process
          </Button>
        </div>
        <Button
          :disabled="!accountNameValid || isGeneratingKeys"
          class="w-full"
          @click="authorityDataGenerated ? downloadAuthorityData() : generateAndDownloadAuthorityData()"
        >
          <div class="flex items-center justify-center">
            <svg
              v-if="!isGeneratingKeys"
              width="16"
              height="16"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              class="mr-2"
            >
              <path
                style="fill: currentColor"
                :d="authorityDataGenerated ? mdiDownload : mdiKeyOutline"
              />
            </svg>
            <div
              v-if="isGeneratingKeys"
              class="flex items-center"
            >
              <svg
                class="animate-spin h-4 w-4 mr-2"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  class="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  stroke-width="4"
                />
                <path
                  class="opacity-75"
                  fill="currentColor"
                  :d="mdiKeyOutline"
                />
              </svg>
              <span>Generating keys...</span>
            </div>
            <span v-else>{{ authorityDataGenerated ? 'Download' : 'Generate and Download' }} Authority Data</span>
          </div>
        </Button>
        <p
          v-if="authorityDataGenerated"
          class="flex items-center justify-center text-sm space-x-2 text-green-600"
        >
          <svg
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
          <span>
            Authority data generated and downloaded
          </span>
        </p>
        <AccountDetailsExpandablePanel
          v-if="authorityDataGenerated"
          class="space-y-4"
          :public-keys="authorityData.publicKeys"
        />
      </div>
      <div
        v-if="canShowConfirmation"
        class="space-y-4"
        :class="{ 'opacity-50': !authorityDataGenerated }"
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
          <Label class="text-base font-semibold">Confirm Received Authority Data Save</Label>
        </div>
        <div
          class="border rounded-lg p-4 cursor-pointer"
          tabindex="0"
          @click="hasConfirmedDownload = !hasConfirmedDownload"
          @keydown.enter="hasConfirmedDownload = !hasConfirmedDownload"
          @keydown.space.prevent="hasConfirmedDownload = !hasConfirmedDownload"
        >
          <div class="flex items-start space-x-3">
            <Checkbox
              id="confirm-download"
              v-model="hasConfirmedDownload"
              :checked="hasConfirmedDownload"
              class="mt-1 pointer-events-none"
            />
            <div class="flex-1">
              <Label
                for="confirm-download"
                class="text-sm cursor-pointer leading-relaxed"
              >
                I confirm receipt of the authority data file and am aware it holds my master password,
                which requires careful safeguarding.
                This data is essential for using my account,
                and I cannot afford to lose it.
              </Label>
            </div>
          </div>
        </div>
      </div>
      <div
        v-if="canShowConfirmation"
        class="space-y-4"
        :class="{ 'opacity-50': !hasConfirmedDownload }"
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
              :d="mdiNumeric4Circle"
            />
          </svg>
          <Label class="text-base font-semibold">Prepare Signing Link</Label>
        </div>
        <AccountCreationActionButtons
          :create-account-name-operation="accountName"
          :public-keys="authorityData.publicKeys"
          :buttons-disabled="!canCopyLink"
          :show-tooltip="!canCopyLink"
        />
      </div>
    </CardContent>
  </Card>
</template>
