<script setup lang="ts">
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { mdiAccountPlusOutline } from '@mdi/js';
import { computed, ref } from 'vue';
import { toastError } from '@/utils/parse-error';
import { getWax } from '@/stores/wax.store';
import { useWalletStore } from '@/stores/wallet.store';
import { useMetamaskStore } from '@/stores/metamask.store';
import type { TRole } from '@hiveio/wax/vite';
import { toast } from 'vue-sonner';

const walletStore = useWalletStore();
const metamaskStore = useMetamaskStore();

const publicKeys = ref<Record<TRole, string>>({
  owner: "",
  active: "",
  posting: "",
  memo: ""
});
const accountNameValid = ref(false);
const createAccountNameOperation = ref('');

const isLoading = ref(false);
const hasCopiedCreateSignLink = ref(false);

const validateAccountName = async() => {
  try {
    if(!createAccountNameOperation.value)
      return accountNameValid.value = false;

    const accountName = createAccountNameOperation.value.startsWith("@") ? createAccountNameOperation.value.slice(1) : createAccountNameOperation.value;
    if (!accountName)
      return accountNameValid.value = false;

    const wax = await getWax();
    return accountNameValid.value = wax.isValidAccountName(accountName);
  } catch (error) {
    toastError("Failed to validate account name", error);
  }
}

const parseMetamaskPublicKeys = async() => {
  const toastToDismiss = toast.loading("Metamask detected. Parsing public keys...");

  try {
    isLoading.value = true;

    try {
      await metamaskStore.connect();
    } catch {
      toast.error("Metamask is not installed or not connected");

      return;
    }

    const { publicKeys: metamaskPublicKeys } = await metamaskStore.call("hive_getPublicKeys", {
      keys: [{
        role: "owner"
      },{
        role: "active"
      },{
        role: "posting"
      },{
        role: "memo"
      }]
    }) as any;

    for(const publicKey of metamaskPublicKeys)
      publicKeys.value[publicKey.role as TRole] = publicKey.publicKey;

    toast.success("Successfully parsed Metamask public keys");
  } catch (error) {
    toastError("Failed to parse Metamask public keys", error);

    throw error; // Make sure this method throws to handle sonner toast properly
  } finally {
    isLoading.value = false;

    toast.dismiss(toastToDismiss);
  }
};

const hasMetamaskWithSnap = computed(() => walletStore.walletsStatus.metamask && metamaskStore.isInstalled);

if(hasMetamaskWithSnap)
  void parseMetamaskPublicKeys();

const getAccountCreateSigningLink = (): string => {
  const accountName = createAccountNameOperation.value!.startsWith('@') ? createAccountNameOperation.value!.slice(1) : createAccountNameOperation.value!;
  hasCopiedCreateSignLink.value = true;
  return `${window.location.protocol}//${window.location.host}/account/create?acc=${accountName}&${Object.values(publicKeys.value).map((key, index) => `key${index + 1}=${key}`).join('&')}`;
};
</script>

<template>
  <Card class="w-full max-w-[600px]">
    <CardHeader>
      <CardTitle class="inline-flex items-center justify-between">
        <span>Request account creation</span>
        <svg width="20" height="20" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path style="fill: hsla(var(--foreground) / 80%)" :d="mdiAccountPlusOutline"/></svg>
      </CardTitle>
      <CardDescription class="mr-8">Fill in this form in order to prepare the operation to request account creation</CardDescription>
    </CardHeader>
    <CardContent>
      <div class="space-y-4" v-if="hasMetamaskWithSnap">
        <div class="grid mb-2 w-full items-center gap-1.5">
          <Label for="metamask_createAuth_account_card">New account name</Label>
          <Input class="w-full" v-model="createAccountNameOperation!" @update:model-value="validateAccountName()" id="metamask_createAuth_account_card" />
          <span class="text-red-400" v-if="createAccountNameOperation && !accountNameValid">Invalid account name</span>
        </div>
        <div v-for="(_key, role) in publicKeys" :key="role" class="grid mb-2 w-full items-center gap-1.5">
          <Label :for="`metamask_createAuth_account_key_${role}_card`">{{ role[0].toUpperCase() }}{{ role.slice(1) }} key</Label>
          <Input class="w-full" v-model="publicKeys[role]" :id="`metamask_createAuth_account_key_${role}_card`" />
        </div>
        <Button :copy="getAccountCreateSigningLink" :disabled="isLoading || !createAccountNameOperation || !accountNameValid">
          <span class="text-md font-bold">Copy signing link</span>
        </Button>
        <p v-if="hasCopiedCreateSignLink">
          Now send this link to someone who has an account to execute this operation in blockchain
        </p>
      </div>
      <div v-else class="space-y-4">
        <div class="bg-orange-100 border-l-4 border-orange-500 text-orange-700 p-4" role="alert">
          <p class="font-bold">Wallet required</p>
          <p>You have to connect to Metamask wallet before continuing!</p>
        </div>
        <Button @click="walletStore.openWalletSelectModal()" class="w-full font-bold">
          Connect to Metamask wallet
        </Button>
      </div>
    </CardContent>
  </Card>
</template>