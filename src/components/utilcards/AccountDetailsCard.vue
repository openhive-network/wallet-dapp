<script setup lang="ts">
import { mdiAccountBadgeOutline, mdiOpenInNew } from '@mdi/js';
import { computed } from 'vue';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/round-progress';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { useSettingsStore } from '@/stores/settings.store';
import { useUserStore } from '@/stores/user.store';

const settingsStore = useSettingsStore();

const userStore = useUserStore();

const upvotePercentage = computed(() => {
  if (!userStore.manabars?.upvote) return 0;
  return userStore.manabars.upvote.percent;
});

const downvotePercentage = computed(() => {
  if (!userStore.manabars?.downvote) return 0;
  return userStore.manabars.downvote.percent;
});

const rcPercentage = computed(() => {
  if (!userStore.manabars?.rc) return 0;
  return userStore.manabars.rc.percent;
});
</script>

<template>
  <Card class="w-full">
    <CardHeader>
      <CardTitle class="inline-flex items-center justify-between">
        <span>Account details</span>
        <svg
          width="20"
          height="20"
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
        ><path
          style="fill: hsla(var(--foreground) / 80%)"
          :d="mdiAccountBadgeOutline"
        /></svg>
      </CardTitle>
      <CardDescription class="mr-8">
        Account description parsed from the metadata
      </CardDescription>
    </CardHeader>
    <CardContent>
      <div class="space-y-4">
        <div class="flex space-x-1">
          <div>
            <Avatar
              v-if="userStore.isReady"
              shape="square"
              class="border rounded-xl w-20 h-20 mr-2"
            >
              <AvatarImage
                v-if="userStore.profileImage"
                :src="userStore.profileImage"
              />
              <AvatarFallback>{{ userStore.userDisplayName }}</AvatarFallback>
            </Avatar>
            <Skeleton
              v-else
              class="rounded-xl w-20 h-20 mr-2"
            />
          </div>
          <div class="flex flex-col space-y-1 w-full mt-1">
            <div
              v-if="userStore.isReady"
              class="inline-flex items-center text-lg/3 font-bold"
            >
              <span>{{ userStore.userDisplayName }}</span>
              <a
                v-if="userStore.website"
                :href="userStore.website"
                target="_blank"
                class=""
              >
                <svg
                  class="ml-2 inline"
                  width="18"
                  height="18"
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                ><path
                  style="fill: hsla(var(--foreground) / 80%)"
                  :d="mdiOpenInNew"
                /></svg>
              </a>
            </div>
            <Skeleton
              v-else
              class="w-40 h-6"
            />
            <span
              v-if="userStore.isReady"
              class="text-xs font-bold top-[-5px]"
            >@{{ settingsStore.settings.account }}</span>
            <Skeleton
              v-else
              class="w-40 h-6"
            />
            <span
              v-if="userStore.isReady"
              class="text-sm"
            >{{ userStore.about }}</span>
            <span
              v-else
              class="space-y-1"
            >
              <Skeleton class="w-full h-4" />
              <Skeleton class="w-full h-4" />
              <Skeleton class="w-full h-4" />
            </span>
          </div>
        </div>
      </div>
    </CardContent>
    <CardContent>
      <div
        v-if="userStore.isReady && userStore.manabars"
        class="space-y-4"
      >
        <Separator />
        <div class="space-y-4 pt-2">
          <h3 class="text-sm font-medium text-muted-foreground">
            Manabars
          </h3>
          <div class="flex flex-col items-center space-y-5">
            <div class="flex flex-col items-center space-y-4 sm:flex-row sm:space-y-0 sm:space-x-4">
              <div class="flex flex-col items-center">
                <Progress
                  :value="upvotePercentage"
                  class="h-[100px] text-[16px]"
                  gauge-primary-color="oklch(0.6 0.15 140)"
                  gauge-secondary-color="oklch(0.6 0.15 140 / 0.2)"
                />
                <div class="flex w-full justify-center mt-2 text-sm">
                  <span class="font-bold">Upvote</span>
                </div>
              </div>
              <div class="flex flex-col items-center">
                <Progress
                  :value="downvotePercentage"
                  class="h-[100px] text-[16px]"
                  gauge-primary-color="oklch(0.6 0.15 25)"
                  gauge-secondary-color="oklch(0.6 0.15 25 / 0.2)"
                />
                <div class="flex w-full justify-center mt-2 text-sm">
                  <span class="font-bold">Downvote</span>
                </div>
              </div>
            </div>
            <div class="flex flex-col items-center">
              <Progress
                :value="rcPercentage"
                class="h-[100px] text-[16px]"
                gauge-primary-color="oklch(0.6 0.15 260)"
                gauge-secondary-color="oklch(0.6 0.15 260 / 0.2)"
              />
              <div class="flex w-full justify-center mt-2 text-sm">
                <span class="font-bold">Resource Credits (RC)</span>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div
        v-else-if="!userStore.isReady"
        class="space-y-4"
      >
        <Separator />
        <div class="space-y-4 pt-2">
          <h3 class="text-sm font-medium text-muted-foreground">
            Manabars
          </h3>
          <div class="flex flex-col items-center space-y-5">
            <div class="flex flex-col items-center space-y-4 sm:flex-row sm:space-y-0 sm:space-x-4">
              <div class="flex flex-col items-center">
                <Skeleton class="h-[100px] w-[100px] rounded-full" />
                <Skeleton class="h-5 w-20 mt-2" />
              </div>
              <div class="flex flex-col items-center">
                <Skeleton class="h-[100px] w-[100px] rounded-full" />
                <Skeleton class="h-5 w-20 mt-2" />
              </div>
            </div>
            <div class="flex flex-col items-center">
              <Skeleton class="h-[100px] w-[100px] rounded-full" />
              <Skeleton class="h-5 w-40 mt-2" />
            </div>
          </div>
        </div>
      </div>
    </CardContent>
  </Card>
</template>
