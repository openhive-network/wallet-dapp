<script setup lang="ts">
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { mdiMessageLockOutline } from '@mdi/js';
import { ref, computed } from 'vue';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useWalletStore } from '@/stores/wallet.store';
import { getWax } from '@/stores/wax.store';
import { useSettingsStore } from '@/stores/settings.store';
import { toastError } from '@/utils/parse-error';

const walletStore = useWalletStore();
const settingsStore = useSettingsStore();

const hasWallet = computed(() => walletStore.hasWallet);
const wallet = computed(() => walletStore.wallet);

const isEncrypt = ref(false);
const isLoading = ref(false);
const encryptForKey = ref('');
const inputData = ref('');
const outputData = ref('');

const getMemoKeyForUser = async(user: string): Promise<string | void> => {
  const accountName = user.startsWith('@') ? user.slice(1) : user;
  try {
    const wax = await getWax();
    const response = await wax.api.database_api.find_accounts({
      accounts: [accountName],
      delayed_votes_active: true
    });
    return response.accounts[0].memo_key;
  } catch (error) {
    toastError(`Error retrieving memo key for account: @${accountName}`, error);
  }
}

const useMyMemoKey = async () => {
  try {
    isLoading.value = true;

    if (!hasWallet.value)
      await walletStore.openWalletSelectModal();

    const key = await getMemoKeyForUser(settingsStore.account!);
    if (key)
      encryptForKey.value = key;
  } finally {
    isLoading.value = false;
  }
}

const encryptOrDecrypt = async () => {
  try {
    isLoading.value = true;

    if (!hasWallet.value)
      await walletStore.openWalletSelectModal();

    if (isEncrypt.value) {
      let publicKey: string;
      let accountOrKey = encryptForKey.value;
      if (accountOrKey.startsWith('STM')) {
        publicKey = accountOrKey;
      } else {
        const key = await getMemoKeyForUser(accountOrKey);
        if (!key) return;
        publicKey = key;
      }
      outputData.value = await wallet.value!.encrypt(inputData.value, publicKey);
    } else {
      outputData.value = await wallet.value!.decrypt(inputData.value);
    }
  } catch (error) {
    toastError(`Error ${isEncrypt.value ? 'encrypting' : 'decrypting'} memo`, error);
  } finally {
    isLoading.value = false;
  }
};
</script>

<template>
  <Card class="w-full max-w-[600px]">
    <CardHeader>
      <CardTitle class="inline-flex items-center justify-between">
        <span>Memo encryption</span>
        <svg width="20" height="20" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path style="fill: hsla(var(--foreground) / 80%)" :d="mdiMessageLockOutline"/></svg>
      </CardTitle>
      <CardDescription class="mr-8">Use this module to encrypt / decrypt given message using your memo key for any purpose</CardDescription>
    </CardHeader>
    <CardContent>
      <Tabs default-value="decrypt" @update:model-value="value => isEncrypt = value === 'encrypt'">
        <TabsList>
          <TabsTrigger value="decrypt">
            Decrypt
          </TabsTrigger>
          <TabsTrigger value="encrypt">
            Encrypt
          </TabsTrigger>
        </TabsList>
      </Tabs>
      <Textarea v-model="inputData" placeholder="Input" class="my-4" height="200px"/>
      <Input v-model="encryptForKey" v-if="isEncrypt" placeholder="Receiver account or public key" class="mt-4"/>
      <div class="flex mb-4 underline text-sm" v-if="isEncrypt">
        <a @click="useMyMemoKey" class="ml-auto mr-1 cursor-pointer" style="color: hsla(var(--foreground) / 70%)">Use my memo key</a>
      </div>
      <Button :loading="isLoading" :disabled="(!encryptForKey && isEncrypt)" @click="encryptOrDecrypt">{{ isEncrypt ? "Encrypt" : "Decrypt" }}</Button>
      <Textarea v-model="outputData" placeholder="Output" copy-enabled class="my-4" height="200px" disabled/>
    </CardContent>
  </Card>
</template>