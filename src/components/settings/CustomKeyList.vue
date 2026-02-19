<script setup lang="ts">
import type { IExternalWalletCustomKeyInfo } from '@hiveio/wax-signers-external';
import { Key, Loader2, Plus, Trash2, Eye, EyeOff } from 'lucide-vue-next';
import { ref, onMounted } from 'vue';
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
import { Skeleton } from '@/components/ui/skeleton';
import { useGoogleDriveWallet } from '@/composables/useGoogleDriveWallet';
import { toastError } from '@/utils/parse-error';

const googleDrive = useGoogleDriveWallet();

// State
const customKeys = ref<IExternalWalletCustomKeyInfo[]>([]);
const isLoading = ref(true);

// Add dialog
const showAddDialog = ref(false);
const newAlias = ref('');
const newPrivateKey = ref('');
const newDescription = ref('');
const showPrivateKey = ref(false);
const isSaving = ref(false);

// Delete dialog
const showDeleteDialog = ref(false);
const keyToDelete = ref<IExternalWalletCustomKeyInfo | null>(null);
const isDeleting = ref(false);

const RESERVED_ALIASES = ['posting', 'active', 'owner', 'memo'];

const loadCustomKeys = async () => {
  isLoading.value = true;
  try {
    customKeys.value = await googleDrive.getAllCustomKeys();
  } catch {
    customKeys.value = [];
  } finally {
    isLoading.value = false;
  }
};

const openAddDialog = () => {
  newAlias.value = '';
  newPrivateKey.value = '';
  newDescription.value = '';
  showPrivateKey.value = false;
  showAddDialog.value = true;
};

const closeAddDialog = () => {
  showAddDialog.value = false;
  newAlias.value = '';
  newPrivateKey.value = '';
  newDescription.value = '';
  showPrivateKey.value = false;
};

const handleAddKey = async () => {
  const alias = newAlias.value.trim();
  const privateKey = newPrivateKey.value.trim();
  if (!alias || !privateKey) return;

  if (RESERVED_ALIASES.includes(alias.toLowerCase())) {
    toast.error(`"${alias}" is a reserved name. Use a different alias.`);
    return;
  }

  isSaving.value = true;
  try {
    await googleDrive.addCustomKey(alias, privateKey, newDescription.value.trim() || undefined);
    toast.success(`Custom key "${alias}" added successfully`);
    closeAddDialog();
    await loadCustomKeys();
  } catch (error) {
    toastError('Failed to add custom key', error);
  } finally {
    isSaving.value = false;
  }
};

const openDeleteDialog = (key: IExternalWalletCustomKeyInfo) => {
  keyToDelete.value = key;
  showDeleteDialog.value = true;
};

const closeDeleteDialog = () => {
  showDeleteDialog.value = false;
  keyToDelete.value = null;
};

const handleDeleteKey = async () => {
  if (!keyToDelete.value) return;

  isDeleting.value = true;
  try {
    await googleDrive.removeCustomKey(keyToDelete.value.customAlias);
    toast.success(`Custom key "${keyToDelete.value.customAlias}" removed`);
    closeDeleteDialog();
    await loadCustomKeys();
  } catch (error) {
    toastError('Failed to remove custom key', error);
  } finally {
    isDeleting.value = false;
  }
};

onMounted(() => {
  loadCustomKeys();
});
</script>

<template>
  <div class="space-y-4">
    <div class="flex items-center justify-between">
      <p class="text-sm font-medium text-gray-700 dark:text-gray-300">
        Custom Keys
      </p>
      <Button variant="outline" size="sm" @click="openAddDialog">
        <Plus class="w-4 h-4 mr-1" />
        Add Custom Key
      </Button>
    </div>

    <!-- Loading -->
    <div v-if="isLoading" class="space-y-2">
      <Skeleton class="h-14 w-full rounded-lg" />
      <Skeleton class="h-14 w-full rounded-lg" />
    </div>

    <!-- Empty state -->
    <div v-else-if="customKeys.length === 0" class="text-center py-8">
      <div class="w-12 h-12 mx-auto rounded-full bg-muted flex items-center justify-center mb-3">
        <Key class="w-6 h-6 text-muted-foreground" />
      </div>
      <p class="text-sm text-muted-foreground">
        No custom keys stored yet. Add a general-purpose key to get started.
      </p>
    </div>

    <!-- Custom key list -->
    <div v-else class="space-y-2">
      <div
        v-for="key in customKeys"
        :key="key.customAlias"
        class="p-4 border border-gray-200 dark:border-gray-700 rounded-lg space-y-3 bg-white dark:bg-gray-900/50"
      >
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-3">
            <span class="px-2.5 py-1 text-xs font-medium rounded-full bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">
              {{ key.customAlias }}
            </span>
            <span v-if="key.description" class="text-sm text-muted-foreground">
              {{ key.description }}
            </span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            class="text-destructive hover:text-destructive hover:bg-destructive/10"
            @click="openDeleteDialog(key)"
          >
            <Trash2 class="w-4 h-4" />
          </Button>
        </div>

        <div class="space-y-2">
          <div class="flex items-center gap-2">
            <Key class="w-3.5 h-3.5 text-muted-foreground" />
            <span class="text-xs font-medium text-muted-foreground">Public Key</span>
          </div>
          <div class="p-2.5 bg-muted/50 rounded border border-gray-200 dark:border-gray-700">
            <code class="font-mono text-xs break-all leading-relaxed text-foreground">
              {{ key.publicKey }}
            </code>
          </div>
        </div>
      </div>
    </div>

    <!-- Info box -->
    <div class="text-xs text-gray-500 dark:text-gray-400 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
      <p class="font-medium mb-1">About Custom Keys:</p>
      <p>Custom keys are general-purpose keys not tied to a specific Hive role. They can be used for encryption, signing, or any other purpose your application requires.</p>
    </div>

    <!-- Add Custom Key Dialog -->
    <Dialog
      :open="showAddDialog"
      @update:open="(open: boolean) => !open && closeAddDialog()"
    >
      <DialogContent class="sm:max-w-md">
        <DialogHeader>
          <DialogTitle class="flex items-center gap-2">
            <Plus class="w-5 h-5" />
            Add Custom Key
          </DialogTitle>
          <DialogDescription>
            Store a general-purpose key in your wallet.
          </DialogDescription>
        </DialogHeader>

        <div class="space-y-4 py-4">
          <div class="space-y-2">
            <Label for="alias">Key Alias</Label>
            <Input
              id="alias"
              v-model="newAlias"
              placeholder="e.g. my-signing-key"
              autocomplete="off"
            />
          </div>

          <div class="space-y-2">
            <Label for="customPrivateKey">Private Key</Label>
            <div class="relative">
              <Input
                id="customPrivateKey"
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

          <div class="space-y-2">
            <Label for="description">Description (optional)</Label>
            <Input
              id="description"
              v-model="newDescription"
              placeholder="What is this key used for?"
              autocomplete="off"
            />
          </div>

          <Alert variant="warning">
            <AlertDescription>
              Your key will be encrypted and stored securely in Google Drive.
            </AlertDescription>
          </Alert>
        </div>

        <DialogFooter>
          <Button variant="outline" :disabled="isSaving" @click="closeAddDialog">
            Cancel
          </Button>
          <Button :disabled="!newAlias.trim() || !newPrivateKey.trim() || isSaving" @click="handleAddKey">
            <Loader2 v-if="isSaving" class="w-4 h-4 animate-spin" />
            {{ isSaving ? 'Adding...' : 'Add Key' }}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <!-- Delete Custom Key Dialog -->
    <Dialog
      :open="showDeleteDialog"
      @update:open="(open: boolean) => !open && closeDeleteDialog()"
    >
      <DialogContent class="sm:max-w-md">
        <DialogHeader>
          <DialogTitle class="flex items-center gap-2 text-destructive">
            <Trash2 class="w-5 h-5" />
            Remove "{{ keyToDelete?.customAlias }}"?
          </DialogTitle>
          <DialogDescription>
            This will remove the custom key from your wallet.
          </DialogDescription>
        </DialogHeader>

        <Alert variant="warning" class="my-4">
          <AlertDescription>
            Make sure you have a backup of this key before removing it.
          </AlertDescription>
        </Alert>

        <DialogFooter>
          <Button variant="outline" :disabled="isDeleting" @click="closeDeleteDialog">
            Cancel
          </Button>
          <Button variant="destructive" :disabled="isDeleting" @click="handleDeleteKey">
            <Loader2 v-if="isDeleting" class="w-4 h-4 animate-spin" />
            {{ isDeleting ? 'Removing...' : 'Remove Key' }}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </div>
</template>
