<script setup lang="ts">
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from '@/components/ui/label'
import AccountNameInput from "@/components/ui/AccountNameInput.vue";
import { ref, onMounted } from 'vue';
import step1 from "@/assets/icons/wallets/metamask/step1.webp";
import step2 from "@/assets/icons/wallets/metamask/step2.webp";
import { mdiClose } from '@mdi/js';
import { UsedWallet, getWalletIcon } from '@/stores/settings.store';
import { useMetamaskStore } from "@/stores/metamask.store";
import { Combobox, ComboboxAnchor, ComboboxTrigger, ComboboxEmpty, ComboboxGroup, ComboboxInput, ComboboxItem, ComboboxItemIndicator, ComboboxList } from '@/components/ui/combobox';
import { Check, Search } from 'lucide-vue-next';
import { Separator } from '@/components/ui/separator';
import { toastError } from "@/utils/parse-error";
import PublicKey from '@/components/hive/PublicKey.vue';
import { Checkbox } from '@/components/ui/checkbox'
import { getWax } from '@/stores/wax.store';
import type { TRole } from "@hiveio/wax/vite";

const emit = defineEmits(["setaccount", "close"]);

const showUpdateAccountModal = ref(false);
const showCreateAccountModal = ref(false);

const updateAuthType: Record<TRole, boolean> = {
  owner: false,
  active: true,
  posting: true,
  memo: true
};

const close = () => {
  showUpdateAccountModal.value = false;
  showCreateAccountModal.value = false;
  emit("close");
};

const metamaskStore = useMetamaskStore();

const isLoading = ref(false);
const accountName = ref<string | null>(null);
const createAccountNameOperation = ref<string | null>(null);
const updateAccountNameOperation = ref<string | null>(null);
const accountsMatchingKeys = ref<string[] | null>(null);
const metamaskPublicKeys = ref<Array<{ role: string; publicKey: string }> | null>(null);
const isMetamaskConnected = ref<boolean>(false);
const isMetamaskSnapInstalled = ref<boolean>(false);

const applyPublicKeys = async () => {
  isLoading.value = true;
  try {
    const publicKeys = await metamaskStore.metamask!.getPublicKeys("owner", "active", "posting", "memo");

    metamaskPublicKeys.value = [];
    for(const key in publicKeys) {
      if (publicKeys[key as TRole])
        metamaskPublicKeys.value.push({ role: key, publicKey: publicKeys[key as TRole] });
    }

    const wax = await getWax();

    const response = await wax.api.account_by_key_api.get_key_references({
      keys: metamaskPublicKeys.value.map((node: { publicKey: string }) => node.publicKey)
    });

    accountsMatchingKeys.value = [...new Set(response.accounts.flatMap((node: string[]) => node))] as string[];
  } catch (error) {
    toastError("Failed to match Metamask public keys", error);
  } finally {
    isLoading.value = false;
  }
}

const accountNameValid = ref(false);

const onAccountNameValidationChange = (isValid: boolean) => {
  accountNameValid.value = isValid;
};

const connect = async (showError = true) => {
  isLoading.value = true;
  try {
    await metamaskStore.connect(0);

    isMetamaskConnected.value = metamaskStore.isConnected;
    isMetamaskSnapInstalled.value = metamaskStore.isInstalled!;
    if (isMetamaskSnapInstalled.value)
      void applyPublicKeys();
  } catch (error) {
    if (!showError)
      return;

    toastError("Failed to connect to Metamask", error);
  } finally {
    isLoading.value = false;
  };
};

const install = async () => {
  isLoading.value = true;
  try {
    await metamaskStore.install();
    isMetamaskSnapInstalled.value = metamaskStore.isInstalled!;

    if (isMetamaskSnapInstalled.value)
      void applyPublicKeys();
  } catch (error) {
    toastError("Failed to install Metamask Snap", error);
  } finally {
    isLoading.value = false;
  };
}

onMounted(() => {
  void connect(false);
});

const generateAccountUpdateTransaction = async(): Promise<string | void> => {
  try {
    const wax = await getWax();
    const tx = await wax.createTransaction();
    const accountName = updateAccountNameOperation.value!.startsWith('@') ? updateAccountNameOperation.value!.slice(1) : updateAccountNameOperation.value!;
    const { AccountAuthorityUpdateOperation } = await import("@hiveio/wax/vite");
    const op = await AccountAuthorityUpdateOperation.createFor(wax, accountName);
    for(const key in updateAuthType) {
      if (updateAuthType[key as TRole])
        if (key === "memo")
          op.role("memo").set(metamaskPublicKeys.value!.find(node => node.role === key)!.publicKey);
        else
          op.role(key as Exclude<TRole, "memo">).add(metamaskPublicKeys.value!.find(node => node.role === key)!.publicKey);
      }
    tx.pushOperation(op);
    return tx.toApi();
  } catch (error) {
    toastError("Failed to generate account update transaction", error);
  }
};

const hasCopiedCreateSignLink = ref(false);

const getAccountCreateSigningLink = (): string => {
  const accountName = createAccountNameOperation.value!.startsWith('@') ? createAccountNameOperation.value!.slice(1) : createAccountNameOperation.value!;
  hasCopiedCreateSignLink.value = true;
  return `${window.location.protocol}//${window.location.host}/account/create?acc=${accountName}&posting=${
    metamaskPublicKeys.value!.find(node => node.role === "posting")!.publicKey
  }&active=${
    metamaskPublicKeys.value!.find(node => node.role === "active")!.publicKey
  }&owner=${
    metamaskPublicKeys.value!.find(node => node.role === "owner")!.publicKey
  }&memo=${
    metamaskPublicKeys.value!.find(node => node.role === "memo")!.publicKey
  }`;
};

const hasCopiedUpdateSignLink = ref(false);

const getAuthorityUpdateSigningLink = (): string => {
  const accountName = updateAccountNameOperation.value!.startsWith('@') ? updateAccountNameOperation.value!.slice(1) : updateAccountNameOperation.value!;
  const url = new URL(`${window.location.protocol}//${window.location.host}/account/update?acc=${accountName}`);
  for(const key in updateAuthType)
    if (updateAuthType[key as TRole])
      url.searchParams.set(key, metamaskPublicKeys.value!.find(node => node.role === key)!.publicKey);

  hasCopiedUpdateSignLink.value = true;

  return url.toString();
};

const updateAccountName = (value: string | any) => {
  if (!value) return;
  accountName.value = value.startsWith("@") ? value.slice(1) : value;
};
</script>

<template>
  <Card class="w-[350px]">
    <CardHeader>
      <CardTitle>
        <div class="inline-flex justify-between w-full">
          <div class="inline-flex items-center">
            <img :src="getWalletIcon(UsedWallet.METAMASK)" class="w-[20px] mr-2" />
            <span class="mt-[2px]">Metamask Connector</span>
          </div>
          <Button variant="ghost" size="sm" class="px-2" @click="close">
            <svg width="24" height="24" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path style="fill: hsl(var(--foreground))" :d="mdiClose"/></svg>
          </Button>
        </div>
      </CardTitle>
      <CardDescription>Follow these instructions to connect Metamask wallet to your Hive account</CardDescription>
    </CardHeader>
    <CardContent class="text-sm">
      <div v-if="!isMetamaskConnected" class="space-y-4">
        <p>Step 1: Connect your metamask wallet:</p>
        <div class="flex justify-center">
          <Button :disabled="isLoading" variant="outline" size="lg" class="px-8 py-4 border-[#FF5C16] border-[2px]" @click="connect">
            <span class="text-md font-bold">Connect</span>
          </Button>
        </div>
      </div>
      <div v-if="!isMetamaskSnapInstalled && !isLoading" class="space-y-4">
        <p>Step 2: Install our Hive Wallet snap:</p>
        <div class="flex justify-center">
          <Button :disabled="isLoading" variant="outline" size="lg" class="px-8 py-4 border-[#FF5C16] border-[2px]" @click="install">
            <span class="text-md font-bold">Install snap</span>
          </Button>
        </div>
      </div>
      <div v-if="!isMetamaskSnapInstalled && isLoading" class="space-y-4">
        <p>Step 3: Connect to our snap server:</p>
        <div class="flex justify-center">
          <img :src="step1" class="w-[234px] h-[172px] mt-4 border rounded-md p-2 ml-auto mr-auto" />
        </div>
        <p>Step 4: Confirm snap installation:</p>
        <div class="flex justify-center">
          <img :src="step2" class="w-[237px] h-[253px] mt-4 border rounded-md p-2 ml-auto mr-auto" />
        </div>
      </div>
      <div v-if="isMetamaskSnapInstalled">
        <div v-if="accountsMatchingKeys">
          <div v-if="showUpdateAccountModal">
            <p class="mb-4">Step 6: Fill in this form in order to create account update operation, replacing memo public key and adding posting, active and owner keys to your account:</p>
            <AccountNameInput
              v-model="createAccountNameOperation!"
              @validation-change="onAccountNameValidationChange"
              id="wallet_account_name"
              label="New account name"
              placeholder="Enter desired account name"
            />
            <div v-for="key in metamaskPublicKeys" :key="key.publicKey" class="flex items-center p-1">
              <Checkbox :id="`metamask_updateAuth_key-${key.role}`" :defaultValue="updateAuthType[key.role as TRole]" @update:modelValue="value => { updateAuthType[key.role as TRole] = value as boolean }" />
              <label :for="`metamask_updateAuth_key-${key.role}`" class="pl-2 w-full flex items-center">
                <PublicKey :value="key.publicKey" :role="key.role"/>
              </label>
            </div>
            <div class="flex items-center flex-col">
              <Button :disabled="isLoading || !updateAccountNameOperation" :copy="getAuthorityUpdateSigningLink" variant="outline" size="lg" class="mt-4 px-8 py-4 border-[#FF5C16] border-[1px]">
                <span class="text-md font-bold">Copy signing link</span>
              </Button>
              <p v-if="hasCopiedUpdateSignLink" class="mt-4">
                Now send this link to someone who has an account to execute this operation in blockchain
              </p>
              <Separator label="Or" class="mt-8" />
              <div class="flex justify-center mt-4">
                <Button :disabled="isLoading" :copy="generateAccountUpdateTransaction" variant="outline" size="lg" class="px-8 opacity-[0.9] py-4 border-[#FF5C16] border-[1px]">
                  <span class="text-md font-bold">Copy entire transaction</span>
                </Button>
              </div>
            </div>
          </div>
          <div v-else-if="showCreateAccountModal">
            <p class="mb-4">Step 6: Fill in this form in order to prepare the operation to request account creation</p>
            <AccountNameInput
              v-model="createAccountNameOperation!"
              @validation-change="onAccountNameValidationChange"
              id="wallet_account_name"
              label="New account name"
              placeholder="Enter desired account name"
            />
            <div v-for="key in metamaskPublicKeys" :key="key.publicKey">
              <PublicKey :value="key.publicKey" :role="key.role"/>
            </div>
            <div class="flex items-center flex-col">
              <Button :copy="getAccountCreateSigningLink" :disabled="isLoading || !createAccountNameOperation || !accountNameValid" variant="outline" size="lg" class="mt-4 px-8 py-4 border-[#FF5C16] border-[1px]">
                <span class="text-md font-bold">Copy signing link</span>
              </Button>
              <p v-if="hasCopiedCreateSignLink" class="mt-4">
                Now send this link to someone who has an account to execute this operation in blockchain
              </p>
            </div>
          </div>
          <div v-else-if="accountsMatchingKeys.length === 0">
            <p class="mb-2">Step 5: Import <b>at least one</b> Metamask derived key into your Hive account and re-check for Hive Accounts matching those keys:</p>
            <div v-for="key in metamaskPublicKeys" :key="key.publicKey">
              <PublicKey :value="key.publicKey" :role="key.role"/>
            </div>
            <div class="flex justify-center mt-3">
              <Button :disabled="isLoading" @click="showCreateAccountModal = true" variant="outline" size="lg" class="px-8 py-4 border-[#FF5C16] border-[2px]">
                <span class="text-md font-bold">Request account creation</span>
              </Button>
            </div>
            <Separator label="Or" class="mt-8" />
            <div class="flex justify-center mt-4">
              <Button :disabled="isLoading" variant="outline" size="lg" class="px-8 opacity-[0.9] py-4 border-[#FF5C16] border-[1px]" @click="applyPublicKeys">
                <span class="text-md font-bold">Re-check for Hive Accounts</span>
              </Button>
            </div>
            <div class="flex justify-center mt-4">
              <Button :disabled="isLoading" @click="showUpdateAccountModal = true" variant="outline" size="lg" class="px-8 opacity-[0.9] py-4 border-[#FF5C16] border-[1px]">
                <span class="text-md font-bold">Update account authority</span>
              </Button>
            </div>
          </div>
          <div v-else>
            <p>Step 6: Connect your Hive account:</p>
            <div class="mt-2 flex justify-center space-y-2">
              <Combobox by="label" @update:model-value="updateAccountName">
                <ComboboxAnchor>
                  <ComboboxTrigger as-child>
                    <div class="relative w-full max-w-sm items-center">
                      <ComboboxInput class="pl-9" :display-value="(val) => val ? `@${val}` : ''" placeholder="Select account" />
                      <span class="absolute start-0 inset-y-0 flex items-center justify-center px-3">
                        <Search class="size-4 text-muted-foreground" />
                      </span>
                    </div>
                  </ComboboxTrigger>
                </ComboboxAnchor>
                <ComboboxList>
                  <ComboboxEmpty>
                    No account matching keys found.
                  </ComboboxEmpty>
                  <ComboboxGroup>
                    <ComboboxItem
                      v-for="account in accountsMatchingKeys"
                      :key="account"
                      :value="account"
                    >
                      @{{ account }}
                      <ComboboxItemIndicator>
                        <Check class="ml-auto h-4 w-4" />
                      </ComboboxItemIndicator>
                    </ComboboxItem>
                  </ComboboxGroup>
                </ComboboxList>
              </Combobox>
            </div>
            <div class="flex justify-center mt-3" v-if="accountName">
              <Button :disabled="isLoading" variant="outline" size="lg" class="px-8 py-4 border-[#FF5C16] border-[2px]" @click="emit('setaccount', accountName)">
                <span class="text-md font-bold">Import</span>
              </Button>
            </div>
            <Separator label="Or" class="mt-8" />
            <div class="flex justify-center mt-4">
              <Button :disabled="isLoading" variant="outline" size="lg" class="px-8 opacity-[0.9] py-4 border-[#FF5C16] border-[1px]" @click="accountsMatchingKeys = []">
                <span class="text-md font-bold">Import different account</span>
              </Button>
            </div>
          </div>
        </div>
        <div v-else>
          <p>Step 5: Loading on-chain accounts...</p>
          <p>Please wait</p>
        </div>
      </div>
    </CardContent>
    <CardFooter>
    </CardFooter>
  </Card>
</template>
