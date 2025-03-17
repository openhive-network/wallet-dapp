<script setup lang="ts">
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { mdiAccountKeyOutline } from '@mdi/js';
import { useSettingsStore } from '@/stores/settings.store';
import { computed, onMounted, ref, watch } from 'vue';
import { AccountAuthorityUpdateOperation, type authority } from '@hiveio/wax/vite';
import { getWax } from '@/stores/wax.store';
import PublicKey from '@/components/hive/PublicKey.vue';

const settingsStore = useSettingsStore();
const hasUser = computed(() => settingsStore.settings.account !== undefined);

const memoKey = ref<null | string>(null);
const activeAuthority = ref<null | authority>(null);
const postingAuthority = ref<null | authority>(null);
const ownerAuthority = ref<null | authority>(null);

const retrieveAuthority = async() => {
  try {
    const wax = await getWax();

    const op = await AccountAuthorityUpdateOperation.createFor(wax, settingsStore.settings.account!);
    memoKey.value = op.role("memo").value;
    postingAuthority.value = op.role("posting").value;
    activeAuthority.value = op.role("active").value;
    ownerAuthority.value = op.role("owner").value;
  } catch(error) {
    console.error(error); // TODO: Handle error - toast
  }
};
watch(hasUser, value => {
  if(value)
    void retrieveAuthority();
});
onMounted(() => {
  if(hasUser.value)
    void retrieveAuthority();
});
</script>

<template>
  <Card class="w-full max-w-[600px] bg-foreground/10 backdrop-blur-sm">
    <CardHeader>
      <CardTitle class="inline-flex items-center justify-between">
        <span>Authority info</span>
        <svg width="20" height="20" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path style="fill: hsla(var(--foreground) / 80%)" :d="mdiAccountKeyOutline"/></svg>
      </CardTitle>
      <CardDescription class="mr-8">Use this module to gather information about your Hive on-chain authorities</CardDescription>
    </CardHeader>
    <CardContent>
      <div class="space-y-4" v-if="hasUser">
        <div class="flex flex-col">
          <h4>Memo</h4>
          <PublicKey v-if="memoKey" :value="memoKey" />
          <Skeleton v-if="!memoKey" class="ml-2 h-[40px] w-full rounded-xl" />
        </div>
        <div class="flex flex-col">
          <h4>Posting</h4>
          <PublicKey v-if="postingAuthority" v-for="(key, val) in postingAuthority.key_auths" :key="key" :value="val" :after-value="`(${key}/${postingAuthority.weight_threshold})`" />
          <PublicKey :context="0" v-if="postingAuthority" v-for="(key, val) in postingAuthority.account_auths" :key="key" :value="val" :after-value="`(${key}/${postingAuthority.weight_threshold})`"/>
          <Skeleton v-if="!postingAuthority" class="ml-2 h-[40px] w-full rounded-xl" />
        </div>
        <div class="flex flex-col">
          <h4>Active</h4>
          <PublicKey v-if="activeAuthority" v-for="(key, val) in activeAuthority.key_auths" :key="key" :value="val" :after-value="`(${key}/${activeAuthority.weight_threshold})`" />
          <PublicKey :context="0" v-if="activeAuthority" v-for="(key, val) in activeAuthority.account_auths" :key="key" :value="val" :after-value="`(${key}/${activeAuthority.weight_threshold})`"/>
          <Skeleton v-if="!activeAuthority" class="ml-2 h-[40px] w-full rounded-xl" />
        </div>
        <div class="flex flex-col">
          <h4>Owner</h4>
          <PublicKey v-if="ownerAuthority" v-for="(key, val) in ownerAuthority.key_auths" :key="key" :value="val" :after-value="`(${key}/${ownerAuthority.weight_threshold})`" />
          <PublicKey :context="0" v-if="ownerAuthority" v-for="(key, val) in ownerAuthority.account_auths" :key="key" :value="val" :after-value="`(${key}/${ownerAuthority.weight_threshold})`"/>
          <Skeleton v-if="!ownerAuthority" class="ml-2 h-[40px] w-full rounded-xl" />
        </div>
      </div>
    </CardContent>
  </Card>
</template>