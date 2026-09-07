<script setup lang="ts">
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
  mdiHelpCircleOutline,
  mdiLoading
} from '@mdi/js';
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
import { downloadAuthorityDataFile } from '@/utils/account-request/authority-data';
import { createEmptyRoleKeys, generateAccountAuthorityData, type AccountAuthorityData } from '@/utils/account-request/keys';
import { toastError } from '@/utils/parse-error';

import { normalizeAccountName } from '#shared/utils/account-name';

import AccountCreationActionButtons from '../ui/hive/AccountCreationActionButtons.vue';

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

const authorityData = reactive<AccountAuthorityData>({
  masterPassword: '',
  privateKeys: createEmptyRoleKeys(),
  publicKeys: createEmptyRoleKeys()
});

const resetProcess = () => {
  authorityDataGenerated.value = false;
  hasConfirmedDownload.value = false;
  hasCopiedCreateSignLink.value = false;
  showDetailsPanel.value = false;

  // Clear authority data
  authorityData.masterPassword = '';
  authorityData.privateKeys = createEmptyRoleKeys();
  authorityData.publicKeys = createEmptyRoleKeys();

  toast.info('Process reset. You can generate new authority data.');
};

const generateAndDownloadAuthorityData = async () => {
  if (!accountNameValid.value) {
    toastError('Please enter a valid account name first');
    return;
  }

  try {
    isGeneratingKeys.value = true;

    // Add small delay for better UX feedback
    await new Promise(resolve => setTimeout(resolve, 500));

    const wax = await getWax();

    // Random master password with deterministic per-role keys derived from it
    const { masterPassword, privateKeys, publicKeys } = generateAccountAuthorityData(wax, normalizeAccountName(accountName.value));

    authorityData.masterPassword = masterPassword;
    authorityData.privateKeys = privateKeys;
    authorityData.publicKeys = publicKeys;

    // Automatically download the authority data file
    downloadAuthorityData();

    authorityDataGenerated.value = true;
    toast.success('Authority data generated and downloaded successfully!');

  } catch (error) {
    toastError('Failed to generate authority data', error);
  } finally {
    isGeneratingKeys.value = false;
  }
};

const downloadAuthorityData = () => {
  downloadAuthorityDataFile(normalizeAccountName(accountName.value), authorityData);
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
                viewBox="0 0 24 24"
              >
                <path
                  style="fill: currentColor"
                  :d="mdiLoading"
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
