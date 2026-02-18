<script setup lang="ts">
import type { TRole, TPublicKey } from '@hiveio/wax';
import { Check, Key, Loader2, Plus, Trash2, Eye, EyeOff } from 'lucide-vue-next';
import { ref, computed } from 'vue';
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
  accountName: string;
  configuredRoles: TRole[];
  rolePublicKeys: Record<string, string>;
  isLoadingKeys: boolean;
  isRemovingAccount: boolean;
}>();

const emit = defineEmits<{
  reload: [];
  removeAccount: [accountName: string];
}>();

const googleDrive = useGoogleDriveWallet();

const allRoles: TRole[] = ['posting', 'active', 'owner', 'memo'];

const availableRolesToAdd = computed(() =>
  allRoles.filter(role => !props.configuredRoles.includes(role))
);

const roleColors: Record<TRole, string> = {
  posting: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  active: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  owner: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
  memo: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300'
};

const roleDescriptions: Record<TRole, string> = {
  posting: 'Used for social actions: posting, commenting, voting',
  active: 'Used for financial operations: transfers, market orders',
  owner: 'Master key - can change all other keys (use with caution)',
  memo: 'Used for encrypting and decrypting private messages'
};

// Add key dialog
const showAddDialog = ref(false);
const roleToAdd = ref<TRole | null>(null);
const newPrivateKey = ref('');
const showPrivateKey = ref(false);
const isSavingKey = ref(false);

const openAddDialog = (role: TRole) => {
  roleToAdd.value = role;
  newPrivateKey.value = '';
  showPrivateKey.value = false;
  showAddDialog.value = true;
};

const closeAddDialog = () => {
  showAddDialog.value = false;
  roleToAdd.value = null;
  newPrivateKey.value = '';
  showPrivateKey.value = false;
};

const handleAddKey = async () => {
  if (!roleToAdd.value || !newPrivateKey.value.trim()) return;

  isSavingKey.value = true;
  try {
    await googleDrive.addKey(props.accountName, roleToAdd.value, newPrivateKey.value.trim());
    toast.success(`${roleToAdd.value} key added successfully`);
    closeAddDialog();
    emit('reload');
  } catch (error) {
    toastError('Failed to add key', error);
  } finally {
    isSavingKey.value = false;
  }
};

// Delete key dialog
const showDeleteKeyDialog = ref(false);
const roleToDelete = ref<TRole | null>(null);
const isDeletingKey = ref(false);

const openDeleteKeyDialog = (role: TRole) => {
  roleToDelete.value = role;
  showDeleteKeyDialog.value = true;
};

const closeDeleteKeyDialog = () => {
  showDeleteKeyDialog.value = false;
  roleToDelete.value = null;
};

const handleDeleteKey = async () => {
  if (!roleToDelete.value) return;

  isDeletingKey.value = true;
  try {
    const publicKey = props.rolePublicKeys[roleToDelete.value] as TPublicKey | undefined;
    await googleDrive.removeKey(props.accountName, publicKey, roleToDelete.value);
    toast.success(`${roleToDelete.value} key removed successfully`);
    closeDeleteKeyDialog();
    emit('reload');
  } catch (error) {
    toastError('Failed to remove key', error);
  } finally {
    isDeletingKey.value = false;
  }
};
</script>

<template>
  <div class="space-y-4">
    <!-- Account header -->
    <div class="flex items-center justify-between">
      <p class="text-sm font-medium text-muted-foreground">
        @{{ accountName }}
      </p>
      <Button
        variant="ghost"
        size="sm"
        class="text-destructive hover:text-destructive hover:bg-destructive/10 -mr-2"
        :disabled="isRemovingAccount"
        @click="emit('removeAccount', accountName)"
      >
        <Loader2 v-if="isRemovingAccount" class="w-4 h-4 mr-1 animate-spin" />
        <Trash2 v-else class="w-4 h-4 mr-1" />
        {{ isRemovingAccount ? 'Removing...' : 'Remove' }}
      </Button>
    </div>

    <!-- Key list -->
    <div class="space-y-2">
      <p class="hidden sm:block text-sm font-medium text-gray-700 dark:text-gray-300">
        Configured Keys
      </p>

      <!-- Configured roles -->
      <div
        v-for="role in configuredRoles"
        :key="role"
        class="p-3 sm:p-4 border border-gray-200 dark:border-gray-700 rounded-lg space-y-2 sm:space-y-3 bg-white dark:bg-gray-900/50"
      >
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-3">
            <span
              :class="[
                'px-2.5 py-1 text-xs font-medium rounded-full capitalize',
                roleColors[role]
              ]"
            >
              {{ role }}
            </span>
            <div class="flex items-center gap-1.5 text-green-600 dark:text-green-400">
              <Check class="w-4 h-4" />
              <span class="text-sm font-medium">Configured</span>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            class="text-destructive hover:text-destructive hover:bg-destructive/10"
            @click="openDeleteKeyDialog(role)"
          >
            <Trash2 class="w-4 h-4" />
          </Button>
        </div>

        <div v-if="rolePublicKeys[role]" class="space-y-2">
          <div class="flex items-center gap-2">
            <Key class="w-3.5 h-3.5 text-muted-foreground" />
            <span class="text-xs font-medium text-muted-foreground">Public Key</span>
          </div>
          <div class="p-2 sm:p-2.5 bg-muted/50 rounded border border-gray-200 dark:border-gray-700">
            <code class="font-mono text-xs break-all leading-relaxed text-foreground">
              {{ rolePublicKeys[role] }}
            </code>
          </div>
        </div>
      </div>

      <!-- Not configured roles -->
      <div
        v-for="role in availableRolesToAdd"
        :key="role"
        class="flex items-center justify-between p-2.5 sm:p-3 border border-dashed border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50/50 dark:bg-gray-800/50"
      >
        <div class="flex items-center gap-3">
          <span
            class="px-2.5 py-1 text-xs font-medium rounded-full capitalize bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-400"
          >
            {{ role }}
          </span>
          <span class="text-sm text-gray-500 dark:text-gray-400">
            Not configured
          </span>
        </div>
        <Button
          variant="outline"
          size="sm"
          @click="openAddDialog(role)"
        >
          <Plus class="w-4 h-4" />
          Add Key
        </Button>
      </div>
    </div>

    <!-- Add Key Dialog -->
    <Dialog
      :open="showAddDialog"
      @update:open="(open: boolean) => !open && closeAddDialog()"
    >
      <DialogContent class="sm:max-w-md">
        <DialogHeader>
          <DialogTitle class="flex items-center gap-2">
            <Plus class="w-5 h-5" />
            Add {{ roleToAdd }} Key
          </DialogTitle>
          <DialogDescription>
            {{ roleToAdd ? roleDescriptions[roleToAdd] : '' }}
          </DialogDescription>
        </DialogHeader>

        <div class="space-y-4 py-4">
          <div class="space-y-2">
            <Label for="privateKey">Private Key</Label>
            <div class="relative">
              <Input
                id="privateKey"
                v-model="newPrivateKey"
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
              Never share your private keys with anyone.
            </AlertDescription>
          </Alert>
        </div>

        <DialogFooter>
          <Button variant="outline" :disabled="isSavingKey" @click="closeAddDialog">
            Cancel
          </Button>
          <Button :disabled="!newPrivateKey.trim() || isSavingKey" @click="handleAddKey">
            <Loader2 v-if="isSavingKey" class="w-4 h-4 animate-spin" />
            {{ isSavingKey ? 'Adding...' : 'Add Key' }}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <!-- Delete Key Dialog -->
    <Dialog
      :open="showDeleteKeyDialog"
      @update:open="(open: boolean) => !open && closeDeleteKeyDialog()"
    >
      <DialogContent class="sm:max-w-md">
        <DialogHeader>
          <DialogTitle class="flex items-center gap-2 text-destructive">
            <Trash2 class="w-5 h-5" />
            Remove {{ roleToDelete }} Key?
          </DialogTitle>
          <DialogDescription>
            This will remove the {{ roleToDelete }} key from your wallet.
          </DialogDescription>
        </DialogHeader>

        <Alert variant="warning" class="my-4">
          <AlertDescription>
            Make sure you have a backup of this key before removing it.
          </AlertDescription>
        </Alert>

        <div v-if="roleToDelete && rolePublicKeys[roleToDelete]" class="space-y-2">
          <div class="flex items-center gap-2">
            <Key class="w-3.5 h-3.5 text-muted-foreground" />
            <span class="text-xs font-medium text-muted-foreground">Public Key to Remove</span>
          </div>
          <div class="p-2 sm:p-2.5 bg-muted/50 rounded border border-gray-200 dark:border-gray-700">
            <code class="font-mono text-xs break-all leading-relaxed text-foreground">
              {{ rolePublicKeys[roleToDelete] }}
            </code>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" :disabled="isDeletingKey" @click="closeDeleteKeyDialog">
            Cancel
          </Button>
          <Button variant="destructive" :disabled="isDeletingKey" @click="handleDeleteKey">
            <Loader2 v-if="isDeletingKey" class="w-4 h-4 animate-spin" />
            {{ isDeletingKey ? 'Removing...' : 'Remove Key' }}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </div>
</template>
