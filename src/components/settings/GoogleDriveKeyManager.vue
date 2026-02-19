<script setup lang="ts">
import type { TRole } from '@hiveio/wax';
import { KeyRound, Plus, Trash2, Loader2, Key } from 'lucide-vue-next';
import { ref, onMounted, computed, watch } from 'vue';
import { toast } from 'vue-sonner';

import GoogleDriveConnect from '@/components/onboarding/wallets/google-drive/GoogleDriveConnect.vue';
import AccountKeyList from '@/components/settings/AccountKeyList.vue';
import AddAccountDialog from '@/components/settings/AddAccountDialog.vue';
import CustomKeyList from '@/components/settings/CustomKeyList.vue';
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
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useGoogleDriveWallet } from '@/composables/useGoogleDriveWallet';
import { useSettingsStore, UsedWallet } from '@/stores/settings.store';
import { useUserStore } from '@/stores/user.store';
import { useWalletStore } from '@/stores/wallet.store';
import { toastError } from '@/utils/parse-error';

const googleDrive = useGoogleDriveWallet();
const settingsStore = useSettingsStore();
const walletStore = useWalletStore();
const userStore = useUserStore();

// State
const isLoadingWalletInfo = ref(true);
const isGoogleDriveConnected = ref(false);
const hasGoogleDriveWallet = ref(false);
const isLoadingKeys = ref(false);
const isWalletEmpty = ref(false);

// Multi-account state
const storedAccounts = ref<string[]>([]);
const activeTab = ref('');
const accountRoles = ref<Record<string, TRole[]>>({});
const accountPublicKeys = ref<Record<string, Record<string, string>>>({});

// Dialog state
const showCreateWalletDialog = ref(false);
const showDeleteWalletDialog = ref(false);
const showAddAccountDialog = ref(false);
const isSavingKey = ref(false);
const isRemovingAccount = ref(false);

/**
 * Check if wallet file exists on Google Drive (without loading it)
 */
const checkWalletFileExists = async (): Promise<boolean> => {
  try {
    const response = await $fetch<{ exists: boolean }>('/api/google-drive/check-wallet-file');
    return response.exists;
  } catch {
    return false;
  }
};

/**
 * Load roles and public keys for a specific account
 */
const loadAccountKeys = async (accountName: string) => {
  try {
    const roles = await googleDrive.getAllConfiguredRoles(accountName);
    accountRoles.value[accountName] = roles;

    const publicKeys: Record<string, string> = {};
    for (const role of roles) {
      try {
        const keyInfo = await googleDrive.getPublicKeyForRole(accountName, role);
        if (keyInfo?.publicKey)
          publicKeys[role] = keyInfo.publicKey;
      } catch {}
    }
    accountPublicKeys.value[accountName] = publicKeys;
  } catch {
    accountRoles.value[accountName] = [];
    accountPublicKeys.value[accountName] = {};
  }
};

/**
 * Load wallet info: accounts, roles, keys
 */
const loadWalletInfo = async () => {
  isLoadingWalletInfo.value = true;
  try {
    isGoogleDriveConnected.value = await googleDrive.checkAuth();

    if (!isGoogleDriveConnected.value) {
      hasGoogleDriveWallet.value = false;
      return;
    }

    const walletFileExists = await checkWalletFileExists();

    if (!walletFileExists) {
      hasGoogleDriveWallet.value = false;
      storedAccounts.value = [];
      return;
    }

    hasGoogleDriveWallet.value = true;

    // Check if we have encryption key - if not, try to load wallet which will prompt for password
    if (!googleDrive.hasEncryptionKey()) {
      // Need to load any account to trigger password prompt
      const savedAccount = settingsStore.settings.account;
      if (savedAccount) {
        try {
          await googleDrive.loadWallet(savedAccount);
        } catch {
          // User cancelled or error - show wallet exists but keys not loaded
          storedAccounts.value = [];
          return;
        }
      } else {
        // No saved account and no encryption key - prompt for account name
        try {
          const accountName = await googleDrive.requestAccountName();
          settingsStore.settings.account = accountName;
          settingsStore.saveSettings();
          await googleDrive.loadWallet(accountName);
        } catch {
          storedAccounts.value = [];
          return;
        }
      }
    }

    // Load stored accounts from wallet
    const accounts = await googleDrive.getStoredAccounts();
    storedAccounts.value = accounts;

    // Check if wallet is empty (decrypted successfully but has no accounts/keys)
    isWalletEmpty.value = accounts.length === 0 && googleDrive.hasEncryptionKey();

    // Sync to settings store (replaces account list and handles active account fallback)
    const previousAccount = settingsStore.settings.account;
    settingsStore.syncGoogleDriveAccounts(accounts);

    // If no account was active but wallet has accounts (e.g. after reconnecting), activate the first one
    if (!previousAccount && accounts.length > 0) {
      const firstAccount = accounts[0]!;
      settingsStore.setActiveGoogleDriveAccount(firstAccount);
      await walletStore.createWalletFor({ account: firstAccount, wallet: UsedWallet.GOOGLE_DRIVE }, 'posting');
      await userStore.parseUserData(firstAccount);
    }
    // If active account was removed from wallet, switch wallet + user data
    else if (previousAccount && previousAccount !== settingsStore.settings.account) {
      const newAccount = settingsStore.settings.account;
      if (newAccount) {
        userStore.resetSettings();
        await walletStore.createWalletFor({ account: newAccount, wallet: UsedWallet.GOOGLE_DRIVE }, 'posting');
        await userStore.parseUserData(newAccount);
      } else {
        walletStore.resetWallet();
        userStore.resetSettings();
      }
    }

    // Set active tab
    if (accounts.length > 0 && !activeTab.value)
      activeTab.value = settingsStore.settings.account ?? accounts[0] ?? '';

    // Load keys for all accounts
    for (const account of accounts)
      await loadAccountKeys(account);
  } catch (error) {
    toastError('Failed to load wallet information', error);
    isGoogleDriveConnected.value = false;
    hasGoogleDriveWallet.value = false;
  } finally {
    isLoadingWalletInfo.value = false;
  }
};

const needsPasswordToLoadKeys = computed(() => {
  return hasGoogleDriveWallet.value &&
         storedAccounts.value.length === 0 &&
         !isWalletEmpty.value &&
         !isLoadingWalletInfo.value &&
         !isLoadingKeys.value;
});

const loadKeysManually = async () => {
  isLoadingKeys.value = true;
  try {
    const savedAccount = settingsStore.settings.account;
    if (savedAccount)
      await googleDrive.loadWallet(savedAccount);

    await loadWalletInfo();
    toast.success('Wallet keys loaded successfully');
  } catch (error) {
    toastError('Failed to load wallet keys', error);
  } finally {
    isLoadingKeys.value = false;
  }
};

const handleWalletCreated = async (accountName: string) => {
  showCreateWalletDialog.value = false;
  settingsStore.settings.account = accountName;
  settingsStore.addGoogleDriveAccount(accountName);
  toast.success(`Wallet created for @${accountName}`);
  await loadWalletInfo();
};

const handleCreateDialogClose = () => {
  showCreateWalletDialog.value = false;
};

const handleAccountAdded = async (accountName: string) => {
  const shouldActivate = !settingsStore.settings.account;

  settingsStore.addGoogleDriveAccount(accountName);
  activeTab.value = accountName;
  await loadWalletInfo();

  // If no account was active (e.g. after removing all accounts), activate the new one
  if (shouldActivate) {
    settingsStore.setActiveGoogleDriveAccount(accountName);
    await walletStore.createWalletFor({ account: accountName, wallet: UsedWallet.GOOGLE_DRIVE }, 'posting');
    await userStore.parseUserData(accountName);
  }
};

const handleRemoveAccount = async (accountName: string) => {
  isRemovingAccount.value = true;
  try {
    const wasActiveAccount = settingsStore.settings.account === accountName;

    // Remove all keys for this account
    const roles = accountRoles.value[accountName] ?? [];
    for (const role of roles) {
      const publicKey = accountPublicKeys.value[accountName]?.[role];
      await googleDrive.removeKey(accountName, publicKey, role);
    }

    settingsStore.removeGoogleDriveAccount(accountName);
    toast.success(`Account @${accountName} removed from wallet`);

    // Update local state directly (avoid loadWalletInfo re-adding the account via sync)
    storedAccounts.value = storedAccounts.value.filter(a => a !== accountName);
    const { [accountName]: _roles, ...remainingRoles } = accountRoles.value;
    accountRoles.value = remainingRoles;
    const { [accountName]: _keys, ...remainingKeys } = accountPublicKeys.value;
    accountPublicKeys.value = remainingKeys;
    isWalletEmpty.value = storedAccounts.value.length === 0 && googleDrive.hasEncryptionKey();

    // Switch tab to first remaining account or custom keys
    activeTab.value = storedAccounts.value[0] ?? 'custom-keys';

    // If removed account was the active one, switch wallet + user data to the new active account
    if (wasActiveAccount) {
      const newAccount = settingsStore.settings.account;
      if (newAccount) {
        userStore.resetSettings();
        await walletStore.createWalletFor({ account: newAccount, wallet: UsedWallet.GOOGLE_DRIVE }, 'posting');
        await userStore.parseUserData(newAccount);
      } else {
        walletStore.resetWallet();
        userStore.resetSettings();
      }
    }
  } catch (error) {
    toastError('Failed to remove account', error);
  } finally {
    isRemovingAccount.value = false;
  }
};

const handleDeleteWallet = async () => {
  isSavingKey.value = true;
  try {
    googleDrive.clearEncryptionKey();
    settingsStore.settings.account = undefined;
    settingsStore.settings.googleDriveAccounts = [];
    settingsStore.saveSettings();

    if (isGoogleDriveConnected.value) {
      try {
        await $fetch('/api/google-drive/delete-wallet', { method: 'DELETE' });
      } catch {}
    }

    toast.success('Wallet data cleared successfully');
    showDeleteWalletDialog.value = false;
    hasGoogleDriveWallet.value = false;
    storedAccounts.value = [];
  } catch (error) {
    toastError('Failed to delete wallet', error);
  } finally {
    isSavingKey.value = false;
  }
};

const reloadWalletInfo = () => {
  loadWalletInfo();
};

defineExpose({ reloadWalletInfo });

onMounted(() => {
  loadWalletInfo();
});

watch(() => settingsStore.settings.account, (newAccount) => {
  if (newAccount && storedAccounts.value.includes(newAccount))
    activeTab.value = newAccount;
});
</script>

<template>
  <div class="space-y-4 sm:p-4 sm:border sm:border-gray-200 sm:dark:border-gray-700 sm:rounded-lg">
    <!-- Header -->
    <div class="hidden sm:flex items-center justify-between">
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
      <AlertTitle>Not Connected</AlertTitle>
      <AlertDescription>
        Google Drive connection lost. Please refresh the page or reconnect your Google account.
      </AlertDescription>
    </Alert>

    <!-- No wallet - show friendly prompt to create -->
    <div v-else-if="!hasGoogleDriveWallet" class="flex flex-col items-center justify-center py-8 text-center">
      <div class="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
        <KeyRound class="w-8 h-8 text-primary" />
      </div>
      <h4 class="text-lg font-semibold mb-2">
        No Wallet File Found
      </h4>
      <p class="text-sm text-muted-foreground max-w-sm mb-6">
        Create a new encrypted wallet on your Google Drive to securely store and manage your Hive private keys.
      </p>
      <Button size="lg" @click="showCreateWalletDialog = true">
        <Plus class="w-4 h-4 mr-2" />
        Create Wallet
      </Button>
    </div>

    <!-- Wallet exists - show key management -->
    <template v-else>
      <!-- Wallet exists but keys not loaded - need password -->
      <Alert
        v-if="needsPasswordToLoadKeys"
        class="border-blue-200 bg-blue-50 dark:bg-blue-950/20"
      >
        <AlertTitle class="text-blue-900 dark:text-blue-100">
          Wallet Found on Google Drive
        </AlertTitle>
        <AlertDescription class="text-blue-800 dark:text-blue-200 space-y-3">
          <p>
            Your wallet file exists on Google Drive, but the keys are not loaded yet.
            Enter your recovery password to decrypt and load your keys.
          </p>
          <Button
            size="sm"
            :disabled="isLoadingKeys"
            @click="loadKeysManually"
          >
            <Loader2
              v-if="isLoadingKeys"
              class="w-4 h-4 mr-2 animate-spin"
            />
            <Key
              v-else
              class="w-4 h-4 mr-2"
            />
            {{ isLoadingKeys ? 'Loading Keys...' : 'Load Keys' }}
          </Button>
        </AlertDescription>
      </Alert>

      <!-- Wallet is empty - no keys stored -->
      <div v-if="isWalletEmpty" class="flex flex-col items-center justify-center py-8 text-center">
        <div class="w-16 h-16 rounded-full bg-amber-100 dark:bg-amber-900/20 flex items-center justify-center mb-4">
          <KeyRound class="w-8 h-8 text-amber-600 dark:text-amber-500" />
        </div>
        <h4 class="text-lg font-semibold mb-2">
          Wallet is Empty
        </h4>
        <p class="text-sm text-muted-foreground max-w-sm mb-6">
          Your wallet file exists on Google Drive but has no keys stored. Add an account with keys to start using the wallet.
        </p>
        <Button size="lg" @click="showAddAccountDialog = true">
          <Plus class="w-4 h-4 mr-2" />
          Add Account
        </Button>
      </div>

      <!-- Tabbed account management -->
      <template v-if="storedAccounts.length > 0">
        <Tabs v-model="activeTab" class="w-full">
          <div class="flex items-center justify-between gap-2 mb-2">
            <TabsList class="flex-1 overflow-x-auto sm:flex-none">
              <TabsTrigger
                v-for="account in storedAccounts"
                :key="account"
                :value="account"
              >
                @{{ account }}
              </TabsTrigger>
              <TabsTrigger value="custom-keys">
                Custom Keys
              </TabsTrigger>
            </TabsList>
            <Button variant="outline" size="sm" class="shrink-0" aria-label="Add account" @click="showAddAccountDialog = true">
              <Plus class="w-4 h-4 sm:mr-1" />
              <span class="hidden sm:inline">Add Account</span>
            </Button>
          </div>

          <!-- Account tabs -->
          <TabsContent
            v-for="account in storedAccounts"
            :key="account"
            :value="account"
          >
            <AccountKeyList
              :account-name="account"
              :configured-roles="accountRoles[account] ?? []"
              :role-public-keys="accountPublicKeys[account] ?? {}"
              :is-loading-keys="isLoadingKeys"
              :is-removing-account="isRemovingAccount"
              @reload="loadWalletInfo"
              @remove-account="handleRemoveAccount"
            />
          </TabsContent>

          <!-- Custom Keys tab -->
          <TabsContent value="custom-keys">
            <CustomKeyList />
          </TabsContent>
        </Tabs>
      </template>

      <!-- Info box -->
      <div class="hidden sm:block text-xs text-gray-500 dark:text-gray-400 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
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
      <div class="border-t border-gray-200 dark:border-gray-700 pt-3 sm:pt-4 mt-3 sm:mt-4">
        <div class="sm:p-3 sm:border sm:border-destructive/30 sm:rounded-lg sm:bg-destructive/5">
          <div class="flex items-center justify-between gap-3">
            <div class="min-w-0">
              <p class="text-sm font-medium">Delete Wallet</p>
              <p class="text-xs text-muted-foreground mt-0.5">
                Remove wallet file from Google Drive
              </p>
            </div>
            <Button
              variant="destructive"
              size="sm"
              class="shrink-0"
              @click="showDeleteWalletDialog = true"
            >
              <Trash2 class="w-4 h-4 mr-1" />
              Delete
            </Button>
          </div>
        </div>
      </div>
    </template>

    <!-- Delete Wallet Dialog -->
    <Dialog
      :open="showDeleteWalletDialog"
      @update:open="(open: boolean) => !open && (showDeleteWalletDialog = false)"
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
          <AlertDescription>
            <strong>Warning:</strong> This action cannot be undone. Make sure you have backups of all your private keys before proceeding.
          </AlertDescription>
        </Alert>

        <div class="text-sm text-gray-600 dark:text-gray-400 space-y-2">
          <p>This will:</p>
          <ul class="list-disc list-inside space-y-1 ml-2">
            <li>Clear your locally stored recovery password</li>
            <li>Remove all account information from settings</li>
            <li v-if="isGoogleDriveConnected">
              Delete the encrypted wallet file from Google Drive
            </li>
          </ul>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            :disabled="isSavingKey"
            @click="showDeleteWalletDialog = false"
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

    <!-- Add Account Dialog -->
    <AddAccountDialog
      :open="showAddAccountDialog"
      @update:open="showAddAccountDialog = $event"
      @account-added="handleAccountAdded"
    />

    <!-- Create Wallet Dialog -->
    <Dialog
      :open="showCreateWalletDialog"
      @update:open="(open: boolean) => !open && handleCreateDialogClose()"
    >
      <DialogContent class="sm:max-w-[500px] p-0 border-0 bg-transparent shadow-none [&>button]:hidden">
        <GoogleDriveConnect
          @setaccount="handleWalletCreated"
          @close="handleCreateDialogClose"
        />
      </DialogContent>
    </Dialog>
  </div>
</template>
