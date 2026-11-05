<script setup lang="ts">
import { mdiLockOutline } from '@mdi/js';
import { Loader2 } from 'lucide-vue-next';
import { computed } from 'vue';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { UsedWallet, useSettingsStore } from '@/stores/settings.store';
import { useWalletStore } from '@/stores/wallet.store';

const settingsStore = useSettingsStore();
const walletStore = useWalletStore();

const isGoogleDriveWallet = computed(() => settingsStore.settings.wallet === UsedWallet.GOOGLE_DRIVE);
</script>

<template>
  <Card data-testid="wallet-locked-card" class="w-full">
    <CardHeader>
      <CardTitle class="inline-flex items-center justify-between">
        <span>Wallet locked</span>
        <svg
          width="20"
          height="20"
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
        ><path
          style="fill: hsla(var(--foreground) / 80%)"
          :d="mdiLockOutline"
        /></svg>
      </CardTitle>
      <CardDescription class="mr-8">
        Account data for @{{ settingsStore.settings.account }} loads once the wallet is unlocked
      </CardDescription>
    </CardHeader>
    <CardContent>
      <div class="space-y-4">
        <div
          v-if="walletStore.isConnecting"
          class="flex items-center gap-2 text-sm text-muted-foreground"
          data-testid="wallet-unlocking"
        >
          <Loader2 class="w-4 h-4 animate-spin" />
          <span>Waiting for the wallet to be unlocked...</span>
        </div>
        <template v-else>
          <p class="text-sm text-muted-foreground">
            {{ isGoogleDriveWallet
              ? 'Enter your recovery password to decrypt the keys stored on Google Drive.'
              : 'Reconnect your wallet to load the account data.' }}
          </p>
          <Button
            data-testid="unlock-wallet-btn"
            class="w-full font-bold"
            @click="walletStore.loadSavedWallet()"
          >
            {{ isGoogleDriveWallet ? 'Unlock wallet' : 'Connect wallet' }}
          </Button>
          <p
            v-if="isGoogleDriveWallet"
            class="text-xs text-muted-foreground"
          >
            Forgot your recovery password? You can
            <NuxtLink
              to="/settings"
              class="keychainify-checked underline hover:text-primary"
            >
              delete the wallet in Settings
            </NuxtLink>
            and create a new one.
          </p>
        </template>
      </div>
    </CardContent>
  </Card>
</template>
