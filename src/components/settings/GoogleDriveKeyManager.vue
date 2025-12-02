<script setup lang="ts">
import type { TRole } from '@hiveio/wax';
import { KeyRound, Plus, Trash2, AlertTriangle, Check, Loader2 } from 'lucide-vue-next';
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
import { useGoogleDriveWallet } from '@/composables/useGoogleDriveWallet';
import { useSettingsStore } from '@/stores/settings.store';

const googleDrive = useGoogleDriveWallet();
const settingsStore = useSettingsStore();

// State
const isLoading = ref(true);
const isAuthenticated = ref(false);
const walletExists = ref(false);
const accountName = ref<string | undefined>();
const configuredRoles = ref<TRole[]>([]);

// Dialog state
const showAddDialog = ref(false);
const showDeleteWalletDialog = ref(false);
const selectedRole = ref<TRole | null>(null);
const newPrivateKey = ref('');
const isProcessing = ref(false);

// Available roles
const allRoles: TRole[] = ['posting', 'active', 'owner', 'memo'];

const availableRolesToAdd = computed(() =>
  allRoles.filter(role => !configuredRoles.value.includes(role))
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
  isLoading.value = true;
  try {
    isAuthenticated.value = await googleDrive.checkAuth();

    if (isAuthenticated.value) {
      const savedAccountName = settingsStore.settings.account;
      if (!savedAccountName) {
        walletExists.value = false;
        return;
      }

      // First check if wallet exists by trying to load any role
      const info = await googleDrive.getWalletInfo(savedAccountName, 'posting');
      walletExists.value = info.exists;
      accountName.value = info.accountName;

      if (walletExists.value)
        // Get all configured roles by probing each one individually
        configuredRoles.value = await googleDrive.getAllConfiguredRoles(savedAccountName);
      else
        configuredRoles.value = [];
    }
  } catch {
    // User will see "not authenticated" state
  } finally {
    isLoading.value = false;
  }
};

// Add key dialog
const openAddDialog = (role: TRole) => {
  selectedRole.value = role;
  newPrivateKey.value = '';
  showAddDialog.value = true;
};

const closeAddDialog = () => {
  showAddDialog.value = false;
  selectedRole.value = null;
  newPrivateKey.value = '';
};

const handleAddKey = async () => {
  if (!selectedRole.value || !newPrivateKey.value.trim() || !accountName.value) return;

  isProcessing.value = true;
  try {
    await googleDrive.addKey(accountName.value, selectedRole.value, newPrivateKey.value.trim());
    toast.success(`${selectedRole.value} key added successfully`);
    closeAddDialog();
    await loadWalletInfo();
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to add key';
    toast.error(message);
  } finally {
    isProcessing.value = false;
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
  isProcessing.value = true;
  try {
    // Clear localStorage encryption key
    googleDrive.clearEncryptionKey();

    // Clear settings account
    settingsStore.settings.account = undefined;

    // If authenticated with Google, try to delete from Drive
    if (isAuthenticated.value) {
      try {
        await $fetch('/api/google-drive/delete-wallet', { method: 'DELETE' });
      } catch (error) {
        // Ignore Drive deletion errors - local data is cleared anyway
        // eslint-disable-next-line no-console
        console.warn('Failed to delete from Google Drive:', error);
      }
    }

    toast.success('Wallet data cleared successfully');
    closeDeleteWalletDialog();

    // Reset state
    walletExists.value = false;
    accountName.value = undefined;
    configuredRoles.value = [];
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to delete wallet';
    toast.error(message);
  } finally {
    isProcessing.value = false;
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
    <div
      v-if="isLoading"
      class="flex items-center justify-center py-8"
    >
      <Loader2 class="w-6 h-6 animate-spin text-gray-400" />
    </div>

    <!-- Not authenticated -->
    <Alert
      v-else-if="!isAuthenticated"
      variant="warning"
    >
      <AlertTriangle class="w-4 h-4" />
      <AlertTitle>Not Connected</AlertTitle>
      <AlertDescription>
        Connect your Google account in the "Google Drive Sync" section above to manage wallet keys.
      </AlertDescription>
    </Alert>

    <!-- No wallet -->
    <Alert
      v-else-if="!walletExists"
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
          <span class="font-mono font-medium">@{{ accountName }}</span>
        </div>
      </div>

      <!-- Key list -->
      <div class="space-y-2">
        <p class="text-sm font-medium text-gray-700 dark:text-gray-300">
          Configured Keys
        </p>

        <!-- Configured roles -->
        <div
          v-for="role in configuredRoles"
          :key="role"
          class="flex items-center justify-between p-3 border border-gray-200 dark:border-gray-700 rounded-lg"
        >
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
              <span class="text-sm">Configured</span>
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
            Add {{ selectedRole }} Key
          </DialogTitle>
          <DialogDescription>
            {{ selectedRole ? roleDescriptions[selectedRole] : '' }}
          </DialogDescription>
        </DialogHeader>

        <div class="space-y-4 py-4">
          <div class="space-y-2">
            <Label for="privateKey">Private Key</Label>
            <Input
              id="privateKey"
              v-model="newPrivateKey"
              type="password"
              placeholder="Enter your private key"
              autocomplete="off"
            />
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
            :disabled="isProcessing"
            @click="closeAddDialog"
          >
            Cancel
          </Button>
          <Button
            :disabled="!newPrivateKey.trim() || isProcessing"
            @click="handleAddKey"
          >
            <Loader2
              v-if="isProcessing"
              class="w-4 h-4 animate-spin"
            />
            {{ isProcessing ? 'Adding...' : 'Add Key' }}
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
            This will clear your local wallet data{{ isAuthenticated ? ' and delete the encrypted file from Google Drive' : '' }}.
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
            <li v-if="isAuthenticated">Delete the encrypted wallet file from Google Drive</li>
          </ul>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            :disabled="isProcessing"
            @click="closeDeleteWalletDialog"
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            :disabled="isProcessing"
            @click="handleDeleteWallet"
          >
            <Loader2
              v-if="isProcessing"
              class="w-4 h-4 animate-spin"
            />
            {{ isProcessing ? 'Deleting...' : 'Delete Wallet' }}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </div>
</template>
