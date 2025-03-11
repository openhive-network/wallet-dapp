<script setup lang="ts">
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { mdiMessageLockOutline } from '@mdi/js';
import { ref } from 'vue';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';

const isEncrypt = ref(false);
</script>

<template>
  <Card class="bg-black/40 backdrop-blur-sm">
    <CardHeader>
      <CardTitle class="inline-flex items-center justify-between">
        <span>Memo encryption</span>
        <svg width="20" height="20" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path style="fill: hsla(var(--foreground) / 80%)" :d="mdiMessageLockOutline"/></svg>
      </CardTitle>
      <CardDescription class="mr-4">Use this module to encrypt / decrypt given message using your memo key for any purpose</CardDescription>
    </CardHeader>
    <CardContent>
      <div class="my-4 space-x-4 flex">
        <span>Decrypt</span>
        <Switch v-model="isEncrypt" />
        <span>Encrypt</span>
      </div>
      <Textarea placeholder="Input" class="my-4"/>
      <Input v-if="isEncrypt" placeholder="Receiver account or public key" class="mt-4"/>
      <div class="flex mb-4 underline text-sm" v-if="isEncrypt">
        <a class="ml-auto mr-1 cursor-pointer" style="color: hsla(var(--foreground) / 70%)" @click="">Use my memo key</a>
      </div>
      <Button>{{ isEncrypt ? "Encrypt" : "Decrypt" }}</Button>
      <Textarea placeholder="Output" copy-enabled class="my-4" disabled/>
    </CardContent>
  </Card>
</template>