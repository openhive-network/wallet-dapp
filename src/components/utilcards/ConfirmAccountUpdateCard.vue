<script setup lang="ts">
import { AccountAuthorityUpdateOperation } from '@hiveio/wax';
import { mdiAccountArrowUpOutline } from '@mdi/js';
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { toast } from 'vue-sonner';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useSettingsStore } from '@/stores/settings.store';
import { useWalletStore } from '@/stores/wallet.store';
import { getWax } from '@/stores/wax.store';
import { toastError } from '@/utils/parse-error';

const settings = useSettingsStore();

const creator = ref<string>('');
const memoKey = ref<string>('');
const postingKey = ref<string>('');
const activeKey = ref<string>('');
const ownerKey = ref<string>('');

const router = useRouter();
const wallet = useWalletStore();
const hasWallet = computed(() => wallet.hasWallet);
const settingsStore = useSettingsStore();

onMounted(() => {
  creator.value = router.currentRoute.value.query.acc as string ?? (settings.account ? `@${settings.account}` : '');

  memoKey.value = router.currentRoute.value.query.memo as string ?? null;
  postingKey.value = router.currentRoute.value.query.posting as string ?? null;
  activeKey.value = router.currentRoute.value.query.active as string ?? null;
  ownerKey.value = router.currentRoute.value.query.owner as string ?? null;
});

const isLoading = ref<boolean>(false);

const updateAuthority = async () => {
  try {
    isLoading.value = true;

    if (!hasWallet.value)
      await wallet.openWalletSelectModal();

    if (!memoKey.value && !postingKey.value && !activeKey.value && !ownerKey.value)
      throw new Error('Nothing to update');

    const wax = await getWax();
    const tx = await wax.createTransaction();
    const op = await AccountAuthorityUpdateOperation.createFor(wax, creator.value.startsWith('@') ? creator.value.slice(1) : creator.value);
    if (memoKey.value)
      op.role('memo').set(memoKey.value);
    if (postingKey.value)
      op.role('posting').add(postingKey.value);
    if (activeKey.value)
      op.role('active').add(activeKey.value);
    if (ownerKey.value)
      op.role('owner').add(ownerKey.value);
    tx.pushOperation(op);
    if (ownerKey.value)
      await wallet.createWalletFor(settingsStore.settings, 'owner');
    else
      await wallet.createWalletFor(settingsStore.settings, 'active');
    await wallet.wallet!.signTransaction(tx);
    await wax.broadcast(tx);

    toast.success('Authority updated successfully!');
  } catch (error) {
    toastError('Error updating authority', error);
  } finally {
    isLoading.value = false;
  }
};
</script>

<template>
  <Card data-testid="update-authority-card" class="w-full max-w-[600px]">
    <CardHeader>
      <CardTitle class="inline-flex items-center justify-between">
        <span>Process Authority Update</span>
        <svg
          width="20"
          height="20"
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
        ><path
          style="fill: hsla(var(--foreground) / 80%)"
          :d="mdiAccountArrowUpOutline"
        /></svg>
      </CardTitle>
      <CardDescription class="mr-8">
        Use this module to process account authority update request sent by Metamask Snap
      </CardDescription>
    </CardHeader>
    <CardContent>
      <div class="my-4 space-y-2">
        <div class="grid w-full items-center">
          <Label for="updateAuthority_creator">Account To Update</Label>
          <Input
            id="updateAuthority_creator"
            v-model="creator"
            class="my-2"
          />
        </div>
        <div class="grid w-full items-center">
          <Label for="updateAuthority_memoKey">New Memo Key</Label>
          <Input
            id="updateAuthority_memoKey"
            data-testid="memo-key"
            v-model="memoKey"
            placeholder="Nothing to update"
            class="my-2"
          />
        </div>
        <div class="grid w-full items-center">
          <Label for="updateAuthority_postingKey">Add Posting Key</Label>
          <Input
            id="updateAuthority_postingKey"
            data-testid="posting-key"
            v-model="postingKey"
            placeholder="Nothing to add"
            class="my-2"
          />
        </div>
        <div class="grid w-full items-center">
          <Label for="updateAuthority_activeKey">Add Active Key</Label>
          <Input
            id="updateAuthority_activeKey"
            data-testid="active-key"
            v-model="activeKey"
            placeholder="Nothing to add"
            class="my-2"
          />
        </div>
        <div class="grid w-full items-center">
          <Label for="updateAuthority_ownerKey">Add Owner Key</Label>
          <Input
            id="updateAuthority_ownerKey"
            data-testid="owner-key"
            v-model="ownerKey"
            placeholder="Nothing to add"
            class="my-2"
          />
        </div>
        <Button
          data-testid="update-authority-btn"
          class="my-2"
          :loading="isLoading"
          @click="updateAuthority"
        >
          Update Authority
        </Button>
        <p class="text-sm">
          Note: By clicking the above button, the transaction will be created, signed, and broadcasted immediately to the mainnet chain
        </p>
      </div>
    </CardContent>
  </Card>
</template>
