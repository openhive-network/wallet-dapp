<script setup lang="ts">
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { mdiAccountBadgeOutline, mdiOpenInNew } from '@mdi/js';
import { useSettingsStore } from '@/stores/settings.store';
import { useUserStore } from '@/stores/user.store';

const settingsStore = useSettingsStore();

const userStore = useUserStore();
</script>

<template>
  <Card class="w-full">
    <CardHeader>
      <CardTitle class="inline-flex items-center justify-between">
        <span>Account details</span>
        <svg width="20" height="20" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path style="fill: hsla(var(--foreground) / 80%)" :d="mdiAccountBadgeOutline"/></svg>
      </CardTitle>
      <CardDescription class="mr-8">Account description parsed from the metadata</CardDescription>
    </CardHeader>
    <CardContent>
      <div class="space-y-4">
        <div class="flex space-x-1">
          <div>
            <Avatar v-if="userStore.isReady" shape="square" class="border rounded-xl w-20 h-20 mr-2">
              <AvatarImage v-if="userStore.profileImage" :src="userStore.profileImage" />
              <AvatarFallback>{{ settingsStore.settings.account?.slice(0, 12) }}</AvatarFallback>
            </Avatar>
            <Skeleton v-else class="rounded-xl w-20 h-20 mr-2" />
          </div>
          <div class="flex flex-col space-y-1 w-full mt-1">
            <div v-if="userStore.isReady" class="inline-flex items-center text-lg/3 font-bold">
              <span>{{ userStore.name }}</span>
              <a v-if="userStore.website" :href="userStore.website" target="_blank" class="">
                <svg class="ml-2 inline" width="18" height="18" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path style="fill: hsla(var(--foreground) / 80%)" :d="mdiOpenInNew"/></svg>
              </a>
            </div>
            <Skeleton v-else class="w-40 h-6" />
            <span v-if="userStore.isReady" class="text-xs font-bold top-[-5px]">@{{ settingsStore.settings.account }}</span>
            <Skeleton v-else class="w-40 h-6" />
            <span v-if="userStore.isReady" class="text-sm">{{ userStore.about }}</span>
            <span v-else class="space-y-1">
              <Skeleton class="w-full h-4" />
              <Skeleton class="w-full h-4" />
              <Skeleton class="w-full h-4" />
            </span>
          </div>
        </div>
      </div>
    </CardContent>
  </Card>
</template>