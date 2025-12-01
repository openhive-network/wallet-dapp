<script setup lang="ts">
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { CTokenUser } from '@/stores/tokens.store';

interface Props {
  user: CTokenUser;
  showViewIcon?: boolean;
}

withDefaults(defineProps<Props>(), {
  showViewIcon: false
});

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
  <Card class="transition-all">
    <CardHeader class="pb-3">
      <div class="flex items-start gap-4">
        <!-- User Avatar -->
        <Avatar
          size="sm"
          shape="circle"
        >
          <AvatarImage
            v-if="user.profileImage"
            :src="user.profileImage"
            :alt="user.displayName || 'User'"
          />
          <AvatarFallback>
            <svg
              v-if="!user.profileImage"
              width="24"
              height="24"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              class="text-muted-foreground"
            >
              <path
                style="fill: currentColor"
                d="M12,4A4,4 0 0,1 16,8A4,4 0 0,1 12,12A4,4 0 0,1 8,8A4,4 0 0,1 12,4M12,14C16.42,14 20,15.79 20,18V20H4V18C4,15.79 7.58,14 12,14Z"
              />
            </svg>
            <span
              v-else
              class="text-sm font-semibold"
            >
              {{ getAvatarFallback(user) }}
            </span>
          </AvatarFallback>
        </Avatar>

        <!-- User Info -->
        <div class="flex-1 min-w-0">
          <div class="flex flex-col gap-1 mb-1">
            <CardTitle class="text-lg truncate">
              {{ user.displayName || 'Unknown User' }}
            </CardTitle>
          </div>
          <CardDescription class="text-xs truncate font-mono">
            {{ user.operationalKey }}
          </CardDescription>
        </div>

        <!-- View Icon -->
        <svg
          v-if="showViewIcon"
          width="20"
          height="20"
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          class="text-muted-foreground group-hover:text-foreground transition-colors flex-shrink-0"
        >
          <path
            style="fill: currentColor"
            d="M8.59,16.58L13.17,12L8.59,7.41L10,6L16,12L10,18L8.59,16.58Z"
          />
        </svg>
      </div>
    </CardHeader>

    <CardContent class="space-y-4">
      <!-- About -->
      <p
        v-if="user.about"
        class="text-sm text-muted-foreground line-clamp-3 min-h-[3.75rem]"
      >
        {{ user.about }}
      </p>
      <p
        v-else
        class="text-sm text-muted-foreground italic min-h-[3.75rem]"
      >
        No bio provided
      </p>

      <!-- User Properties -->
      <div class="space-y-2 text-sm">
        <!-- Hive Account -->
        <div
          v-if="user.hiveAccount"
          class="flex items-center justify-between"
        >
          <span class="text-muted-foreground">Hive Account:</span>
          <span class="font-semibold text-foreground truncate ml-2">
            @{{ user.hiveAccount }}
          </span>
        </div>

        <!-- Location -->
        <div
          v-if="user.location"
          class="flex items-center justify-between"
        >
          <span class="text-muted-foreground">Location:</span>
          <span class="font-semibold text-foreground truncate ml-2">
            {{ user.location }}
          </span>
        </div>

        <!-- Website -->
        <div
          v-if="user.website"
          class="flex items-center gap-2"
        >
          <svg
            width="14"
            height="14"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            class="text-muted-foreground flex-shrink-0"
          >
            <path
              style="fill: currentColor"
              d="M16.36,14C16.44,13.34 16.5,12.68 16.5,12C16.5,11.32 16.44,10.66 16.36,10H19.74C19.9,10.64 20,11.31 20,12C20,12.69 19.9,13.36 19.74,14M14.59,19.56C15.19,18.45 15.65,17.25 15.97,16H18.92C17.96,17.65 16.43,18.93 14.59,19.56M14.34,14H9.66C9.56,13.34 9.5,12.68 9.5,12C9.5,11.32 9.56,10.65 9.66,10H14.34C14.43,10.65 14.5,11.32 14.5,12C14.5,12.68 14.43,13.34 14.34,14M12,19.96C11.17,18.76 10.5,17.43 10.09,16H13.91C13.5,17.43 12.83,18.76 12,19.96M8,8H5.08C6.03,6.34 7.57,5.06 9.4,4.44C8.8,5.55 8.35,6.75 8,8M5.08,16H8C8.35,17.25 8.8,18.45 9.4,19.56C7.57,18.93 6.03,17.65 5.08,16M4.26,14C4.1,13.36 4,12.69 4,12C4,11.31 4.1,10.64 4.26,10H7.64C7.56,10.66 7.5,11.32 7.5,12C7.5,12.68 7.56,13.34 7.64,14M12,4.03C12.83,5.23 13.5,6.57 13.91,8H10.09C10.5,6.57 11.17,5.23 12,4.03M18.92,8H15.97C15.65,6.75 15.19,5.55 14.59,4.44C16.43,5.07 17.96,6.34 18.92,8M12,2C6.47,2 2,6.5 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2Z"
            />
          </svg>
          <a
            :href="user.website"
            target="_blank"
            rel="noopener noreferrer"
            class="text-primary hover:underline truncate"
          >
            {{ user.website.replace(/^https?:\/\//, '') }}
          </a>
        </div>

        <!-- Social Links -->
        <div
          v-if="user.twitter || user.github"
          class="flex items-center gap-3 pt-2"
        >
          <a
            v-if="user.twitter"
            :href="`https://twitter.com/${user.twitter}`"
            target="_blank"
            rel="noopener noreferrer"
            class="text-muted-foreground hover:text-foreground transition-colors"
            title="Twitter"
          >
            <svg
              width="18"
              height="18"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
            >
              <path
                style="fill: currentColor"
                d="M22.46,6C21.69,6.35 20.86,6.58 20,6.69C20.88,6.16 21.56,5.32 21.88,4.31C21.05,4.81 20.13,5.16 19.16,5.36C18.37,4.5 17.26,4 16,4C13.65,4 11.73,5.92 11.73,8.29C11.73,8.63 11.77,8.96 11.84,9.27C8.28,9.09 5.11,7.38 3,4.79C2.63,5.42 2.42,6.16 2.42,6.94C2.42,8.43 3.17,9.75 4.33,10.5C3.62,10.5 2.96,10.3 2.38,10C2.38,10 2.38,10 2.38,10.03C2.38,12.11 3.86,13.85 5.82,14.24C5.46,14.34 5.08,14.39 4.69,14.39C4.42,14.39 4.15,14.36 3.89,14.31C4.43,16 6,17.26 7.89,17.29C6.43,18.45 4.58,19.13 2.56,19.13C2.22,19.13 1.88,19.11 1.54,19.07C3.44,20.29 5.70,21 8.12,21C16,21 20.33,14.46 20.33,8.79C20.33,8.6 20.33,8.42 20.32,8.23C21.16,7.63 21.88,6.87 22.46,6Z"
              />
            </svg>
          </a>
          <a
            v-if="user.github"
            :href="`https://github.com/${user.github}`"
            target="_blank"
            rel="noopener noreferrer"
            class="text-muted-foreground hover:text-foreground transition-colors"
            title="GitHub"
          >
            <svg
              width="18"
              height="18"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
            >
              <path
                style="fill: currentColor"
                d="M12,2A10,10 0 0,0 2,12C2,16.42 4.87,20.17 8.84,21.5C9.34,21.58 9.5,21.27 9.5,21C9.5,20.77 9.5,20.14 9.5,19.31C6.73,19.91 6.14,17.97 6.14,17.97C5.68,16.81 5.03,16.5 5.03,16.5C4.12,15.88 5.1,15.9 5.1,15.9C6.1,15.97 6.63,16.93 6.63,16.93C7.5,18.45 8.97,18 9.54,17.76C9.63,17.11 9.89,16.67 10.17,16.42C7.95,16.17 5.62,15.31 5.62,11.5C5.62,10.39 6,9.5 6.65,8.79C6.55,8.54 6.2,7.5 6.75,6.15C6.75,6.15 7.59,5.88 9.5,7.17C10.29,6.95 11.15,6.84 12,6.84C12.85,6.84 13.71,6.95 14.5,7.17C16.41,5.88 17.25,6.15 17.25,6.15C17.8,7.5 17.45,8.54 17.35,8.79C18,9.5 18.38,10.39 18.38,11.5C18.38,15.32 16.04,16.16 13.81,16.41C14.17,16.72 14.5,17.33 14.5,18.26C14.5,19.6 14.5,20.68 14.5,21C14.5,21.27 14.66,21.59 15.17,21.5C19.14,20.16 22,16.42 22,12A10,10 0 0,0 12,2Z"
              />
            </svg>
          </a>
        </div>
      </div>
    </CardContent>
  </Card>
</template>
