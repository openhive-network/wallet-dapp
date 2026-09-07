<script setup lang="ts">
import { mdiAutoFix, mdiEye, mdiEyeOff } from '@mdi/js';
import { computed, ref } from 'vue';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { getWax } from '@/stores/wax.store';
import { MIN_ACCOUNT_PASSWORD_LENGTH } from '@/utils/account-request/methods';
import { toastError } from '@/utils/parse-error';

const props = defineProps<{
  disabled?: boolean;
}>();

const emit = defineEmits<{
  submit: [password: string];
}>();

const password = ref('');
const repeatPassword = ref('');
const showPassword = ref(false);
const isSuggesting = ref(false);

const isLongEnough = computed(() => password.value.length >= MIN_ACCOUNT_PASSWORD_LENGTH);
const passwordsMatch = computed(() => password.value === repeatPassword.value);
const isValid = computed(() => isLongEnough.value && repeatPassword.value.length > 0 && passwordsMatch.value);

const validationError = computed(() => {
  if (password.value && !isLongEnough.value)
    return `Password must be at least ${MIN_ACCOUNT_PASSWORD_LENGTH} characters long`;

  if (repeatPassword.value && !passwordsMatch.value)
    return 'Passwords do not match';

  return '';
});

const suggestPassword = async () => {
  try {
    isSuggesting.value = true;

    const wax = await getWax();
    const suggested = wax.suggestBrainKey().wifPrivateKey;

    password.value = suggested;
    repeatPassword.value = suggested;
    showPassword.value = true;
  } catch (error) {
    toastError('Failed to suggest a password', error);
  } finally {
    isSuggesting.value = false;
  }
};

const submit = () => {
  if (isValid.value && !props.disabled)
    emit('submit', password.value);
};
</script>

<template>
  <form
    data-testid="create-account-password-panel"
    class="space-y-4"
    @submit.prevent="submit"
  >
    <Alert variant="warning">
      <AlertDescription>
        All keys of your new account are derived from this password. Anyone who learns it gains full control over the account
        and there is no way to reset it - use a long, unique password and store it safely.
      </AlertDescription>
    </Alert>
    <div class="space-y-2">
      <div class="flex items-center justify-between">
        <Label for="create_account_password">Master password</Label>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          class="h-7 px-2 text-xs"
          :loading="isSuggesting"
          @click="suggestPassword"
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
              :d="mdiAutoFix"
            />
          </svg>
          Suggest a strong password
        </Button>
      </div>
      <div class="relative">
        <Input
          id="create_account_password"
          v-model="password"
          data-testid="create-account-password"
          :type="showPassword ? 'text' : 'password'"
          autocomplete="new-password"
          placeholder="Choose a strong master password"
          class="pr-10"
        />
        <Button
          type="button"
          variant="ghost"
          size="sm"
          class="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
          :aria-label="showPassword ? 'Hide password' : 'Show password'"
          @click="showPassword = !showPassword"
        >
          <svg
            width="16"
            height="16"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
          >
            <path
              style="fill: currentColor"
              :d="showPassword ? mdiEyeOff : mdiEye"
            />
          </svg>
        </Button>
      </div>
    </div>
    <div class="space-y-2">
      <Label for="create_account_password_repeat">Repeat master password</Label>
      <Input
        id="create_account_password_repeat"
        v-model="repeatPassword"
        data-testid="create-account-password-repeat"
        :type="showPassword ? 'text' : 'password'"
        autocomplete="new-password"
        placeholder="Repeat the master password"
      />
    </div>
    <p
      v-if="validationError"
      class="text-sm text-red-600"
    >
      {{ validationError }}
    </p>
    <Button
      data-testid="create-account-password-submit"
      type="submit"
      class="w-full"
      :disabled="disabled || !isValid"
    >
      Create account
    </Button>
  </form>
</template>
