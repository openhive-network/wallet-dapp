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

const googleDrive = useGoogleDriveWallet();

// State
const isLoading = ref(true);
const isAuthenticated = ref(false);
const walletExists = ref(false);
const accountName = ref<string | undefined>();
const configuredRoles = ref<TRole[]>([]);

// Dialog state
const showAddDialog = ref(false);
const showRemoveDialog = ref(false);
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
      const info = await googleDrive.getWalletInfo();
      walletExists.value = info.exists;
      accountName.value = info.accountName;
      configuredRoles.value = info.roles ?? [];
    }
  } catch {
    // Silently fail - user will see "not authenticated" state
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
  if (!selectedRole.value || !newPrivateKey.value.trim()) return;

  isProcessing.value = true;
  try {
    await googleDrive.addKey(selectedRole.value, newPrivateKey.value.trim());
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

// Remove key dialog
const openRemoveDialog = (role: TRole) => {
  selectedRole.value = role;
  showRemoveDialog.value = true;
};

const closeRemoveDialog = () => {
  showRemoveDialog.value = false;
  selectedRole.value = null;
};

const handleRemoveKey = async () => {
  if (!selectedRole.value) return;

  isProcessing.value = true;
  try {
    await googleDrive.removeKey(selectedRole.value);
    toast.success(`${selectedRole.value} key removed`);
    closeRemoveDialog();
    await loadWalletInfo();
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to remove key';
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
          <Button
            variant="ghost"
            size="sm"
            class="text-destructive hover:text-destructive hover:bg-destructive/10"
            @click="openRemoveDialog(role)"
          >
            <Trash2 class="w-4 h-4" />
            Remove
          </Button>
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
            <AlertTriangle class="w-4 h-4" />
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

    <!-- Remove Key Dialog -->
    <Dialog
      :open="showRemoveDialog"
      @update:open="(open: boolean) => !open && closeRemoveDialog()"
    >
      <DialogContent class="sm:max-w-md">
        <DialogHeader>
          <DialogTitle class="flex items-center gap-2 text-destructive">
            <Trash2 class="w-5 h-5" />
            Remove {{ selectedRole }} Key?
          </DialogTitle>
          <DialogDescription>
            This action cannot be undone. You will need to re-enter the private key if you want to use it again.
          </DialogDescription>
        </DialogHeader>

        <Alert
          variant="destructive"
          class="my-4"
        >
          <AlertTriangle class="w-4 h-4" />
          <AlertDescription>
            Make sure you have a backup of your {{ selectedRole }} private key before removing it.
          </AlertDescription>
        </Alert>

        <DialogFooter>
          <Button
            variant="outline"
            :disabled="isProcessing"
            @click="closeRemoveDialog"
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            :disabled="isProcessing"
            @click="handleRemoveKey"
          >
            <Loader2
              v-if="isProcessing"
              class="w-4 h-4 animate-spin"
            />
            {{ isProcessing ? 'Removing...' : 'Remove Key' }}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </div>
</template>
