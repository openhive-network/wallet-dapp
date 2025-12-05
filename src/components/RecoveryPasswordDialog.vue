<script setup lang="ts">
import { AlertTriangle, Eye, EyeOff, KeyRound, Loader2 } from 'lucide-vue-next';
import { ref } from 'vue';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useRecoveryPasswordDialog } from '@/composables/usePromptDialog';

const recoveryPasswordDialog = useRecoveryPasswordDialog();

const password = ref('');
const showPassword = ref(false);
const isSubmitting = ref(false);

const togglePasswordVisibility = () => {
  showPassword.value = !showPassword.value;
};

const handleSubmit = () => {
  if (!password.value.trim()) return;

  isSubmitting.value = true;
  recoveryPasswordDialog.submit(password.value);
  password.value = '';
  showPassword.value = false;
  isSubmitting.value = false;
};

const handleCancel = () => {
  password.value = '';
  showPassword.value = false;
  recoveryPasswordDialog.cancel();
};

const handleOpenChange = (open: boolean) => {
  if (!open)
    handleCancel();
};

const handleKeydown = (event: KeyboardEvent) => {
  if (event.key === 'Enter' && password.value.trim())
    handleSubmit();
};
</script>

<template>
  <Dialog
    :open="recoveryPasswordDialog.isOpen.value"
    @update:open="handleOpenChange"
  >
    <DialogContent class="sm:max-w-md">
      <DialogHeader>
        <DialogTitle class="flex items-center gap-2">
          <KeyRound class="w-5 h-5 text-primary" />
          Recovery Password Required
        </DialogTitle>
        <DialogDescription>
          Enter your recovery password to unlock and access your Google Drive wallet.
        </DialogDescription>
      </DialogHeader>

      <div class="space-y-4 py-4">
        <div class="space-y-2">
          <Label for="recoveryPassword">Recovery Password</Label>
          <div class="relative">
            <Input
              id="recoveryPassword"
              v-model="password"
              :type="showPassword ? 'text' : 'password'"
              placeholder="Enter your recovery password"
              autocomplete="off"
              class="pr-10"
              @keydown="handleKeydown"
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              class="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
              @click="togglePasswordVisibility"
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

        <Alert variant="warning">
          <AlertTriangle class="w-4 h-4" />
          <AlertDescription>
            <strong>Important:</strong> If you forget this password, your wallet cannot be recovered. There is no password reset option.
          </AlertDescription>
        </Alert>

        <p class="text-xs text-gray-500 dark:text-gray-400">
          This password was set when you created your wallet. It is used to encrypt your private keys stored in Google Drive.
        </p>
      </div>

      <DialogFooter>
        <Button
          variant="outline"
          :disabled="isSubmitting"
          @click="handleCancel"
        >
          Cancel
        </Button>
        <Button
          :disabled="!password.trim() || isSubmitting"
          @click="handleSubmit"
        >
          <Loader2
            v-if="isSubmitting"
            class="w-4 h-4 animate-spin mr-2"
          />
          {{ isSubmitting ? 'Unlocking...' : 'Unlock Wallet' }}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
