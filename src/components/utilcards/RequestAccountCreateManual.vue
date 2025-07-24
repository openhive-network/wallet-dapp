<script setup lang="ts">
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { Label } from '@/components/ui/label';
import ExpandablePanel from '@/components/utilcards/ExpandablePanel.vue';
import ShareAccountCreationLink from '@/components/utilcards/ShareAccountCreationLink.vue';
import {
  mdiAccountPlusOutline,
  mdiChevronDown,
  mdiChevronUp,
  mdiCheckCircle,
  mdiAlertCircle,
  mdiRefresh,
  mdiKeyOutline,
  mdiFileDocumentOutline,
  mdiLinkVariant,
  mdiNumeric1Circle,
  mdiNumeric2Circle,
  mdiNumeric3Circle,
  mdiNumeric4Circle,
  mdiDownload,
  mdiContentCopy
} from '@mdi/js';
import { computed, ref, reactive } from 'vue';
import { toastError } from '@/utils/parse-error';
import { getWax } from '@/stores/wax.store';
import type { TRole } from '@hiveio/wax/vite';
import { toast } from 'vue-sonner';
import packageJson from '../../../package.json';

const { version } = packageJson;
const accountName = ref('');
const accountNameValid = ref(false);
const isGeneratingKeys = ref(false);
const authorityDataGenerated = ref(false);
const hasConfirmedDownload = ref(false);
const hasCopiedCreateSignLink = ref(false);
const showDetailsPanel = ref(false);
const accountNameError = ref('');
const isValidatingName = ref(false);

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
    title: "Account Name",
    description: "Enter valid account name"
  },
  step2: {
    completed: authorityDataGenerated.value,
    current: currentStep.value === 2,
    icon: mdiNumeric2Circle,
    title: "Generate Keys",
    description: "Create authority data"
  },
  step3: {
    completed: hasConfirmedDownload.value,
    current: currentStep.value === 3,
    icon: mdiNumeric3Circle,
    title: "Confirm Download",
    description: "Verify file saved"
  },
  step4: {
    completed: hasCopiedCreateSignLink.value,
    current: currentStep.value === 4,
    icon: mdiNumeric4Circle,
    title: "Get Signing Link",
    description: "Copy creation link"
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

const validateAccountName = async () => {
  try {
    isValidatingName.value = true;
    accountNameError.value = '';

    if (!accountName.value) {
      accountNameValid.value = false;
      return;
    }

    const cleanAccountName = accountName.value.startsWith("@") ? accountName.value.slice(1) : accountName.value;
    if (!cleanAccountName) {
      accountNameValid.value = false;
      accountNameError.value = 'Account name cannot be empty';
      return;
    }

    if (cleanAccountName.length < 3) {
      accountNameValid.value = false;
      accountNameError.value = 'Account name must be at least 3 characters long';
      return;
    }

    if (cleanAccountName.length > 16) {
      accountNameValid.value = false;
      accountNameError.value = 'Account name cannot be longer than 16 characters';
      return;
    }

    if (!/^[a-z][a-z0-9.-]*[a-z0-9]$/.test(cleanAccountName)) {
      accountNameValid.value = false;
      accountNameError.value = 'Account name can only contain lowercase letters, numbers, dots and dashes. Must start with a letter and end with letter or number.';
      return;
    }

    const wax = await getWax();
    const isValid = wax.isValidAccountName(cleanAccountName);

    if (isValid) {
      accountNameValid.value = true;
      accountNameError.value = '';
    } else {
      accountNameValid.value = false;
      accountNameError.value = 'Invalid account name format';
    }

    return accountNameValid.value;
  } catch (error) {
    accountNameError.value = 'Failed to validate account name';
    toastError("Failed to validate account name", error);
    return accountNameValid.value = false;
  } finally {
    isValidatingName.value = false;
  }
};

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

  toast.info("Process reset. You can generate new authority data.");
};

const generateAndDownloadAuthorityData = async () => {
  if (!accountNameValid.value) {
    toast.error("Please enter a valid account name first");
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
    toast.success("Authority data generated and downloaded successfully!", {
      description: "The file has been saved to your downloads folder."
    });

  } catch (error) {
    toast.error("Failed to generate authority data", {
      description: "Please try again or check your connection."
    });
    toastError("Failed to generate authority data", error);
  } finally {
    isGeneratingKeys.value = false;
  }
};

const downloadAuthorityData = () => {
  const cleanAccountName = accountName.value.startsWith("@") ? accountName.value.slice(1) : accountName.value;

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
    _note: "KEEP THIS FILE SAFE! This master key is the key to your entire account. Store it in a secure location and never share it with anyone.",
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

const getAccountCreateSigningLink = (): string => {
  const cleanAccountName = accountName.value.startsWith('@') ? accountName.value.slice(1) : accountName.value;
  hasCopiedCreateSignLink.value = true;
  return `${window.location.protocol}//${window.location.host}/account/create?acc=${cleanAccountName}&${Object.entries(authorityData.publicKeys).map(([role, key]) => `${role}=${key}`).join('&')}`;
};

const canShowConfirmation = computed(() => authorityDataGenerated.value);
const canCopyLink = computed(() => authorityDataGenerated.value && hasConfirmedDownload.value);

const shareViaWhatsApp = () => {
  const link = getAccountCreateSigningLink();
  const message = `Hi! I need help creating my Hive account: ${accountName.value}. Please use this link to create it for me: ${link}`;
  const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
  window.open(whatsappUrl, '_blank');
};

const shareViaEmail = () => {
  const link = getAccountCreateSigningLink();
  const subject = 'Help me create my Hive account';
  const body = `Hi there!\n\nI'm trying to create a new Hive account and need someone with an existing account to help me.\n\nPlease use this link to create my account: ${accountName.value} \n${link}\n\nThank you for your help!`;
  const emailUrl = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  window.open(emailUrl);
};

const shareViaTelegram = () => {
  const link = getAccountCreateSigningLink();
  const message = `Hi! I need help creating my Hive account: ${accountName.value}. Please use this link to create it for me: ${link}`;
  const telegramUrl = `https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent(message)}`;
  window.open(telegramUrl, '_blank');
};

const shareViaCopy = () => {
  const link = getAccountCreateSigningLink();
  const message = `Hi! I need help creating my Hive account: ${accountName.value}. Please use this link to create it for me: ${link}`;
  // Copy the message to clipboard
  navigator.clipboard.writeText(message).then(() => {
    toast.info("Message copied! You can paste it anywhere.", {
      description: "Copying the link is the easiest way to share."
    });
  });
};

const shareButtons = [
  {
    platform: 'Email',
    color: 'indigo',
    icon: 'M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z',
    action: shareViaEmail
  },
  {
    platform: 'WhatsApp',
    color: 'green',
    icon: 'M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0020.885 3.786',
    action: shareViaWhatsApp
  },
  {
    platform: 'Telegram',
    color: 'blue',
    icon: 'M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z',
    action: shareViaTelegram
  },
  {
    platform: 'Copy',
    color: 'orange',
    icon: mdiContentCopy,
    action: shareViaCopy
  }
];
</script>

<template>
  <Card class="w-full max-w-[600px]">
    <CardHeader>
      <CardTitle class="inline-flex items-center justify-between">
        <span>Wallet Independent Onboarding</span>
        <svg width="20" height="20" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
          <path style="fill: hsla(var(--foreground) / 80%)" :d="mdiAccountPlusOutline"/>
        </svg>
      </CardTitle>
      <CardDescription class="mr-8">
        Generate your account authority data to download it, store them in safe place and next create a link shared to your Hive friend
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
            <svg v-if="step.completed" width="16" height="16" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
              <path style="fill: currentColor" :d="mdiCheckCircle"/>
            </svg>
            <svg v-else width="16" height="16" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
              <path style="fill: currentColor" :d="step.icon"/>
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
            <p class="text-gray-400 mt-1">{{ step.description }}</p>
          </div>
        </div>
      </div>
      <Separator />
      <div class="space-y-3">
        <div class="flex items-center space-x-2">
          <svg width="18" height="18" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
            <path style="fill: hsl(var(--primary))" :d="mdiNumeric1Circle"/>
          </svg>
          <Label for="manual_account_name" class="text-base font-semibold">Account Name</Label>
        </div>
        <div class="relative">
          <Input
            id="manual_account_name"
            v-model="accountName"
            @input="validateAccountName()"
            placeholder="Enter your desired account name"
            :class="{
              'border-red-500': accountName && !accountNameValid && accountNameError,
              'border-green-500': accountNameValid,
              'pr-10': isValidatingName || accountNameValid
            }"
            class="w-full"
          />
          <div v-if="isValidatingName || accountNameValid" class="absolute inset-y-0 right-0 flex items-center pr-3">
            <svg v-if="isValidatingName" class="animate-spin h-4 w-4 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <svg v-else-if="accountNameValid" width="16" height="16" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
              <path style="fill: rgb(34 197 94)" :d="mdiCheckCircle"/>
            </svg>
          </div>
        </div>
        <div v-if="accountNameError" class="flex items-start space-x-2 text-sm text-red-600">
          <svg width="14" height="14" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="mt-0.5 flex-shrink-0">
            <path style="fill: currentColor" :d="mdiAlertCircle"/>
          </svg>
          <span>{{ accountNameError }}</span>
        </div>
        <div v-else-if="accountNameValid" class="flex items-center justify-center space-x-2 text-sm text-green-600">
          <svg width="14" height="14" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
            <path style="fill: currentColor" :d="mdiCheckCircle"/>
          </svg>
          <span>Valid account name</span>
        </div>
      </div>
      <div class="space-y-4" :class="{ 'opacity-50': !accountNameValid }">
        <div class="flex items-center justify-between">
          <div class="flex items-center space-x-2">
            <svg width="18" height="18" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
              <path style="fill: hsl(var(--primary))" :d="mdiNumeric2Circle"/>
            </svg>
            <Label class="text-base font-semibold">Authority Data Preparation</Label>
          </div>
          <Button
            v-if="authorityDataGenerated"
            @click="resetProcess"
            variant="ghost"
            size="sm"
            class="text-gray-400"
          >
            <svg width="14" height="14" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="mr-1">
              <path style="fill: currentColor" :d="mdiRefresh"/>
            </svg>
            Reset process
          </Button>
        </div>
        <Button
          @click="authorityDataGenerated ? downloadAuthorityData() : generateAndDownloadAuthorityData()"
          :disabled="!accountNameValid || isGeneratingKeys"
          class="w-full"
        >
          <div class="flex items-center justify-center">
            <svg v-if="!isGeneratingKeys" width="16" height="16" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="mr-2">
              <path style="fill: currentColor" :d="authorityDataGenerated ? mdiDownload : mdiKeyOutline"/>
            </svg>
            <div v-if="isGeneratingKeys" class="flex items-center">
              <svg class="animate-spin h-4 w-4 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" :d="mdiKeyOutline"></path>
              </svg>
              <span>Generating keys...</span>
            </div>
            <span v-else>{{ authorityDataGenerated ? 'Download' : 'Generate and Download' }} Authority Data</span>
          </div>
        </Button>
        <p v-if="authorityDataGenerated" class="flex items-center justify-center text-sm space-x-2 text-green-600">
          <svg width="16" height="16" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
            <path style="fill: currentColor" :d="mdiCheckCircle"/>
          </svg>
            <span>
              Authority data generated and downloaded
            </span>
        </p>
      <ExpandablePanel v-if="authorityDataGenerated" class="space-y-4" :publicKeys="authorityData.publicKeys" />
      </div>
      <div v-if="canShowConfirmation" class="space-y-4" :class="{ 'opacity-50': !authorityDataGenerated }">
        <div class="flex items-center space-x-2">
          <svg width="18" height="18" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
            <path style="fill: hsl(var(--primary))" :d="mdiNumeric3Circle"/>
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
              v-model="hasConfirmedDownload"
              id="confirm-download"
              :checked="hasConfirmedDownload"
              class="mt-1 pointer-events-none"
            />
            <div class="flex-1">
              <Label for="confirm-download" class="text-sm cursor-pointer leading-relaxed">
                 I confirm receipt of the authority data file and am aware it holds my master password,
                 which requires careful safeguarding.
                 This data is essential for using my account,
                 and I cannot afford to lose it.
              </Label>
            </div>
          </div>
        </div>
      </div>
      <div v-if="canShowConfirmation" class="space-y-4" :class="{ 'opacity-50': !hasConfirmedDownload }">
        <div class="flex items-center space-x-2">
          <svg width="18" height="18" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
            <path style="fill: hsl(var(--primary))" :d="mdiNumeric4Circle"/>
          </svg>
          <Label class="text-base font-semibold">Prepare Signing Link</Label>
        </div>
        <TooltipProvider :delayDuration="200">
          <Tooltip>
            <TooltipTrigger as-child>
              <div class="w-full">
                <Button
                  :disabled="!canCopyLink"
                  :copy="getAccountCreateSigningLink"
                  class="w-full"
                  variant="default"
                >
                  <div class="flex items-center justify-center">
                    <svg width="16" height="16" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="mr-2">
                      <path style="fill: currentColor" :d="mdiLinkVariant"/>
                    </svg>
                    <span>Copy Account Creation Link</span>
                  </div>
                </Button>
              </div>
            </TooltipTrigger>
            <TooltipContent
              v-if="!canCopyLink"
              side="top"
              class="bg-amber-50 text-amber-800 border-amber-200 max-w-xs p-3"
            >
              <div class="flex items-start space-x-2">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-amber-500 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
                <div class="flex-1">
                  <p class="text-sm font-bold text-amber-800">Confirmation Required</p>
                  <p class="text-sm text-amber-700 mt-1">Please confirm that you have downloaded the authority data file.</p>
                </div>
              </div>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
        <p class="text-sm text-gray-400">
          The generated link has all the info a Hive friend needs to create your account directly on the Hive blockchain
        </p>
        <p v-if="hasCopiedCreateSignLink" class="flex items-center justify-center text-sm space-x-2 text-green-600">
          <svg width="16" height="16" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
            <path style="fill: currentColor" :d="mdiCheckCircle"/>
          </svg>
            <span>
              Link copied! Now send this link to someone who has an account to execute this operation in blockchain
            </span>
        </p>
        <div v-if="hasCopiedCreateSignLink" class="space-y-3">
          <p class="text-sm text-gray-400 text-center">Share with:</p>
          <div class="flex flex-wrap gap-2 justify-center">
            <Button
              v-for="button in shareButtons"
              :key="button.platform"
              @click="button.action"
              variant="outline"
              size="sm"
              :class="`flex items-center space-x-2 text-${button.color}-600 border-${button.color}-200`"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path :d="button.icon"/>
              </svg>
              <span>{{ button.platform }}</span>
            </Button>
          </div>
        </div>
      </div>
    </CardContent>
  </Card>
</template>
