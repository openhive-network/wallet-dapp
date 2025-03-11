<script setup lang="ts">
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { mdiFileSign } from '@mdi/js';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
</script>

<template>
  <Card class="bg-black/40 backdrop-blur-sm">
    <CardHeader>
      <CardTitle class="inline-flex items-center justify-between">
        <span>Transaction signing</span>
        <svg width="20" height="20" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path style="fill: hsla(var(--foreground) / 80%)" :d="mdiFileSign"/></svg>
      </CardTitle>
      <CardDescription class="mr-4">Use this module to sign the provided transaction</CardDescription>
    </CardHeader>
    <CardContent>
      <Textarea placeholder="Transaction in API JSON form" class="my-4"/>
      <div class="my-4 space-x-4">
        <Button>Sign transaction</Button>
      </div>
      <Textarea placeholder="Signed Transaction output" copy-enabled class="my-4" disabled/>
    </CardContent>
  </Card>
</template>