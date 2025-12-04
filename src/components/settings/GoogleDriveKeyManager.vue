<script setup lang="ts">
import type { TRole } from '@hiveio/wax';
import { KeyRound, Plus, Trash2, AlertTriangle, Check, Loader2, Eye, EyeOff, Key } from 'lucide-vue-next';
import { ref, onMounted, computed } from 'vue';
import { toast } from 'vue-sonner';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
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
import { useSettingsStore } from '@/stores/settings.store';

const googleDrive = useGoogleDriveWallet();
const settingsStore = useSettingsStore();

// State
const isLoadingWalletInfo = ref(true);
const isGoogleDriveConnected = ref(false);
const hasGoogleDriveWallet = ref(false);
const hiveAccountName = ref<string | undefined>();
const availableKeyRoles = ref<TRole[]>([]);
const rolePublicKeys = ref<Record<TRole, string>>({} as Record<TRole, string>);

// Dialog state
const showAddDialog = ref(false);
const showDeleteWalletDialog = ref(false);
const roleToAdd = ref<TRole | null>(null);
const newPrivateKey = ref('');
const showPrivateKey = ref(false);
const isSavingKey = ref(false);

// Available roles
const allRoles: TRole[] = ['posting', 'active', 'owner', 'memo'];

const availableRolesToAdd = computed(() =>
  allRoles.filter(role => !availableKeyRoles.value.includes(role))
);

const roleDescriptions: Record<TRole, string> = {
  posting: 'Used for social actions: posting, commenting, voting',
  active: 'Used for financial operations: transfers, market orders',
  owner: 'Master key - can change all other keys (use with caution)',
  memo: 'Used for encrypting and decrypting private messages'
};

const roleColors: Record<TRole, string> = {
  posting: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  active: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  owner: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
  memo: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300'
};

// Load wallet info
const loadWalletInfo = async () => {
  isLoadingWalletInfo.value = true;
  try {
    isGoogleDriveConnected.value = await googleDrive.checkAuth();

    if (isGoogleDriveConnected.value) {
      const savedAccountName = settingsStore.settings.account;
      if (!savedAccountName) {
        hasGoogleDriveWallet.value = false;
        return;
      }

      // First check if wallet exists by trying to load any role
      const info = await googleDrive.getWalletInfo(savedAccountName, 'posting');
      hasGoogleDriveWallet.value = info.exists;
      hiveAccountName.value = info.accountName;

      if (hasGoogleDriveWallet.value) {
        // Get all configured roles by probing each one individually
        availableKeyRoles.value = await googleDrive.getAllConfiguredRoles(savedAccountName);

        // Get public keys for each configured role
        const publicKeysMap: Record<TRole, string> = {} as Record<TRole, string>;
        for (const role of availableKeyRoles.value) {
          try {
            const keyInfo = await googleDrive.getPublicKeyForRole(savedAccountName, role);
            if (keyInfo?.publicKey)
              publicKeysMap[role] = keyInfo.publicKey;
          } catch (_error) {}
        }
        rolePublicKeys.value = publicKeysMap;
      }
      else {
        availableKeyRoles.value = [];
        rolePublicKeys.value = {} as Record<TRole, string>;
      }
    }
  } catch (_error) {
    toast.error('Failed to load wallet information. Please try refreshing the page.');
    isGoogleDriveConnected.value = false;
    hasGoogleDriveWallet.value = false;
  } finally {
    isLoadingWalletInfo.value = false;
  }
};

// Add key dialog
const openAddDialog = (role: TRole) => {
  roleToAdd.value = role;
  newPrivateKey.value = '';
  showAddDialog.value = true;
};

const closeAddDialog = () => {
  showAddDialog.value = false;
  roleToAdd.value = null;
  newPrivateKey.value = '';
  showPrivateKey.value = false;
};

const handleAddKey = async () => {
  if (!roleToAdd.value || !newPrivateKey.value.trim() || !hiveAccountName.value) return;

  isSavingKey.value = true;
  try {
    await googleDrive.addKey(hiveAccountName.value, roleToAdd.value, newPrivateKey.value.trim());
    toast.success(`${roleToAdd.value} key added successfully`);
    closeAddDialog();
    await loadWalletInfo();
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to add key';
    toast.error(message);
  } finally {
    isSavingKey.value = false;
  }
};

// Delete wallet
const openDeleteWalletDialog = () => {
  showDeleteWalletDialog.value = true;
};

const closeDeleteWalletDialog = () => {
  showDeleteWalletDialog.value = false;
};

const handleDeleteWallet = async () => {
  isSavingKey.value = true;
  try {
    // Clear localStorage encryption key
    googleDrive.clearEncryptionKey();

    // Clear settings account
    settingsStore.settings.account = undefined;

    // If authenticated with Google, try to delete from Drive
    if (isGoogleDriveConnected.value) {
      try {
        await $fetch('/api/google-drive/delete-wallet', { method: 'DELETE' });
      } catch (_error) {}
    }

    toast.success('Wallet data cleared successfully');
    closeDeleteWalletDialog();

    // Reset state
    hasGoogleDriveWallet.value = false;
    hiveAccountName.value = undefined;
    availableKeyRoles.value = [];
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to delete wallet';
    toast.error(message);
  } finally {
    isSavingKey.value = false;
  }
};

onMounted(() => {
  loadWalletInfo();
});
</script>

<template>
  <div class="space-y-4 p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-3">
        <div class="p-2 bg-primary/10 rounded-lg">
          <KeyRound class="w-5 h-5 text-primary" />
        </div>
        <div>
          <h3 class="text-lg font-semibold">
            Wallet Keys
          </h3>
          <p class="text-sm text-gray-600 dark:text-gray-400">
            Manage private keys stored in your Google Drive wallet
          </p>
        </div>
      </div>
    </div>

    <!-- Loading state -->
    <div v-if="isLoadingWalletInfo" class="space-y-4">
      <div class="flex items-center gap-3">
        <Skeleton class="h-10 w-10 rounded-lg" />
        <div class="space-y-2">
          <Skeleton class="h-5 w-32" />
          <Skeleton class="h-4 w-64" />
        </div>
      </div>
      <Skeleton class="h-16 w-full rounded-lg" />
      <div class="space-y-2">
        <Skeleton class="h-4 w-40" />
        <Skeleton class="h-14 w-full rounded-lg" />
        <Skeleton class="h-14 w-full rounded-lg" />
        <Skeleton class="h-14 w-full rounded-lg" />
      </div>
    </div>

    <!-- Not authenticated -->
    <Alert
      v-else-if="!isGoogleDriveConnected"
      variant="warning"
    >
      <AlertTriangle class="w-4 h-4" />
      <AlertTitle>Not Connected</AlertTitle>
      <AlertDescription>
        Google Drive connection lost. Please refresh the page or reconnect your Google account.
      </AlertDescription>
    </Alert>

    <!-- No wallet -->
    <Alert
      v-else-if="!hasGoogleDriveWallet"
      variant="info"
    >
      <AlertTriangle class="w-4 h-4" />
      <AlertTitle>No Wallet Found</AlertTitle>
      <AlertDescription>
        You don't have a Google Drive wallet yet. Create one from the wallet selection screen when logging in.
      </AlertDescription>
    </Alert>

    <!-- Wallet exists - show key management -->
    <template v-else>
      <!-- Account info -->
      <div class="p-3 bg-muted rounded-lg">
        <div class="flex items-center gap-2">
          <span class="text-sm text-gray-600 dark:text-gray-400">Account:</span>
          <span class="font-mono font-medium">@{{ hiveAccountName }}</span>
        </div>
      </div>

      <!-- Key list -->
      <div class="space-y-2">
        <p class="text-sm font-medium text-gray-700 dark:text-gray-300">
          Configured Keys
        </p>

        <!-- Configured roles -->
        <div
          v-for="role in availableKeyRoles"
          :key="role"
          class="p-4 border border-gray-200 dark:border-gray-700 rounded-lg space-y-3 bg-white dark:bg-gray-900/50"
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
          </div>

          <div v-if="rolePublicKeys[role]" class="space-y-2">
            <div class="flex items-center gap-2">
              <Key class="w-3.5 h-3.5 text-muted-foreground" />
              <span class="text-xs font-medium text-muted-foreground">Public Key</span>
            </div>
            <div class="p-2.5 bg-muted/50 rounded border border-gray-200 dark:border-gray-700">
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
          class="flex items-center justify-between p-3 border border-dashed border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50/50 dark:bg-gray-800/50"
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

      <!-- Info box -->
      <div class="text-xs text-gray-500 dark:text-gray-400 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
        <p class="font-medium mb-1">
          About Wallet Keys:
        </p>
        <ul class="list-disc list-inside space-y-1">
          <li><strong>Posting:</strong> Social actions (posts, comments, votes)</li>
          <li><strong>Active:</strong> Financial operations (transfers, market)</li>
          <li><strong>Owner:</strong> Master key - use with extreme caution</li>
          <li><strong>Memo:</strong> Encrypt/decrypt private messages</li>
        </ul>
      </div>

      <!-- Delete Wallet Section -->
      <div class="border-t border-gray-200 dark:border-gray-700 pt-4 mt-4">
        <div class="p-3 border border-destructive/30 rounded-lg bg-destructive/5">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm font-medium">Delete Wallet</p>
              <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Clear wallet data and remove file from Google Drive
              </p>
            </div>
            <Button
              variant="destructive"
              size="sm"
              @click="openDeleteWalletDialog"
            >
              <Trash2 class="w-4 h-4 mr-1" />
              Delete
            </Button>
          </div>
        </div>
      </div>
    </template>

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
                <Eye
                  v-if="!showPrivateKey"
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
            <AlertDescription>
              Your key will be encrypted and stored securely in Google Drive.
              Never share your private keys with anyone.
            </AlertDescription>
          </Alert>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            :disabled="isSavingKey"
            @click="closeAddDialog"
          >
            Cancel
          </Button>
          <Button
            :disabled="!newPrivateKey.trim() || isSavingKey"
            @click="handleAddKey"
          >
            <Loader2
              v-if="isSavingKey"
              class="w-4 h-4 animate-spin"
            />
            {{ isSavingKey ? 'Adding...' : 'Add Key' }}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <!-- Delete Wallet Dialog -->
    <Dialog
      :open="showDeleteWalletDialog"
      @update:open="(open: boolean) => !open && closeDeleteWalletDialog()"
    >
      <DialogContent class="sm:max-w-md">
        <DialogHeader>
          <DialogTitle class="flex items-center gap-2 text-destructive">
            <Trash2 class="w-5 h-5" />
            Delete Wallet?
          </DialogTitle>
          <DialogDescription>
            This will clear your local wallet data{{ isGoogleDriveConnected ? ' and delete the encrypted file from Google Drive' : '' }}.
          </DialogDescription>
        </DialogHeader>

        <Alert
          variant="destructive"
          class="my-4"
        >
          <AlertTriangle class="w-4 h-4" />
          <AlertDescription>
            <strong>Warning:</strong> This action cannot be undone. Make sure you have backups of all your private keys before proceeding.
          </AlertDescription>
        </Alert>

        <div class="text-sm text-gray-600 dark:text-gray-400 space-y-2">
          <p>This will:</p>
          <ul class="list-disc list-inside space-y-1 ml-2">
            <li>Clear your locally stored recovery password</li>
            <li>Remove account information from settings</li>
            <li v-if="isGoogleDriveConnected">Delete the encrypted wallet file from Google Drive</li>
          </ul>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            :disabled="isSavingKey"
            @click="closeDeleteWalletDialog"
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            :disabled="isSavingKey"
            @click="handleDeleteWallet"
          >
            <Loader2
              v-if="isSavingKey"
              class="w-4 h-4 animate-spin"
            />
            {{ isSavingKey ? 'Deleting...' : 'Delete Wallet' }}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </div>
</template>
