<script setup lang="ts">
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { mdiAccountPlusOutline } from '@mdi/js';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
</script>

<template>
  <Card class="bg-black/40 backdrop-blur-sm">
    <CardHeader>
      <CardTitle class="inline-flex items-center justify-between">
        <span>Process Account Creation</span>
        <svg width="20" height="20" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path style="fill: hsla(var(--foreground) / 80%)" :d="mdiAccountPlusOutline"/></svg>
      </CardTitle>
      <CardDescription class="mr-4">Use this module to process account creation request sent by other users</CardDescription>
    </CardHeader>
    <CardContent>
      <div class="my-4">
        <Input placeholder="Account username" class="my-2" disabled/>
        <Input placeholder="Memo key" class="my-2" disabled/>
        <Input placeholder="Posting key" class="my-2" disabled/>
        <Input placeholder="Active key" class="my-2" disabled/>
        <Input placeholder="Owner key" class="my-2" disabled/>
        <Textarea placeholder="Posting metadata" class="my-2" disabled/>
        <Button class="my-2">Create account</Button>
      </div>
    </CardContent>
  </Card>
</template>