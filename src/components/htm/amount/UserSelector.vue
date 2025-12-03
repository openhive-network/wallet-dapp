<script setup lang="ts">
import { mdiArrowDown, mdiStar } from '@mdi/js';
import { Check, QrCode, Search } from 'lucide-vue-next';
import { computed, ref, watch } from 'vue';

import QrScanner from '@/components/QrScanner.vue';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useFavoritesStore } from '@/stores/favorites.store';
import { useTokensStore, type CTokenUser } from '@/stores/tokens.store';
import { debounce } from '@/utils/debouncers';
import { toastError } from '@/utils/parse-error';

interface UserOption {
  operationalKey: string;
  displayName: string;
  name: string;
  profileImage?: string;
  about?: string;
  isFavorite: boolean;
}

interface Props {
  modelValue?: CTokenUser | undefined;
  placeholder?: string;
  disabled?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: undefined,
  placeholder: 'Select user or enter STM public key'
});

const emit = defineEmits<{
  (e: 'update:modelValue', value: CTokenUser | undefined): void;
}>();

const tokensStore = useTokensStore();
const favoritesStore = useFavoritesStore();

// Reactive state
const searchQuery = ref('');
const selectedValue = ref<string | null>(props.modelValue?.operationalKey || null);
const isSearching = ref(false);
const searchResults = ref<CTokenUser[]>([]);
const isOpen = ref(false);
const showQrScanner = ref(false);

// Watch props.modelValue and update selectedValue
watch(() => props.modelValue, (newValue) => {
  selectedValue.value = newValue?.operationalKey || null;
});

// Convert favorites to user options (memoized)
const favoriteUsers = computed((): UserOption[] => {
  // Only compute if we have favorites
  if (favoritesStore.favoriteAccountsCount === 0) return [];

  return favoritesStore.accounts.map(account => ({
    operationalKey: account.operationalKey,
    displayName: account.displayName || account.name || account.operationalKey.substring(0, 8),
    name: account.name || account.displayName || '',
    profileImage: account.profileImage,
    about: account.about,
    isFavorite: true
  }));
});

// Convert search results to user options
const searchedUsers = computed((): UserOption[] => {
  return searchResults.value
    .filter(user => !favoritesStore.isAccountFavorited(user.operationalKey))
    .map(user => ({
      operationalKey: user.operationalKey,
      displayName: user.displayName,
      name: user.name,
      profileImage: user.profileImage,
      about: user.about,
      isFavorite: false
    }));
});

// Filtered users based on search query (optimized)
const filteredUsers = computed((): UserOption[] => {
  const query = searchQuery.value.trim();

  if (!query) {
    // If no search, show only favorites
    return favoriteUsers.value;
  }

  // Don't filter until we have at least 2 characters
  if (query.length < 2)
    return favoriteUsers.value;


  const lowerQuery = query.toLowerCase();

  // Combine and filter in one pass for better performance
  const allUsersList = [...favoriteUsers.value, ...searchedUsers.value];

  return allUsersList.filter(user =>
    user.displayName.toLowerCase().includes(lowerQuery) ||
    user.name.toLowerCase().includes(lowerQuery) ||
    user.operationalKey.toLowerCase().includes(lowerQuery) ||
    user.about?.toLowerCase().includes(lowerQuery)
  );
});

// Selected user
const selectedUser = ref<(CTokenUser & { isFavorite: boolean }) | undefined>(undefined);

// Check if query is a public key (starts with STM)
const isPublicKey = (query: string): boolean => {
  return query.trim().toUpperCase().startsWith('STM');
};

// Search users via API or handle direct public key input
const searchUsers = async (query: string) => {
  const trimmedQuery = query.trim();

  if (!trimmedQuery) {
    searchResults.value = [];
    return;
  }

  try {
    isSearching.value = true;

    // If it's a public key, create a minimal user entry
    if (isPublicKey(trimmedQuery)) {
      const response = await tokensStore.getUser(trimmedQuery);
      searchResults.value = [response];
    } else {
      // Normal search
      const response = await tokensStore.searchUsers(trimmedQuery, 1);
      searchResults.value = response.items || [];
    }
  } catch (error) {
    toastError('Failed to search users:', error);
    searchResults.value = [];
  } finally {
    isSearching.value = false;
  }
};

const debouncedSearch = debounce(searchUsers);

// Watch search query with debounce
watch(searchQuery, debouncedSearch);

// Select user handler
const selectUser = (user: UserOption) => {
  selectedUser.value = {
    operationalKey: user.operationalKey,
    managementKey: '',
    displayName: user.displayName,
    name: user.name,
    about: user.about || '',
    profileImage: user.profileImage || '',
    website: '',
    metadata: {},
    isFavorite: user.isFavorite
  };

  emit('update:modelValue', selectedUser.value);
  isOpen.value = false;
  searchQuery.value = '';
  searchResults.value = [];
};

// Get initials for avatar fallback
const getInitials = (displayName: string): string => {
  const words = displayName.trim().split(/\s+/);
  if (words.length >= 2 && words[0]?.[0] && words[1]?.[0])
    return (words[0][0] + words[1][0]).toUpperCase();

  return displayName.substring(0, 2).toUpperCase();
};

// Handle QR code scan
const handleQrScan = async (decodedText: string) => {
  const trimmedText = decodedText.trim();

  let pk: string | undefined = undefined;

  try {
    const url = new URL(trimmedText);
    const toSearch = url.searchParams.get('to');
    if (toSearch)
      pk = toSearch;
  } catch {
    if (isPublicKey(trimmedText))
      pk = trimmedText;
    else {
      // Private key
      if(trimmedText.length === 51) {
        try {
          const bk = await import('@hiveio/beekeeper');
          const instance = await bk.default({ enableLogs: false, inMemory: true });
          const { wallet } = await instance.createSession(Math.random().toString()).createWallet(Math.random().toString(), Math.random().toString(), true);
          pk = await wallet.importKey(trimmedText);
          await instance.delete();
        } catch {}
      }
    }
  }

  if (pk) {
    try {
      const user = await tokensStore.getUser(pk);
      selectUser({
        operationalKey: user.operationalKey,
        displayName: user.displayName,
        name: user.name,
        profileImage: user.profileImage,
        about: user.about,
        isFavorite: favoritesStore.isAccountFavorited(user.operationalKey)
      });

      return;
    } catch {}
  }

  toastError('Failed to load user from QR code', new Error('No valid STM public key found'));
};

const openQrScanner = () => {
  isOpen.value = false; // Close the popover
  showQrScanner.value = true;
};
</script>

<template>
  <div class="border border-input rounded-md flex flex-row items-center">
    <Popover v-model:open="isOpen">
      <PopoverTrigger as-child class="border-l-0 border-t-0 border-b-0 border-r rounded-r-none">
        <Button
          variant="outline"
          role="combobox"
          :aria-expanded="isOpen"
          :disabled="disabled"
          as-child
          class="w-full justify-between flex h-9 py-1 cursor-pointer font-normal"
        >
          <div
            v-if="selectedValue"
            class="flex items-center gap-2 truncate flex-1 min-w-0"
          >
            <Avatar class="h-5 w-5">
              <AvatarImage
                v-if="selectedUser?.profileImage"
                :src="selectedUser.profileImage"
                :alt="selectedUser.displayName"
              />
              <AvatarFallback class="text-xs">
                {{ selectedUser ? getInitials(selectedUser.displayName) : 'U' }}
              </AvatarFallback>
            </Avatar>
            <span class="text-sm truncate max-w-[280px]">
              {{ selectedUser?.displayName || selectedValue }}
            </span>
            <svg
              v-if="selectedUser?.isFavorite"
              width="12"
              height="12"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              class="text-yellow-500 flex-shrink-0"
            >
              <path
                style="fill: currentColor"
                :d="mdiStar"
              />
            </svg>
          </div>
          <span
            v-else
            class="text-muted-foreground truncate flex-1"
          >
            {{ placeholder }}
          </span>
          <svg
            width="16"
            height="16"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            class="ml-2 h-4 w-4 shrink-0 opacity-50"
          >
            <path
              style="fill: currentColor"
              :d="mdiArrowDown"
            />
          </svg>
        </Button>
      </PopoverTrigger>
      <PopoverContent class="w-[400px] p-0" align="start">
        <div class="flex items-center border-b px-3 py-2">
          <Search class="mr-2 h-4 w-4 shrink-0 opacity-50" />
          <Input
            v-model="searchQuery"
            placeholder="Search by name, address, or STM public key..."
            class="h-8 border-0 focus-visible:ring-0 focus-visible:ring-offset-0"
          />
        </div>
        <div class="max-h-[300px] overflow-y-auto">
          <div v-if="isSearching" class="flex flex-col items-center gap-2 py-8">
            <div class="h-8 w-8 animate-spin rounded-full border-4 border-muted border-t-primary" />
            <span class="text-sm text-muted-foreground">Searching...</span>
          </div>
          <div v-else-if="filteredUsers.length === 0" class="flex flex-col items-center gap-2 py-8">
            <Search class="h-8 w-8 opacity-40 text-muted-foreground" />
            <span class="text-sm text-muted-foreground">
              {{ !searchQuery.trim() ? 'Start typing to search users or enter STM public key' : 'No users found' }}
            </span>
          </div>
          <div v-else class="p-1">
            <!-- Favorites section -->
            <div v-if="filteredUsers.some(u => u.isFavorite)">
              <div class="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                Favorites
              </div>
              <button
                v-for="user in filteredUsers.filter(u => u.isFavorite)"
                :key="user.operationalKey"
                class="w-full flex items-center gap-3 px-2 py-2 rounded-sm hover:bg-accent transition-colors text-left"
                :class="{ 'bg-accent': selectedValue === user.operationalKey }"
                @click="selectUser(user)"
              >
                <Avatar class="h-8 w-8 flex-shrink-0">
                  <AvatarImage
                    v-if="user.profileImage"
                    :src="user.profileImage"
                    :alt="user.displayName"
                  />
                  <AvatarFallback class="text-xs">
                    {{ getInitials(user.displayName) }}
                  </AvatarFallback>
                </Avatar>
                <div class="flex-1 min-w-0">
                  <div class="flex items-center gap-1.5">
                    <span class="text-sm font-medium truncate">{{ user.displayName }}</span>
                    <svg
                      width="12"
                      height="12"
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      class="text-yellow-500 flex-shrink-0"
                    >
                      <path
                        style="fill: currentColor"
                        :d="mdiStar"
                      />
                    </svg>
                  </div>
                  <p v-if="user.about" class="text-xs text-muted-foreground truncate">
                    {{ user.about }}
                  </p>
                </div>
                <Check
                  v-if="selectedValue === user.operationalKey"
                  class="h-4 w-4 text-primary flex-shrink-0"
                />
              </button>
            </div>

            <!-- Search results section -->
            <div v-if="filteredUsers.some(u => !u.isFavorite)">
              <div
                v-if="filteredUsers.some(u => u.isFavorite)"
                class="px-2 py-1.5 text-xs font-semibold text-muted-foreground mt-2"
              >
                Search Results
              </div>
              <button
                v-for="user in filteredUsers.filter(u => !u.isFavorite)"
                :key="user.operationalKey"
                class="w-full flex items-center gap-3 px-2 py-2 rounded-sm hover:bg-accent transition-colors text-left"
                :class="{ 'bg-accent': selectedValue === user.operationalKey }"
                @click="selectUser(user)"
              >
                <Avatar class="h-8 w-8 flex-shrink-0">
                  <AvatarImage
                    v-if="user.profileImage"
                    :src="user.profileImage"
                    :alt="user.displayName"
                  />
                  <AvatarFallback class="text-xs">
                    {{ getInitials(user.displayName) }}
                  </AvatarFallback>
                </Avatar>
                <div class="flex-1 min-w-0">
                  <p class="text-sm font-medium truncate">{{ user.displayName }}</p>
                  <p v-if="user.about" class="text-xs text-muted-foreground truncate">
                    {{ user.about }}
                  </p>
                </div>
                <Check
                  v-if="selectedValue === user.operationalKey"
                  class="h-4 w-4 text-primary flex-shrink-0"
                />
              </button>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>

    <Button
      variant="ghost"
      size="icon"
      class="h-full w-10 rounded-none"
      @click="openQrScanner"
    >
      <QrCode class="h-6 w-6" />
    </Button>

    <!-- QR Scanner Component -->
    <QrScanner
      v-model="showQrScanner"
      @scan="handleQrScan"
    />
  </div>
</template>
