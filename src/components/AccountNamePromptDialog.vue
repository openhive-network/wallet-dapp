<script setup lang="ts">
import { User, Loader2 } from 'lucide-vue-next';
import { ref } from 'vue';

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
import { useAccountNamePromptDialog } from '@/composables/usePromptDialog';

const accountNamePromptDialog = useAccountNamePromptDialog();

const accountName = ref('');
const isSubmitting = ref(false);

const handleSubmit = () => {
  if (!accountName.value.trim()) return;

  isSubmitting.value = true;
  accountNamePromptDialog.submit(accountName.value.trim().toLowerCase());
  accountName.value = '';
  isSubmitting.value = false;
};

const handleCancel = () => {
  accountName.value = '';
  accountNamePromptDialog.cancel();
};

const handleOpenChange = (open: boolean) => {
  if (!open)
    handleCancel();
};

const handleKeydown = (event: KeyboardEvent) => {
  if (event.key === 'Enter' && accountName.value.trim())
    handleSubmit();
};
</script>

<template>
  <Dialog
    :open="accountNamePromptDialog.isOpen.value"
    @update:open="handleOpenChange"
  >
    <DialogContent class="sm:max-w-md">
      <DialogHeader>
        <DialogTitle class="flex items-center gap-2">
          <User class="w-5 h-5 text-primary" />
          Hive Account Name Required
        </DialogTitle>
        <DialogDescription>
          Enter your Hive account name to check for an existing wallet on Google Drive.
        </DialogDescription>
      </DialogHeader>

      <div class="space-y-4 py-4">
        <div class="space-y-2">
          <Label for="accountName">Account Name</Label>
          <Input
            id="accountName"
            v-model="accountName"
            type="text"
            placeholder="Enter your Hive account name"
            autocomplete="off"
            @keydown="handleKeydown"
          />
        </div>

        <p class="text-xs text-gray-500 dark:text-gray-400">
          This is the Hive blockchain account name associated with your wallet stored in Google Drive.
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
          :disabled="!accountName.trim() || isSubmitting"
          @click="handleSubmit"
        >
          <Loader2
            v-if="isSubmitting"
            class="w-4 h-4 animate-spin mr-2"
          />
          {{ isSubmitting ? 'Checking...' : 'Continue' }}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
