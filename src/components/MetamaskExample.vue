<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useMetamaskStore } from '@/stores/metamask.store';
import { Button } from '@/components/ui/button';
import { useSettingsStore } from '@/stores/settings.store';

const walletStore = useMetamaskStore();

const metamaskFound = ref(false);
const isConnected = computed(() => walletStore.isConnected);
const isFlask = computed(() => walletStore.isFlask);
const performingOperation = computed(() => walletStore.performingOperation);
const isInstalled = computed(() => walletStore.isInstalled);

const frontError = ref<undefined | string>();
const frontResult = ref<undefined | string>();

const safeCall = async(storeFn: (...args: any) => any) => {
  frontResult.value = undefined;
  frontError.value = undefined;

  try {
    frontResult.value = JSON.stringify(await storeFn(), undefined, 2);
  } catch(error) {
    frontError.value = error instanceof Error ? error.message : `Unknown error: ${error}`;
  }
};

const settingsStore = useSettingsStore();

const connect = safeCall.bind(undefined, () => walletStore.connect());
const install = safeCall.bind(undefined, () => walletStore.install());
const call = (method: string, params?: any) => safeCall(() => walletStore.call(method, params));
const getPublicKeys = () => call('hive_getPublicKeys', { keys: [ { role: 'memo' }, { role: 'posting' }, { role: 'active' }, { role: 'owner' } ] });

// Automatically try to connect on mount (client-side)
onMounted(() => {
  walletStore.connect().then(() => metamaskFound.value = true).catch(error => {
    console.error(error);
  });
});
</script>

<template>
  <div>
    <h1>Metamask Example</h1>
    <p>Has supported extension: {{ metamaskFound }}</p>
    <p v-if="metamaskFound">Connected: {{ isConnected }}</p>
    <div v-if="isConnected">
      <p>isFlask: {{ isFlask }}</p>
      <p>isInstalled: {{ isInstalled }}</p>
      <Button :disabled="performingOperation" @click="connect">Reconnect</Button>
      <Button :disabled="performingOperation" @click="install">{{ isInstalled ? "Reinstall" : "Install" }}</Button>
      <Button :disabled="performingOperation" @click="getPublicKeys" v-if="isInstalled">getPublicKeys</Button>
      <Button @click="settingsStore.resetSettings">logout</Button>
    </div>
    <div v-else-if="metamaskFound">
      <Button :disabled="performingOperation" @click="connect">Connect</Button>
    </div>
    <div v-if="frontError">
      <p :style="{ color: 'darkred' }">Error:</p>
      <code><pre>{{ frontError }}</pre></code>
    </div>
    <div v-if="frontResult">
      <p :style="{ color: 'darkgreen' }">Result:</p>
      <code><pre>{{ frontResult }}</pre></code>
    </div>
  </div>
</template>

<style scoped>
pre {
  text-align: left;
}
</style>
