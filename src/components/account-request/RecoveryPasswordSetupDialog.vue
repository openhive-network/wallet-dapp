<script setup lang="ts">
import { CloudUpload, Eye, EyeOff } from 'lucide-vue-next';
import { computed, ref, watch } from 'vue';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { PromptDialogState } from '@/composables/usePromptDialog';

const props = defineProps<{
  dialog: PromptDialogState<string>;
}>();

const password = ref('');
const repeatPassword = ref('');
const showPassword = ref(false);

const passwordsMatch = computed(() => password.value === repeatPassword.value);
const isValid = computed(() => password.value.trim().length > 0 && repeatPassword.value.length > 0 && passwordsMatch.value);

const reset = () => {
  password.value = '';
  repeatPassword.value = '';
  showPassword.value = false;
};

const handleSubmit = () => {
  if (!isValid.value)
    return;

  props.dialog.submit(password.value);
};

const handleCancel = () => {
  props.dialog.cancel();
};

const handleOpenChange = (open: boolean) => {
  if (!open)
    handleCancel();
};

watch(() => props.dialog.isOpen.value, (isOpen) => {
  if (!isOpen)
    reset();
});
</script>

<template>
  <Dialog
    :open="dialog.isOpen.value"
    @update:open="handleOpenChange"
  >
    <DialogContent class="sm:max-w-md">
      <form
        data-testid="create-account-recovery-dialog"
        @submit.prevent="handleSubmit"
      >
        <DialogHeader>
          <DialogTitle class="flex items-center gap-2">
            <CloudUpload class="w-5 h-5 text-primary" />
            Secure your Google Drive wallet
          </DialogTitle>
          <DialogDescription>
            Your keys are encrypted with this password on this device before they are saved to a private folder of your Google Drive,
            so nobody else can read them. Choose the recovery password that unlocks the wallet.
          </DialogDescription>
        </DialogHeader>

        <div class="space-y-4 py-4">
          <div class="space-y-2">
            <Label for="create_account_recovery_password">Recovery password</Label>
            <div class="relative">
              <Input
                id="create_account_recovery_password"
                v-model="password"
                data-testid="create-account-recovery-password"
                :type="showPassword ? 'text' : 'password'"
                autocomplete="new-password"
                placeholder="Password used to encrypt your wallet file"
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
                <Eye
                  v-if="!showPassword"
                  class="w-4 h-4 text-gray-500"
                />
                <EyeOff
                  v-else
                  class="w-4 h-4 text-gray-500"
                />
              </Button>
            </div>
          </div>
          <div class="space-y-2">
            <Label for="create_account_recovery_password_repeat">Repeat recovery password</Label>
            <Input
              id="create_account_recovery_password_repeat"
              v-model="repeatPassword"
              data-testid="create-account-recovery-password-repeat"
              :type="showPassword ? 'text' : 'password'"
              autocomplete="new-password"
              placeholder="Repeat the recovery password"
            />
          </div>
          <p
            v-if="repeatPassword && !passwordsMatch"
            class="text-sm text-red-600"
          >
            Passwords do not match
          </p>
          <Alert variant="warning">
            <AlertDescription>
              <strong>Important:</strong> if you forget this password, the wallet stored in Google Drive cannot be decrypted. There is no password reset.
            </AlertDescription>
          </Alert>
        </div>

        <DialogFooter class="gap-2">
          <Button
            data-testid="create-account-recovery-cancel"
            type="button"
            variant="outline"
            @click="handleCancel"
          >
            Cancel
          </Button>
          <Button
            data-testid="create-account-recovery-submit"
            type="submit"
            :disabled="!isValid"
          >
            Create account
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  </Dialog>
</template>
