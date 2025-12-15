<script setup lang="ts">
import { mdiStarOutline, mdiCloseCircle, mdiDownload, mdiUpload, mdiDeleteOutline, mdiStarOff } from '@mdi/js';
import { onMounted, ref, computed } from 'vue';
import { toast } from 'vue-sonner';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { TextTooltip } from '@/components/ui/texttooltip';
import { useFavoritesStore, type FavoriteAccount } from '@/stores/favorites.store';
import { toastError } from '@/utils/parse-error';

definePageMeta({
  layout: 'htm'
});

// Store
const favoritesStore = useFavoritesStore();

// State
const searchQuery = ref('');

// Computed
const filteredAccounts = computed(() => {
  if (!searchQuery.value.trim())
    return favoritesStore.accounts;


  const query = searchQuery.value.toLowerCase();
  return favoritesStore.accounts.filter(account =>
    account.operationalKey.toLowerCase().includes(query) ||
    account.displayName?.toLowerCase().includes(query) ||
    account.name?.toLowerCase().includes(query) ||
    account.about?.toLowerCase().includes(query)
  );
});

const clearSearch = () => {
  searchQuery.value = '';
};

// Unfavorite with undo
const handleUnfavorite = (account: FavoriteAccount) => {
  const removedAccount = { ...account };
  favoritesStore.removeAccountFromFavorites(account.operationalKey);

  toast.success(`Removed ${account.displayName || account.name || account.operationalKey} from favorites`, {
    action: {
      label: 'Undo',
      onClick: () => {
        favoritesStore.addAccountToFavorites(removedAccount);
        toast.success('Restored to favorites');
      }
    },
    duration: 5000
  });
};

// Get avatar fallback
const getAvatarFallback = (account: FavoriteAccount): string => {
  if (account.name)
    return account.name.slice(0, 2).toUpperCase();
  if (account.displayName)
    return account.displayName.slice(0, 2).toUpperCase();
  if (account.operationalKey)
    return account.operationalKey.slice(3, 5).toUpperCase();
  return '??';
};

// Export/Import functionality
const exportFavorites = () => {
  const data = favoritesStore.exportFavorites();
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `htm-favorites-${new Date().toISOString().split('T')[0]}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  toast.success('Favorites exported successfully');
};

const importFavorites = (event: Event) => {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const data = JSON.parse(e.target?.result as string);
      const result = favoritesStore.importFavorites(data);

      if (result.accountsImported > 0 || result.tokensImported > 0) {
        const parts = [];
        if (result.accountsImported > 0)
          parts.push(`${result.accountsImported} account${result.accountsImported > 1 ? 's' : ''}`);

        if (result.tokensImported > 0)
          parts.push(`${result.tokensImported} token${result.tokensImported > 1 ? 's' : ''}`);

        toast.success(`Imported ${parts.join(' and ')}`);
      } else
        toast.info('No new favorites to import');


      if (result.errors.length > 0)
        toastError(`${result.errors.length} invalid item${result.errors.length > 1 ? 's' : ''} skipped`);
    } catch {
      toastError('Failed to import favorites. Invalid file format.');
    }

    // Reset input so the same file can be selected again
    input.value = '';
  };
  reader.readAsText(file);
};

// Initialize
onMounted(() => {
  favoritesStore.loadFromStorage();
});
</script>

<template>
  <div class="container mx-auto py-4 sm:py-6 space-y-6 px-2 sm:px-4">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-2xl sm:text-3xl font-bold tracking-tight">
          Favorite Accounts
        </h1>
        <p class="text-muted-foreground">
          Quick access to your saved HTM accounts
        </p>
      </div>

      <div class="flex gap-2">
        <!-- Export/Import Dialog -->
        <Dialog>
          <DialogTrigger as-child>
            <Button
              variant="outline"
            >
              <svg
                width="16"
                height="16"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                class="mr-2"
              >
                <path
                  style="fill: currentColor"
                  :d="mdiDownload"
                />
              </svg>
              Manage
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Manage Favorites</DialogTitle>
              <DialogDescription>
                Export or import your favorite accounts for backup or transfer.
              </DialogDescription>
            </DialogHeader>
            <div class="space-y-4 pt-4">
              <Button
                variant="outline"
                class="w-full"
                @click="exportFavorites"
              >
                <svg
                  width="16"
                  height="16"
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  class="mr-2"
                >
                  <path
                    style="fill: currentColor"
                    :d="mdiDownload"
                  />
                </svg>
                Export Favorites
              </Button>
              <div>
                <label
                  for="import-file"
                  class="block"
                >
                  <Button
                    variant="outline"
                    as="span"
                    class="w-full cursor-pointer"
                  >
                    <svg
                      width="16"
                      height="16"
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      class="mr-2"
                    >
                      <path
                        style="fill: currentColor"
                        :d="mdiUpload"
                      />
                    </svg>
                    Import Favorites
                  </Button>
                </label>
                <input
                  id="import-file"
                  type="file"
                  accept="application/json"
                  class="hidden"
                  @change="importFavorites"
                >
              </div>
              <Button
                variant="destructive"
                class="w-full"
                @click="favoritesStore.clearAccounts"
              >
                <svg
                  width="16"
                  height="16"
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  class="mr-2"
                >
                  <path
                    style="fill: currentColor"
                    :d="mdiDeleteOutline"
                  />
                </svg>
                Clear All Favorites
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>

    <!-- Search -->
    <div class="flex flex-col sm:flex-row gap-4">
      <div class="max-w-[350px] flex-1 relative">
        <Input
          v-model="searchQuery"
          placeholder="Search favorites by name or key..."
          class="w-full"
        />
        <svg
          v-if="searchQuery.length > 0"
          width="16"
          height="16"
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          class="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground cursor-pointer"
          @click="clearSearch"
        >
          <path
            style="fill: currentColor"
            :d="mdiCloseCircle"
          />
        </svg>
      </div>
    </div>

    <!-- Favorites List -->
    <Card v-if="filteredAccounts.length > 0">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead class="w-[50px]" />
            <TableHead>Account</TableHead>
            <TableHead class="hidden md:table-cell">About</TableHead>
            <TableHead class="text-right pr-6">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow
            v-for="account in filteredAccounts"
            :key="account.operationalKey"
            class="group"
          >
            <NuxtLink
              :to="`/tokens/users/${encodeURIComponent(account.operationalKey)}`"
              class="keychainify-checked contents"
            >
              <TableCell>
                <Avatar size="sm" shape="circle">
                  <AvatarImage
                    v-if="account.profileImage"
                    :src="account.profileImage"
                    :alt="account.displayName || account.name || 'User'"
                  />
                  <AvatarFallback>
                    <svg
                      v-if="!account.profileImage"
                      width="20"
                      height="20"
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      class="text-muted-foreground"
                    >
                      <path
                        style="fill: currentColor"
                        d="M12,4A4,4 0 0,1 16,8A4,4 0 0,1 12,12A4,4 0 0,1 8,8A4,4 0 0,1 12,4M12,14C16.42,14 20,15.79 20,18V20H4V18C4,15.79 7.58,14 12,14Z"
                      />
                    </svg>
                    <span v-else class="text-sm font-semibold">
                      {{ getAvatarFallback(account) }}
                    </span>
                  </AvatarFallback>
                </Avatar>
              </TableCell>
              <TableCell>
                <div class="font-medium hover:text-primary transition-colors">
                  {{ account.displayName || account.name || 'Unknown User' }}
                </div>
                <div class="text-xs text-muted-foreground font-mono truncate max-w-[200px]">
                  {{ account.operationalKey }}
                </div>
              </TableCell>
              <TableCell class="hidden md:table-cell">
                <p class="text-sm text-muted-foreground line-clamp-2 max-w-md">
                  {{ account.about || 'No bio provided' }}
                </p>
              </TableCell>
              <TableCell class="text-right pr-4">
                <TextTooltip content="Remove from favorites">
                  <Button
                    variant="ghost"
                    size="sm"
                    class="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-accent"
                    @click.prevent="handleUnfavorite(account)"
                  >
                    <svg
                      width="18"
                      height="18"
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                    >
                      <path
                        style="fill: currentColor"
                        :d="mdiStarOff"
                      />
                    </svg>
                  </Button>
                </TextTooltip>
              </TableCell>
            </NuxtLink>
          </TableRow>
        </TableBody>
      </Table>
    </Card>

    <!-- Empty State -->
    <Card v-else>
      <CardContent class="text-center py-12">
        <svg
          width="64"
          height="64"
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          class="mx-auto text-muted-foreground mb-4"
        >
          <path
            style="fill: currentColor"
            :d="mdiStarOutline"
          />
        </svg>
        <h3 class="text-lg font-semibold mb-2">
          No Favorite Accounts
        </h3>
        <p class="text-muted-foreground mb-4">
          <span v-if="searchQuery.length > 0">No favorites match your search.</span>
          <span v-else>You haven't saved any favorite accounts yet. Star accounts from account pages to save them here.</span>
        </p>
      </CardContent>
    </Card>
  </div>
</template>
