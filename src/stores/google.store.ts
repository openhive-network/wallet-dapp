import { defineStore } from 'pinia';

import { toastError } from '@/utils/parse-error';

import type { Settings } from './settings.store';

// Import function to avoid circular dependency
const getSettingsStore = () => import('./settings.store').then(m => m.useSettingsStore);

export interface GoogleUser {
  name: string;
  email: string;
  picture?: string;
}

export const useGoogleStore = defineStore('google', {
  state: () => ({
    googleUser: null as GoogleUser | null,
    isGoogleAuthenticated: false,
    isSyncing: false,
    lastSyncError: null as string | null
  }),
  actions: {
    async checkGoogleAuth () {
      try {
        const response = await $fetch<{
          authenticated: boolean;
          user: GoogleUser | null;
        }>('/api/auth/google/status');
        this.isGoogleAuthenticated = response.authenticated;
        this.googleUser = response.user;
      } catch (_error) {
        this.isGoogleAuthenticated = false;
        this.googleUser = null;
      }
    },

    loginWithGoogle (returnUrl?: string) {
      const currentUrl = returnUrl || window.location.pathname;
      window.location.href = `/api/auth/google/login?returnUrl=${encodeURIComponent(currentUrl)}`;
    },

    async logoutFromGoogle () {
      try {
        await $fetch('/api/auth/google/logout', { method: 'POST' });
        this.isGoogleAuthenticated = false;
        this.googleUser = null;

        // Disable Google Drive sync in settings
        const useSettingsStore = await getSettingsStore();
        const settingsStore = useSettingsStore();
        settingsStore.settings.googleDriveSync = false;
        settingsStore.saveSettings();
      } catch (error) {
        toastError('Failed to logout from Google', error);
        throw error;
      }
    },

    async syncToGoogleDrive (settings: Settings) {
      if (!this.isGoogleAuthenticated)
        return;

      try {
        this.isSyncing = true;
        this.lastSyncError = null;

        await $fetch('/api/google-drive/settings', {
          method: 'POST',
          body: {
            settings,
            timestamp: Date.now()
          }
        });

        return Date.now();
      } catch (error: unknown) {
        const errorMessage = error && typeof error === 'object' && 'data' in error
          ? ((error as { data?: { message?: string } }).data?.message || 'Failed to sync to Google Drive')
          : 'Failed to sync to Google Drive';
        this.lastSyncError = errorMessage;
        toastError('Sync to Google Drive failed', error);
        throw error;
      } finally {
        this.isSyncing = false;
      }
    },

    async syncFromGoogleDrive (): Promise<{ settings?: Settings; timestamp?: number } | null> {
      if (!this.isGoogleAuthenticated)
        return null;

      try {
        this.isSyncing = true;
        this.lastSyncError = null;

        const response = await $fetch<{
          success: boolean;
          data?: { settings?: Settings; timestamp?: number } | null;
          exists: boolean;
        }>('/api/google-drive/settings');

        if (response.exists && response.data?.settings)
          return response.data;

        return null;
      } catch (error: unknown) {
        const errorMessage = error && typeof error === 'object' && 'data' in error
          ? ((error as { data?: { message?: string } }).data?.message || 'Failed to sync from Google Drive')
          : 'Failed to sync from Google Drive';
        this.lastSyncError = errorMessage;
        toastError('Sync from Google Drive failed', error);
        throw error;
      } finally {
        this.isSyncing = false;
      }
    },

    clearSyncError () {
      this.lastSyncError = null;
    },

    resetGoogleAuth () {
      this.googleUser = null;
      this.isGoogleAuthenticated = false;
    }
  }
});
