<script setup lang="ts">
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { mdiAccountPlusOutline } from '@mdi/js';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { useSettingsStore } from '@/stores/settings.store';
import { onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { getWax } from '@/stores/wax.store';
import { useWalletStore } from '@/stores/wallet.store';

const settings = useSettingsStore();

const creator = ref<string>('');
const accountName = ref<string>('');
const memoKey = ref<string>('');
const postingKey = ref<string>('');
const activeKey = ref<string>('');
const ownerKey = ref<string>('');
const postingMetadata = ref<string>('{}');
const enableDelegation = ref<boolean>(false);
const delegationAmount = ref<number>(0);
const createAccountType = ref<"default" | "claimed">("default");

const router = useRouter();
const wallet = useWalletStore();

onMounted(() => {
  creator.value = settings.account ? `@${settings.account}` : '';

  accountName.value = router.currentRoute.value.query.acc as string ?? '';
  memoKey.value = router.currentRoute.value.query.memo as string ?? '';
  postingKey.value = router.currentRoute.value.query.posting as string ?? '';
  activeKey.value = router.currentRoute.value.query.active as string ?? '';
  ownerKey.value = router.currentRoute.value.query.owner as string ?? '';
});

const createAccount = async() => {
  const wax = await getWax();
  const tx = await wax.createTransaction();
  const { median_props: { account_creation_fee } } = await wax.api.database_api.get_witness_schedule({});
  const commonAccountCreateConfig = {
      creator: settings.account!,
      new_account_name: accountName.value.startsWith('@') ? accountName.value.slice(1) : accountName.value,
      memo_key: memoKey.value,
      owner: {
        weight_threshold: 1,
        key_auths: {[ownerKey.value]: 1},
        account_auths: {}
      },
      active: {
        weight_threshold: 1,
        key_auths: {[activeKey.value]: 1},
        account_auths: {}
      },
      posting: {
        weight_threshold: 1,
        key_auths: {[postingKey.value]: 1},
        account_auths: {}
      },
      json_metadata: postingMetadata.value,
      fee: account_creation_fee
    };

  if (createAccountType.value === "claimed") {
    tx.pushOperation({
      create_claimed_account: {
        ...commonAccountCreateConfig,
        extensions: []
      }
    });
    if (enableDelegation.value) {
      tx.pushOperation({
        delegate_vesting_shares: {
          delegator: settings.account!,
          delegatee: accountName.value.startsWith('@') ? accountName.value.slice(1) : accountName.value,
          vesting_shares: wax.vestsCoins(delegationAmount.value)
        }
      });
    }
  } else {
    if (enableDelegation.value) {
      tx.pushOperation({
        account_create_with_delegation: {
          ...commonAccountCreateConfig,
          extensions: [],
          delegation: wax.vestsCoins(delegationAmount.value)
        }
      });
    } else {
      tx.pushOperation({
        account_create: {
          ...commonAccountCreateConfig
        }
      });
    }
  }
  const signature = await wallet.wallet!.signTransaction(tx, "active");
  tx.sign(signature);
  await wax.broadcast(tx);
}
</script>

<template>
  <Card class="w-full max-w-[600px] bg-black/40 backdrop-blur-sm">
    <CardHeader>
      <CardTitle class="inline-flex items-center justify-between">
        <span>Process Account Creation</span>
        <svg width="20" height="20" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path style="fill: hsla(var(--foreground) / 80%)" :d="mdiAccountPlusOutline"/></svg>
      </CardTitle>
      <CardDescription class="mr-8">Use this module to process account creation request sent by other users</CardDescription>
    </CardHeader>
    <CardContent>
      <div class="my-4 space-y-4">
        <div class="grid w-full max-w-sm items-center">
          <Label for="createAccount_creator">Creator Account Name</Label>
          <Input id="createAccount_creator" v-model="creator" class="my-2" disabled />
        </div>
        <div class="grid w-full max-w-sm items-center">
          <Label for="createAccount_accountName">New Account Name</Label>
          <Input id="createAccount_accountName" v-model="accountName" class="my-2" />
        </div>
        <div class="grid w-full max-w-sm items-center">
          <Label for="createAccount_memoKey">Memo Key</Label>
          <Input id="createAccount_memoKey" v-model="memoKey" class="my-2" />
        </div>
        <div class="grid w-full max-w-sm items-center">
          <Label for="createAccount_postingKey">Posting Key</Label>
          <Input id="createAccount_postingKey" v-model="postingKey" class="my-2" />
        </div>
        <div class="grid w-full max-w-sm items-center">
          <Label for="createAccount_activeKey">Active Key</Label>
          <Input id="createAccount_activeKey" v-model="activeKey" class="my-2" />
        </div>
        <div class="grid w-full max-w-sm items-center">
          <Label for="createAccount_ownerKey">Owner Key</Label>
          <Input id="createAccount_ownerKey" v-model="ownerKey" class="my-2" />
        </div>
        <div class="grid w-full max-w-sm items-center">
          <Label for="createAccount_postingMetadata">Posting Metadata</Label>
          <Textarea id="createAccount_postingMetadata" v-model="postingMetadata" class="my-2" />
        </div>
        <div class="flex items-center">
          <Checkbox id="createAccountDelegation" v-model="enableDelegation" />
          <label for="createAccountDelegation" class="pl-2 w-full flex items-center">
            <span class="text-sm">Enable Delegation</span>
          </label>
        </div>
        <div class="grid w-full max-w-sm items-center" v-if="enableDelegation">
          <Label for="createAccount_delegationAmount">Delegation amount</Label>
          <div class="flex items-center space-x-2">
            <Input id="createAccount_delegationAmount" type="number" v-model="delegationAmount" min="0" class="my-2" />
            <span>VESTS</span>
          </div>
        </div>
        <RadioGroup default-value="default" v-model="createAccountType">
          <div class="flex items-center space-x-2">
            <RadioGroupItem id="createAccount_r1" value="default" />
            <Label for="createAccount_r1">Default create</Label>
          </div>
          <div class="flex items-center space-x-2">
            <RadioGroupItem id="createAccount_r3" value="claimed" />
            <Label for="createAccount_r3">Create claimed</Label>
          </div>
        </RadioGroup>
        <Button @click="createAccount">Create account</Button>
        <p>Note: By clicking the above button, the transaction will be created, signed, and broadcasted immediately to the mainnet chain</p>
      </div>
    </CardContent>
  </Card>
</template>