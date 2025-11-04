<script setup lang="ts">
import { computed } from 'vue';
import { toast } from 'vue-sonner';

import { useSettingsStore } from '@/stores/settings.store';

const settingsStore = useSettingsStore();

const isAuthenticated = computed(() => settingsStore.isGoogleAuthenticated);
const user = computed(() => settingsStore.googleUser);
const isSyncing = computed(() => settingsStore.isSyncing);
const syncEnabled = computed(() => settingsStore.settings.googleDriveSync);
const lastSyncError = computed(() => settingsStore.lastSyncError);

const lastSyncTime = computed(() => {
  if (!settingsStore.settings.lastGoogleSyncTime)
    return 'Never';

  const date = new Date(settingsStore.settings.lastGoogleSyncTime);
  return date.toLocaleString();
});

const handleLogin = () => {
  settingsStore.loginWithGoogle();
};

const handleLogout = async () => {
  try {
    await settingsStore.logoutFromGoogle();
    toast.success('Logged out from Google');
  } catch (_error) {
    toast.error('Failed to logout from Google');
  }
};

const handleToggleSync = (enabled: boolean) => {
  settingsStore.toggleGoogleDriveSync(enabled);

  if (enabled)
    toast.success('Google Drive sync enabled');
  else
    toast.info('Google Drive sync disabled');
};

const handleManualSync = async () => {
  try {
    await settingsStore.syncToGoogleDrive();
    toast.success('Settings synced to Google Drive');
  } catch (_error) {
    toast.error('Failed to sync settings');
  }
};

const handleManualLoad = async () => {
  try {
    await settingsStore.syncFromGoogleDrive();
    toast.success('Settings loaded from Google Drive');
  } catch (_error) {
    toast.error('Failed to load settings');
  }
};

const clearError = () => {
  settingsStore.clearSyncError();
};
</script>

<template>
  <div class="space-y-4 p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
    <div class="flex items-center justify-between">
      <div>
        <h3 class="text-lg font-semibold">
          Google Drive Sync
        </h3>
        <p class="text-sm text-gray-600 dark:text-gray-400">
          Sync your settings across devices
        </p>
      </div>

      <!-- Login/Logout button -->
      <button
        v-if="!isAuthenticated"
        class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        @click="handleLogin"
      >
        Connect Google
      </button>
      <button
        v-else
        class="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
        @click="handleLogout"
      >
        Disconnect
      </button>
    </div>

    <!-- Authenticated section -->
    <div
      v-if="isAuthenticated"
      class="space-y-4"
    >
      <!-- User info -->
      <div class="flex items-center space-x-3 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
        <img
          v-if="user?.picture"
          :src="user.picture"
          :alt="user.name"
          class="w-10 h-10 rounded-full"
        >
        <div class="flex-1">
          <p class="font-medium">
            {{ user?.name }}
          </p>
          <p class="text-sm text-gray-600 dark:text-gray-400">
            {{ user?.email }}
          </p>
        </div>
      </div>

      <!-- Sync toggle -->
      <div class="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
        <div>
          <p class="font-medium">
            Auto-sync
          </p>
          <p class="text-sm text-gray-600 dark:text-gray-400">
            Automatically sync settings to Google Drive
          </p>
        </div>
        <label class="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            class="sr-only peer"
            :checked="syncEnabled"
            @change="handleToggleSync(($event.target as HTMLInputElement).checked)"
          >
          <div
            class="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"
          />
        </label>
      </div>

      <!-- Manual sync buttons -->
      <div class="flex gap-2">
        <button
          class="flex-1 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          :disabled="isSyncing"
          @click="handleManualLoad"
        >
          {{ isSyncing ? 'Syncing...' : 'Load from Drive' }}
        </button>
        <button
          class="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          :disabled="isSyncing"
          @click="handleManualSync"
        >
          {{ isSyncing ? 'Syncing...' : 'Save to Drive' }}
        </button>
      </div>

      <!-- Last sync info -->
      <div class="text-sm text-gray-600 dark:text-gray-400">
        <p>Last sync: {{ lastSyncTime }}</p>
      </div>

      <!-- Error display -->
      <div
        v-if="lastSyncError"
        class="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg"
      >
        <div class="flex items-start justify-between">
          <div>
            <p class="font-medium text-red-800 dark:text-red-200">
              Sync Error
            </p>
            <p class="text-sm text-red-600 dark:text-red-400">
              {{ lastSyncError }}
            </p>
          </div>
          <button
            class="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-200"
            @click="clearError"
          >
            ×
          </button>
        </div>
      </div>

      <!-- Info -->
      <div class="text-xs text-gray-500 dark:text-gray-400 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
        <p class="font-medium mb-1">
          How it works:
        </p>
        <ul class="list-disc list-inside space-y-1">
          <li>Settings are stored in Google Drive's AppData folder (hidden from you)</li>
          <li>Auto-sync saves after every change if enabled</li>
          <li>Manual sync lets you control when to save/load</li>
          <li>Your data is private and only accessible by this app</li>
        </ul>
      </div>
    </div>
  </div>
</template>
