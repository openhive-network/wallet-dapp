<script setup lang="ts">
import { mdiAccountCircle, mdiEmail, mdiMapMarker, mdiTwitter, mdiGithub, mdiWeb } from '@mdi/js';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import type { CTokenUser } from '@/stores/tokens.store';

// Props
interface Props {
  user: CTokenUser;
}

defineProps<Props>();

// Get avatar fallback text
const getAvatarFallback = (user: CTokenUser): string => {
  if (user.name)
    return user.name.slice(0, 2).toUpperCase();

  if (user.displayName)
    return user.displayName.slice(0, 2).toUpperCase();

  if (user.operationalKey)
    return user.operationalKey.slice(3, 5).toUpperCase();

  return '??';
};
</script>

<template>
  <div class="flex flex-col md:flex-row items-start gap-6">
    <!-- Avatar -->
    <Avatar class="h-32 w-32 flex-shrink-0 border-4 border-background shadow-xl">
      <AvatarImage
        v-if="user.profileImage"
        :src="user.profileImage"
        :alt="user.displayName || 'User'"
      />
      <AvatarFallback class="text-4xl font-bold">
        <svg
          v-if="!user.profileImage"
          width="64"
          height="64"
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          class="text-muted-foreground"
        >
          <path
            style="fill: currentColor"
            d="M12,4A4,4 0 0,1 16,8A4,4 0 0,1 12,12A4,4 0 0,1 8,8A4,4 0 0,1 12,4M12,14C16.42,14 20,15.79 20,18V20H4V18C4,15.79 7.58,14 12,14Z"
          />
        </svg>
        <span v-else>
          {{ getAvatarFallback(user) }}
        </span>
      </AvatarFallback>
    </Avatar>

    <!-- User Info -->
    <div class="flex-1 space-y-4">
      <div>
        <h1 class="text-4xl font-bold mb-2 text-foreground">
          {{ user.displayName || 'Unknown User' }}
        </h1>
        <p v-if="user.name && user.name !== user.displayName" class="text-lg text-muted-foreground mb-3">
          {{ user.name }}
        </p>
        <p v-if="user.about" class="text-muted-foreground max-w-2xl">
          {{ user.about }}
        </p>
      </div>

      <!-- Social Links -->
      <div class="flex flex-wrap items-center gap-2">
        <a
          v-if="user.website"
          :href="user.website"
          target="_blank"
          rel="noopener noreferrer"
          class="inline-flex items-center gap-2 px-3 py-1.5 bg-background hover:bg-accent rounded-md text-sm transition-colors border"
        >
          <svg width="16" height="16" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
            <path style="fill: currentColor" :d="mdiWeb" />
          </svg>
          Website
        </a>
        <a
          v-if="user.twitter"
          :href="`https://twitter.com/${user.twitter}`"
          target="_blank"
          rel="noopener noreferrer"
          class="inline-flex items-center gap-2 px-3 py-1.5 bg-background hover:bg-accent rounded-md text-sm transition-colors border"
        >
          <svg width="16" height="16" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
            <path style="fill: currentColor" :d="mdiTwitter" />
          </svg>
          @{{ user.twitter }}
        </a>
        <a
          v-if="user.github"
          :href="`https://github.com/${user.github}`"
          target="_blank"
          rel="noopener noreferrer"
          class="inline-flex items-center gap-2 px-3 py-1.5 bg-background hover:bg-accent rounded-md text-sm transition-colors border"
        >
          <svg width="16" height="16" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
            <path style="fill: currentColor" :d="mdiGithub" />
          </svg>
          {{ user.github }}
        </a>
        <a
          v-if="user.hiveAccount"
          :href="`https://explore.openhive.network/@${user.hiveAccount}`"
          target="_blank"
          rel="noopener noreferrer"
          class="inline-flex items-center gap-2 px-3 py-1.5 bg-background hover:bg-accent rounded-md text-sm transition-colors border"
        >
          <svg width="16" height="16" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
            <path style="fill: currentColor" :d="mdiAccountCircle" />
          </svg>
          @{{ user.hiveAccount }}
        </a>
        <span
          v-if="user.location"
          class="inline-flex items-center gap-2 px-3 py-1.5 bg-background rounded-md text-sm border"
        >
          <svg width="16" height="16" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
            <path style="fill: currentColor" :d="mdiMapMarker" />
          </svg>
          {{ user.location }}
        </span>
        <a
          v-if="user.email"
          :href="`mailto:${user.email}`"
          class="inline-flex items-center gap-2 px-3 py-1.5 bg-background hover:bg-accent rounded-md text-sm transition-colors border"
        >
          <svg width="16" height="16" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
            <path style="fill: currentColor" :d="mdiEmail" />
          </svg>
          {{ user.email }}
        </a>
      </div>
    </div>
  </div>
</template>
