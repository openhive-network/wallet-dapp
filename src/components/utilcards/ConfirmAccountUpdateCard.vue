<script setup lang="ts">
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { mdiAccountArrowUpOutline } from '@mdi/js';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useSettingsStore } from '@/stores/settings.store';
import { onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { getWax } from '@/stores/wax.store';
import { useWalletStore } from '@/stores/wallet.store';
import { AccountAuthorityUpdateOperation } from '@hiveio/wax';
import { toastError } from '@/lib/parse-error';

const settings = useSettingsStore();

const creator = ref<string>('');
const memoKey = ref<string>('');
const postingKey = ref<string>('');
const activeKey = ref<string>('');
const ownerKey = ref<string>('');

const router = useRouter();
const wallet = useWalletStore();

onMounted(() => {
  creator.value = router.currentRoute.value.query.acc as string ?? (settings.account ? `@${settings.account}` : '');

  memoKey.value = router.currentRoute.value.query.memo as string ?? null;
  postingKey.value = router.currentRoute.value.query.posting as string ?? null;
  activeKey.value = router.currentRoute.value.query.active as string ?? null;
  ownerKey.value = router.currentRoute.value.query.owner as string ?? null;
});

const isLoading = ref<boolean>(false);

const updateAuthority = async() => {
  try {
    isLoading.value = true;

    if (!memoKey.value && !postingKey.value && !activeKey.value && !ownerKey.value)
      throw new Error("Nothing to update");

    const wax = await getWax();
    const tx = await wax.createTransaction();
    const op = await AccountAuthorityUpdateOperation.createFor(wax, creator.value.startsWith('@') ? creator.value.slice(1) : creator.value);
    if (memoKey.value)
      op.role("memo").set(memoKey.value);
    if (postingKey.value)
      op.role("posting").add(postingKey.value);
    if (activeKey.value)
      op.role("active").add(activeKey.value);
    if (ownerKey.value)
      op.role("owner").add(ownerKey.value);
    tx.pushOperation(op);
    const signature = await wallet.wallet!.signTransaction(tx, ownerKey.value ? "owner" : "active");
    tx.sign(signature);
    await wax.broadcast(tx);
  } catch (error) {
    toastError('Error updating authority', error);
  } finally {
    isLoading.value = false;
  }
}
</script>

<template>
  <Card class="w-full max-w-[600px] bg-black/40 backdrop-blur-sm">
    <CardHeader>
      <CardTitle class="inline-flex items-center justify-between">
        <span>Process Authority Update</span>
        <svg width="20" height="20" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path style="fill: hsla(var(--foreground) / 80%)" :d="mdiAccountArrowUpOutline"/></svg>
      </CardTitle>
      <CardDescription class="mr-8">Use this module to process account authority update request sent by Metamask Snap</CardDescription>
    </CardHeader>
    <CardContent>
      <div class="my-4 space-y-2">
        <div class="grid w-full max-w-sm items-center">
          <Label for="updateAuthority_creator">Account To Update</Label>
          <Input id="updateAuthority_creator" v-model="creator" class="my-2" />
        </div>
        <div class="grid w-full max-w-sm items-center">
          <Label for="updateAuthority_memoKey">New Memo Key</Label>
          <Input id="updateAuthority_memoKey" placeholder="Nothing to update" v-model="memoKey" class="my-2" />
        </div>
        <div class="grid w-full max-w-sm items-center">
          <Label for="updateAuthority_postingKey">Add Posting Key</Label>
          <Input id="updateAuthority_postingKey" placeholder="Nothing to add" v-model="postingKey" class="my-2" />
        </div>
        <div class="grid w-full max-w-sm items-center">
          <Label for="updateAuthority_activeKey">Add Active Key</Label>
          <Input id="updateAuthority_activeKey" placeholder="Nothing to add" v-model="activeKey" class="my-2" />
        </div>
        <div class="grid w-full max-w-sm items-center">
          <Label for="updateAuthority_ownerKey">Add Owner Key</Label>
          <Input id="updateAuthority_ownerKey" placeholder="Nothing to add" v-model="ownerKey" class="my-2" />
        </div>
        <Button class="my-2" @click="updateAuthority" :disabled="isLoading">Update Authority</Button>
        <p>Note: By clicking the above button, the transaction will be created, signed, and broadcasted immediately to the mainnet chain</p>
      </div>
    </CardContent>
  </Card>
</template>