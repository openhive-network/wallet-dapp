<script setup lang="ts">
import { mdiAccountPlusOutline } from '@mdi/js';
import { toRef } from 'vue';

import AccountCreatedSummary from '@/components/account-request/AccountCreatedSummary.vue';
import AccountCreationProgress from '@/components/account-request/AccountCreationProgress.vue';
import PasswordRegistrationPanel from '@/components/account-request/PasswordRegistrationPanel.vue';
import RecoveryPasswordSetupDialog from '@/components/account-request/RecoveryPasswordSetupDialog.vue';
import RegistrationMethodPicker from '@/components/account-request/RegistrationMethodPicker.vue';
import TokenStatusAlert from '@/components/account-request/TokenStatusAlert.vue';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import AccountNameInput from '@/components/ui/hive/AccountNameInput.vue';
import { Skeleton } from '@/components/ui/skeleton';
import { useAccountCreationFlow } from '@/composables/useAccountCreationFlow';

const props = defineProps<{
  token: string;
}>();

const {
  stage,
  step,
  preparingMessage,
  accountName,
  normalizedAccountName,
  isAccountNameValid,
  selectedMethod,
  pendingMethod,
  canSubmit,
  result,
  authorityData,
  recoveryPasswordSetupDialog,
  selectMethod,
  submitWithPassword
} = useAccountCreationFlow(toRef(props, 'token'));
</script>

<template>
  <Card
    data-testid="create-account-card"
    class="w-full max-w-[600px] min-w-0"
  >
    <CardHeader>
      <CardTitle class="inline-flex items-center justify-between">
        <span>Create your Hive account</span>
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
        Pick a name and choose where the keys of your new account should live - the account is registered on the Hive blockchain right away.
      </CardDescription>
    </CardHeader>
    <CardContent>
      <div
        v-if="stage === 'verifying'"
        data-testid="create-account-verifying"
        class="space-y-4"
      >
        <Skeleton
          data-loading="skeleton"
          class="h-6 w-1/3"
        />
        <Skeleton class="h-10 w-full" />
        <Skeleton class="h-24 w-full" />
      </div>
      <TokenStatusAlert
        v-else-if="stage === 'invalid' || stage === 'claimed' || stage === 'unavailable'"
        :stage="stage"
      />
      <AccountCreatedSummary
        v-else-if="stage === 'success' && result"
        :account="result"
        :authority-data="authorityData"
      />
      <AccountCreationProgress
        v-else-if="stage === 'submitting'"
        :step="step"
        :account-name="normalizedAccountName"
        :preparing-message="preparingMessage"
      />
      <div
        v-else
        data-testid="create-account-form"
        class="space-y-6"
      >
        <AccountNameInput
          id="create_account_name"
          v-model="accountName"
          data-testid="create-account-name"
          label="Account name"
          placeholder="Choose your account name"
          :disabled="!!pendingMethod"
          @validation-change="(valid: boolean) => isAccountNameValid = valid"
        />
        <RegistrationMethodPicker
          :selected="selectedMethod"
          :pending-method="pendingMethod"
          :disabled="!isAccountNameValid"
          @select="selectMethod"
        />
        <PasswordRegistrationPanel
          v-if="selectedMethod === 'password'"
          :disabled="!canSubmit"
          @submit="submitWithPassword"
        />
      </div>
    </CardContent>
  </Card>
  <RecoveryPasswordSetupDialog :dialog="recoveryPasswordSetupDialog" />
</template>
