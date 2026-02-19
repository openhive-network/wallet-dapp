<script setup lang="ts">
import type { TRole } from '@hiveio/wax';
import { Eye, EyeOff, Loader2, Plus, UserPlus } from 'lucide-vue-next';
import { ref } from 'vue';
import { toast } from 'vue-sonner';

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
import { useGoogleDriveWallet } from '@/composables/useGoogleDriveWallet';
import { toastError } from '@/utils/parse-error';

const props = defineProps<{
  open: boolean;
}>();

const emit = defineEmits<{
  'update:open': [value: boolean];
  accountAdded: [accountName: string];
}>();

const googleDrive = useGoogleDriveWallet();

const accountName = ref('');
const privateKey = ref('');
const selectedRole = ref<TRole>('posting');
const showPrivateKey = ref(false);
const isSaving = ref(false);

const allRoles: TRole[] = ['posting', 'active', 'owner', 'memo'];

const resetForm = () => {
  accountName.value = '';
  privateKey.value = '';
  selectedRole.value = 'posting';
  showPrivateKey.value = false;
};

const handleClose = () => {
  resetForm();
  emit('update:open', false);
};

const handleAdd = async () => {
  const account = accountName.value.trim().toLowerCase();
  const key = privateKey.value.trim();
  if (!account || !key) return;

  isSaving.value = true;
  try {
    await googleDrive.addKey(account, selectedRole.value, key);
    toast.success(`Account @${account} added with ${selectedRole.value} key`);
    resetForm();
    emit('accountAdded', account);
    emit('update:open', false);
  } catch (error) {
    toastError('Failed to add account', error);
  } finally {
    isSaving.value = false;
  }
};
</script>

<template>
  <Dialog :open="props.open" @update:open="(v: boolean) => !v && handleClose()">
    <DialogContent class="sm:max-w-md">
      <DialogHeader>
        <DialogTitle class="flex items-center gap-2">
          <UserPlus class="w-5 h-5" />
          Add Hive Account
        </DialogTitle>
        <DialogDescription>
          Add a new Hive account to your wallet with at least one role key.
        </DialogDescription>
      </DialogHeader>

      <div class="space-y-4 py-4">
        <div class="space-y-2">
          <Label for="accountName">Account Name</Label>
          <Input
            id="accountName"
            v-model="accountName"
            placeholder="e.g. alice"
            autocomplete="off"
          />
        </div>

        <div class="space-y-2">
          <Label for="role">Role</Label>
          <div class="flex gap-2 flex-wrap">
            <Button
              v-for="role in allRoles"
              :key="role"
              :variant="selectedRole === role ? 'default' : 'outline'"
              size="sm"
              class="capitalize"
              @click="selectedRole = role"
            >
              {{ role }}
            </Button>
          </div>
        </div>

        <div class="space-y-2">
          <Label for="addAccountPrivateKey">Private Key</Label>
          <div class="relative">
            <Input
              id="addAccountPrivateKey"
              v-model="privateKey"
              :type="showPrivateKey ? 'text' : 'password'"
              placeholder="Enter your private key"
              autocomplete="off"
              class="pr-10"
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              class="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
              @click="showPrivateKey = !showPrivateKey"
            >
              <Eye v-if="!showPrivateKey" class="w-4 h-4 text-gray-500" />
              <EyeOff v-else class="w-4 h-4 text-gray-500" />
            </Button>
          </div>
        </div>

        <Alert variant="warning">
          <AlertDescription>
            Your key will be encrypted and stored securely in Google Drive.
          </AlertDescription>
        </Alert>
      </div>

      <DialogFooter>
        <Button variant="outline" :disabled="isSaving" @click="handleClose">
          Cancel
        </Button>
        <Button
          :disabled="!accountName.trim() || !privateKey.trim() || isSaving"
          @click="handleAdd"
        >
          <Loader2 v-if="isSaving" class="w-4 h-4 animate-spin" />
          <Plus v-else class="w-4 h-4 mr-1" />
          {{ isSaving ? 'Adding...' : 'Add Account' }}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
