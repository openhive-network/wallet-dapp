<script setup lang="ts">
import { mdiSwapHorizontal } from '@mdi/js';
import { ChevronDown, Check } from 'lucide-vue-next';
import { computed, onMounted, ref, watch } from 'vue';
import { useRouter } from 'vue-router';

import hiveLogoUrl from '@/assets/icons/hive.svg';
import cTokensLogoUrl from '@/assets/icons/wallets/ctokens.svg';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useSettingsStore, UsedWallet  } from '@/stores/settings.store';
import { useTokensStore } from '@/stores/tokens.store';
import { useUserStore } from '@/stores/user.store';
import { useWalletStore } from '@/stores/wallet.store';
import { toastError } from '@/utils/parse-error';
import CTokensProvider from '@/utils/wallet/ctokens/signer';
import GoogleDriveWalletProvider from '@/utils/wallet/google-drive/provider';

const settingsStore = useSettingsStore();
const walletStore = useWalletStore();
const userStore = useUserStore();
const tokensStore = useTokensStore();
const router = useRouter();

// Current active account type
const activeAccount = ref<'hive' | 'htm'>('hive');

// Hive account data - check if wallet is actually connected, not just settings exist
const hasHiveAccount = computed(() =>
  settingsStore.settings.account !== undefined &&
  walletStore.hasWallet &&
  !walletStore.isL2Wallet
);

// HTM account data
const hasHTMAccount = computed(() => tokensStore.wallet !== undefined);

// Check if current Hive account uses Google Drive wallet
const isGoogleDriveWallet = computed(() =>
  hasHiveAccount.value && settingsStore.settings.wallet === UsedWallet.GOOGLE_DRIVE
);

// Multi-account: Google Drive accounts available for switching
const googleDriveAccounts = computed(() => settingsStore.settings.googleDriveAccounts ?? []);
const hasMultipleHiveAccounts = computed(() =>
  isGoogleDriveWallet.value && googleDriveAccounts.value.length > 1
);

const isAccountPopoverOpen = ref(false);
const isSwitchingAccount = ref(false);

const switchHiveAccount = async (accountName: string) => {
  if (accountName === settingsStore.settings.account) {
    isAccountPopoverOpen.value = false;
    return;
  }

  isSwitchingAccount.value = true;
  try {
    settingsStore.setActiveGoogleDriveAccount(accountName);
    userStore.resetSettings();

    const settings = {
      account: accountName,
      wallet: UsedWallet.GOOGLE_DRIVE,
      googleDriveAccounts: settingsStore.settings.googleDriveAccounts,
      googleDriveSync: settingsStore.settings.googleDriveSync,
      lastGoogleSyncTime: settingsStore.settings.lastGoogleSyncTime
    };

    await walletStore.createWalletFor(settings, 'posting');
    await userStore.parseUserData(accountName);

    isAccountPopoverOpen.value = false;
  } catch (error) {
    toastError('Failed to switch account', error);
  } finally {
    isSwitchingAccount.value = false;
  }
};

const htmUserMetadata = ref<{
  displayName: string;
  about?: string;
  name?: string;
  profileImage?: string;
  website?: string;
} | undefined>(undefined);

// Determine which account to show by default
const determineActiveAccount = () => {
  // Priority: show HTM if it's the only one or if L2 wallet is active
  if (hasHTMAccount.value && (!hasHiveAccount.value || walletStore.isL2Wallet))
    activeAccount.value = 'htm';
  else if (hasHiveAccount.value)
    activeAccount.value = 'hive';
  else if (hasHTMAccount.value)
    activeAccount.value = 'htm';
};

// Fetch HTM user metadata
const fetchHTMUserData = async () => {
  try {
    if (hasHTMAccount.value)
      htmUserMetadata.value = await tokensStore.getCurrentUserMetadata();
  } catch (_error) {
    // toastError('Error fetching HTM user data', error); // TODO: Reformat this code to better handle edge cases...
  }
};

// Watch for changes in HTM wallet
watch(hasHTMAccount, (hasAccount) => {
  if (hasAccount)
    void fetchHTMUserData();
  else
    htmUserMetadata.value = undefined;

  determineActiveAccount();
});

watch(() => walletStore.isL2Wallet, () => {
  determineActiveAccount();
});

// Switch active account
const switchAccount = (type: 'hive' | 'htm') => {
  activeAccount.value = type;
};

// Connect to Hive
const connectToHive = () => {
  void walletStore.openWalletSelectModal();
};

// Connect to HTM
const connectToHTM = async () => {
  try {
    const hasStoredWallet = await CTokensProvider.hasWallet();

    if (hasStoredWallet)
      walletStore.isProvideWalletPasswordModalOpen = true;
    else
      void router.push('/tokens/register-account');
  } catch (error) {
    toastError('Failed to connect to HTM', error);
  }
};

// Disconnect from Hive
const disconnectFromHive = async () => {
  try {
    // If Google Drive wallet, logout from Google
    if (isGoogleDriveWallet.value)
      await GoogleDriveWalletProvider.logout();

    walletStore.resetWallet();
    userStore.resetSettings();
    settingsStore.resetSettings();
    // If only Hive was connected, also reset tokens
    if (!hasHTMAccount.value)
      await tokensStore.reset();
    // Switch to HTM if available
    if (hasHTMAccount.value)
      activeAccount.value = 'htm';
  } catch (error) {
    toastError('Failed to disconnect from Hive', error);
  }
};

// Disconnect from HTM
const disconnectFromHTM = async () => {
  try {
    await tokensStore.reset();
    htmUserMetadata.value = undefined;
    // Switch to Hive if available
    if (hasHiveAccount.value)
      activeAccount.value = 'hive';
  } catch (error) {
    toastError('Failed to disconnect from HTM', error);
  }
};

onMounted(async () => {
  determineActiveAccount();

  // Check if HTM wallet is available and fetch data
  try {
    const hasWallet = await CTokensProvider.hasWallet();
    if (hasWallet && CTokensProvider.isLoggedIn() && tokensStore.wallet !== undefined)
      await fetchHTMUserData();
  } catch (_error) {
    // Silently fail - user might not have HTM wallet
  }
});

// Currently displayed account info based on active selection
const displayedAccount = computed(() => {
  if (activeAccount.value === 'htm' && hasHTMAccount.value && htmUserMetadata.value) {
    return {
      type: 'htm' as const,
      displayName: htmUserMetadata.value.displayName,
      profileImage: htmUserMetadata.value.profileImage,
      icon: cTokensLogoUrl
    };
  } else if (activeAccount.value === 'hive' && hasHiveAccount.value) {
    return {
      type: 'hive' as const,
      displayName: userStore.userDisplayName || '',
      profileImage: userStore.profileImage,
      icon: hiveLogoUrl
    };
  }

  return null;
});

// Check if user has both accounts
const hasBothAccounts = computed(() => hasHiveAccount.value && hasHTMAccount.value && htmUserMetadata.value);

// Get info about the other account (not currently displayed)
const otherAccount = computed(() => {
  if (!hasBothAccounts.value) return null;

  if (activeAccount.value === 'hive' && htmUserMetadata.value) {
    return {
      type: 'htm' as const,
      displayName: htmUserMetadata.value.displayName,
      profileImage: htmUserMetadata.value.profileImage,
      icon: cTokensLogoUrl
    };
  } else if (activeAccount.value === 'htm') {
    return {
      type: 'hive' as const,
      displayName: userStore.userDisplayName || '',
      profileImage: userStore.profileImage,
      icon: hiveLogoUrl
    };
  }

  return null;
});
</script>

<template>
  <div data-testid="account-switcher" class="inline-flex items-center relative gap-2">
    <!-- Main account display (shown when at least one account is connected) -->
    <div
      v-if="displayedAccount"
      class="inline-flex items-center relative"
    >
      <!-- Account selector popover (multi-account Google Drive) -->
      <Popover v-if="hasMultipleHiveAccounts && displayedAccount.type === 'hive'" v-model:open="isAccountPopoverOpen">
        <PopoverTrigger as-child>
          <button
            class="inline-flex items-center relative cursor-pointer hover:opacity-80 transition-opacity rounded-md px-1 -mx-1"
            :disabled="isSwitchingAccount"
          >
            <Avatar class="w-8 h-8 mr-2 border">
              <AvatarImage
                v-if="displayedAccount.profileImage"
                :src="displayedAccount.profileImage"
              />
              <AvatarFallback>
                {{ displayedAccount.displayName?.slice(1, 3) }}
              </AvatarFallback>
            </Avatar>
            <img
              :src="displayedAccount.icon"
              class="h-[16px] w-[16px] absolute top-5 left-1.5 rounded-full border bg-background"
            >
            <span class="font-bold max-w-[120px] md:max-w-full truncate">
              {{ displayedAccount.displayName }}
            </span>
            <ChevronDown class="w-3.5 h-3.5 ml-0.5 opacity-60 shrink-0" />
          </button>
        </PopoverTrigger>
        <PopoverContent data-testid="account-switcher-content" class="w-56 p-1" align="start">
          <div class="text-xs font-medium text-muted-foreground px-2 py-1.5">
            Hive Accounts
          </div>
          <button
            v-for="account in googleDriveAccounts"
            :key="account"
            class="flex items-center gap-2 w-full px-2 py-1.5 text-sm rounded-md hover:bg-accent transition-colors cursor-pointer"
            :disabled="isSwitchingAccount"
            @click="switchHiveAccount(account)"
          >
            <img
              :src="hiveLogoUrl"
              class="h-4 w-4 shrink-0"
            >
            <span class="truncate font-medium">@{{ account }}</span>
            <Check
              v-if="account === settingsStore.settings.account"
              class="w-3.5 h-3.5 ml-auto text-primary shrink-0"
            />
          </button>
        </PopoverContent>
      </Popover>

      <!-- Single account display (no dropdown) -->
      <template v-else>
        <Avatar class="w-8 h-8 mr-2 border">
          <AvatarImage
            v-if="displayedAccount.profileImage"
            :src="displayedAccount.profileImage"
          />
          <AvatarFallback>
            {{ displayedAccount.displayName?.slice(1, 3) }}
          </AvatarFallback>
        </Avatar>
        <img
          :src="displayedAccount.icon"
          class="h-[16px] w-[16px] absolute top-5 left-5 rounded-full border bg-background"
        >
        <span class="font-bold max-w-[150px] md:max-w-full truncate">
          {{ displayedAccount.displayName }}
        </span>
      </template>

      <!-- Disconnect button -->
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger as-child>
            <Button
              data-testid="account-disconnect-btn"
              variant="ghost"
              size="icon"
              class="h-10 w-10 sm:h-6 sm:w-6 ml-1"
              @click="displayedAccount.type === 'hive' ? disconnectFromHive() : disconnectFromHTM()"
            >
              <svg
                class="w-4 h-4"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
              >
                <path
                  style="fill: hsl(var(--destructive))"
                  d="M19,3H5C3.89,3 3,3.89 3,5V9H5V5H19V19H5V15H3V19A2,2 0 0,0 5,21H19A2,2 0 0,0 21,19V5C21,3.89 20.1,3 19,3M10.08,15.58L11.5,17L16.5,12L11.5,7L10.08,8.41L12.67,11H3V13H12.67L10.08,15.58Z"
                />
              </svg>
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            <span>Disconnect {{ displayedAccount.type === 'hive' ? 'Hive' : 'HTM' }} account</span>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>

    <!-- Account management buttons -->
    <div class="inline-flex items-center gap-1">
      <!-- When both accounts exist: Switch button -->
      <TooltipProvider v-if="hasBothAccounts && otherAccount">
        <Tooltip>
          <TooltipTrigger as-child>
            <Button
              data-testid="account-switch-btn"
              variant="outline"
              size="icon"
              class="h-10 w-10 sm:h-8 sm:w-8 rounded-full"
              @click="switchAccount(otherAccount.type)"
            >
              <svg
                class="w-4 h-4"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
              >
                <path
                  style="fill: hsl(var(--foreground))"
                  :d="mdiSwapHorizontal"
                />
              </svg>
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            <div class="flex items-center gap-2">
              <span>Switch to</span>
              <div class="flex items-center relative">
                <Avatar class="w-5 h-5 border">
                  <AvatarImage
                    v-if="otherAccount.profileImage"
                    :src="otherAccount.profileImage"
                  />
                  <AvatarFallback class="text-xs">
                    {{ otherAccount.displayName?.slice(1, 3) }}
                  </AvatarFallback>
                </Avatar>
                <img
                  :src="otherAccount.icon"
                  class="h-[10px] w-[10px] absolute -bottom-0.5 -right-0.5 rounded-full border bg-background"
                >
              </div>
              <span class="font-semibold">{{ otherAccount.displayName }}</span>
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <!-- When only Hive connected: Add HTM button -->
      <TooltipProvider v-if="hasHiveAccount && !hasHTMAccount">
        <Tooltip>
          <TooltipTrigger as-child>
            <Button
              data-testid="account-connect-htm-btn"
              variant="outline"
              size="icon"
              class="h-10 w-10 sm:h-8 sm:w-8 rounded-full"
              @click="connectToHTM"
            >
              <img
                :src="cTokensLogoUrl"
                class="h-4 w-4"
              >
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            <span>Connect HTM account</span>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <!-- When only HTM connected: Add Hive button -->
      <TooltipProvider v-if="!hasHiveAccount && hasHTMAccount">
        <Tooltip>
          <TooltipTrigger as-child>
            <Button
              data-testid="account-connect-hive-btn"
              variant="outline"
              size="icon"
              class="h-10 w-10 sm:h-8 sm:w-8 rounded-full"
              @click="connectToHive"
            >
              <img
                :src="hiveLogoUrl"
                class="h-4 w-4"
              >
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            <span>Connect Hive account</span>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  </div>
</template>
