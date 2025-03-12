<script setup lang="ts">
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { mdiAccountPlusOutline } from '@mdi/js';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
  tx.pushOperation({
    account_create: {
      creator: settings.account!,
      new_account_name: accountName.value,
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
    }
  });
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
      <div class="my-4 space-y-2">
        <div class="grid w-full max-w-sm items-center">
          <Label for="createAccount_creator">Account name</Label>
          <Input id="createAccount_creator" v-model="creator" class="my-2" disabled />
        </div>
        <div class="grid w-full max-w-sm items-center">
          <Label for="createAccount_accountName">Account Name</Label>
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
        <Button class="my-2" @click="createAccount">Create account</Button>
      </div>
    </CardContent>
  </Card>
</template>