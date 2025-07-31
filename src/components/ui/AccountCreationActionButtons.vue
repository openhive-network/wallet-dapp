<script lang="ts" setup>
import { mdiAccountMultiplePlusOutline, mdiCheckCircle, mdiLinkVariant } from '@mdi/js';
import { storeToRefs } from 'pinia';
import { computed } from 'vue';

import { Button } from '@/components/ui/button';
import HiveFriendHelpText from '@/components/ui/HiveFriendHelpText.vue';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import ShareAccountCreationLink from '@/components/utilcards/ShareAccountCreationLink.vue';
import { useAccountCreationStore } from '@/stores/account-creation.store';
import { useUserStore } from '@/stores/user.store';

const props = defineProps<{
  createAccountNameOperation: string;
  publicKeys: Record<string, string>;
  buttonsDisabled: boolean;
  showTooltip: boolean;
}>();

const userStore = useUserStore();

const { isCreationLinkCopied } = storeToRefs(useAccountCreationStore());

const hasUser = computed(() => userStore.profileImage !== undefined);

const getAccountCreateSigningLink = (): string => {
  const accountName = props.createAccountNameOperation.startsWith('@') ? props.createAccountNameOperation.slice(1) : props.createAccountNameOperation;
  isCreationLinkCopied.value = true;
  return `${window.location.protocol}//${window.location.host}/account/create?acc=${accountName}&${Object.entries(props.publicKeys).map(([role, key]) => `${role}=${key}`).join('&')}`;
};
</script>

<template>
  <div>
    <div
      v-if="hasUser"
      class="w-full"
    >
      <TooltipProvider :delay-duration="200">
        <Tooltip>
          <TooltipTrigger as-child>
            <div class="w-full">
              <Button
                :as="props.buttonsDisabled ? 'button' : 'a'"
                :href="getAccountCreateSigningLink()"
                :disabled="props.buttonsDisabled"
                class="w-full"
                variant="default"
              >
                <div class="flex items-center justify-center">
                  <svg
                    width="16"
                    height="16"
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    class="mr-2"
                  >
                    <path
                      style="fill: currentColor"
                      :d="mdiAccountMultiplePlusOutline"
                    />
                  </svg>
                  <span>Process Account Creation Request</span>
                </div>
              </Button>
            </div>
          </TooltipTrigger>
          <TooltipContent
            v-if="showTooltip"
            side="top"
            class="bg-amber-50 text-amber-800 border-amber-200 max-w-xs p-3"
          >
            <div class="flex items-start space-x-2">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                class="h-5 w-5 text-amber-500 mt-0.5 flex-shrink-0"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"
                />
              </svg>
              <div class="flex-1">
                <p class="text-sm font-bold text-amber-800">
                  Confirmation Required
                </p>
                <p class="text-sm text-amber-700 mt-1">
                  Please confirm that you have downloaded the authority data file.
                </p>
              </div>
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
      <Separator
        label="Or"
        class="my-6"
      />
    </div>
    <TooltipProvider :delay-duration="200">
      <Tooltip>
        <TooltipTrigger as-child>
          <div class="w-full mb-4">
            <Button
              :disabled="props.buttonsDisabled"
              :copy="getAccountCreateSigningLink"
              class="w-full"
              variant="default"
            >
              <div class="flex items-center justify-center">
                <svg
                  width="16"
                  height="16"
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  class="mr-2"
                >
                  <path
                    style="fill: currentColor"
                    :d="mdiLinkVariant"
                  />
                </svg>
                <span>Copy Account Creation Link</span>
              </div>
            </Button>
          </div>
        </TooltipTrigger>
        <TooltipContent
          v-if="showTooltip"
          side="top"
          class="bg-amber-50 text-amber-800 border-amber-200 max-w-xs p-3"
        >
          <div class="flex items-start space-x-2">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              class="h-5 w-5 text-amber-500 mt-0.5 flex-shrink-0"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"
              />
            </svg>
            <div class="flex-1">
              <p class="text-sm font-bold text-amber-800">
                Confirmation Required
              </p>
              <p class="text-sm text-amber-700 mt-1">
                Please confirm that you have downloaded the authority data file.
              </p>
            </div>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
    <HiveFriendHelpText />
    <p
      v-if="isCreationLinkCopied"
      class="flex items-center justify-center text-sm space-x-2 text-green-600 my-4"
    >
      <svg
        width="20"
        height="20"
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
      >
        <path
          style="fill: currentColor"
          :d="mdiCheckCircle"
        />
      </svg>
      <span>
        Link copied! Now send this link to someone who has an account to execute this operation in blockchain
      </span>
    </p>
    <ShareAccountCreationLink
      :visible="isCreationLinkCopied"
      :account-name="props.createAccountNameOperation"
      :get-link-function="getAccountCreateSigningLink"
    />
  </div>
</template>
