import { defineStore } from 'pinia';

export interface FavoriteAccount {
  operationalKey: string;
  displayName?: string;
  name?: string;
  profileImage?: string;
  about?: string;
  addedAt: number; // timestamp
}

export interface FavoriteToken {
  nai: string;
  symbol: string;
  name?: string;
  image?: string;
  addedAt: number; // timestamp
}

interface FavoritesData {
  accounts: FavoriteAccount[];
  tokens: FavoriteToken[];
}

const STORAGE_KEY = 'htm-favorites';

export const useFavoritesStore = defineStore('favorites', {
  state: () => ({
    accounts: [] as FavoriteAccount[],
    tokens: [] as FavoriteToken[]
  }),

  getters: {
    favoriteAccountsCount: (state) => state.accounts.length,
    favoriteTokensCount: (state) => state.tokens.length,

    favoriteAccountKeys: (state) => new Set(state.accounts.map(acc => acc.operationalKey)),

    favoriteTokenNais: (state) => new Set(state.tokens.map(token => token.nai))
  },

  actions: {
    // Load from localStorage
    loadFromStorage() {
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          const data: FavoritesData = JSON.parse(stored);
          this.accounts = data.accounts || [];
          this.tokens = data.tokens || [];
        }
      } catch (error) {
        console.error('Failed to load favorites from storage:', error);
        this.accounts = [];
        this.tokens = [];
      }
    },

    // Save to localStorage
    saveToStorage() {
      try {
        const data: FavoritesData = {
          accounts: this.accounts,
          tokens: this.tokens
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      } catch (error) {
        console.error('Failed to save favorites to storage:', error);
      }
    },

    // Account methods
    isAccountFavorited(operationalKey: string): boolean {
      return this.favoriteAccountKeys.has(operationalKey);
    },

    addAccountToFavorites(account: Omit<FavoriteAccount, 'addedAt'>) {
      if (this.isAccountFavorited(account.operationalKey)) {
        return;
      }

      this.accounts.push({
        ...account,
        addedAt: Date.now()
      });
      this.saveToStorage();
    },

    removeAccountFromFavorites(operationalKey: string) {
      this.accounts = this.accounts.filter(acc => acc.operationalKey !== operationalKey);
      this.saveToStorage();
    },

    toggleAccountFavorite(account: Omit<FavoriteAccount, 'addedAt'>) {
      if (this.isAccountFavorited(account.operationalKey)) {
        this.removeAccountFromFavorites(account.operationalKey);
      } else {
        this.addAccountToFavorites(account);
      }
    },

    updateAccountInfo(operationalKey: string, updates: Partial<Omit<FavoriteAccount, 'operationalKey' | 'addedAt'>>) {
      const index = this.accounts.findIndex(acc => acc.operationalKey === operationalKey);
      if (index !== -1) {
        this.accounts[index] = {
          ...this.accounts[index],
          ...updates
        } as FavoriteAccount;
        this.saveToStorage();
      }
    },

    // Token methods
    isTokenFavorited(nai: string): boolean {
      return this.favoriteTokenNais.has(nai);
    },

    addTokenToFavorites(token: Omit<FavoriteToken, 'addedAt'>) {
      if (this.isTokenFavorited(token.nai)) {
        return;
      }

      this.tokens.push({
        ...token,
        addedAt: Date.now()
      });
      this.saveToStorage();
    },

    removeTokenFromFavorites(nai: string) {
      this.tokens = this.tokens.filter(token => token.nai !== nai);
      this.saveToStorage();
    },

    toggleTokenFavorite(token: Omit<FavoriteToken, 'addedAt'>) {
      if (this.isTokenFavorited(token.nai)) {
        this.removeTokenFromFavorites(token.nai);
      } else {
        this.addTokenToFavorites(token);
      }
    },

    // General methods
    clearAll() {
      this.accounts = [];
      this.tokens = [];
      this.saveToStorage();
    },

    clearAccounts() {
      this.accounts = [];
      this.saveToStorage();
    },

    clearTokens() {
      this.tokens = [];
      this.saveToStorage();
    },

    // Export data for backup (minimal format)
    exportFavorites() {
      return {
        accounts: this.accounts.map(acc => acc.operationalKey),
        tokens: this.tokens.map(token => token.nai)
      };
    },

    // Import data from backup (validates format)
    importFavorites(data: { accounts?: string[]; tokens?: string[] }) {
      const importedAccounts: string[] = [];
      const importedTokens: string[] = [];
      const errors: string[] = [];

      // Process accounts
      if (Array.isArray(data.accounts)) {
        for (const item of data.accounts) {
          if (typeof item === 'string' && item.trim()) {
            importedAccounts.push(item.trim());
          } else {
            errors.push(`Invalid account format: ${JSON.stringify(item)}`);
          }
        }
      }

      // Process tokens
      if (Array.isArray(data.tokens)) {
        for (const item of data.tokens) {
          if (typeof item === 'string' && item.trim()) {
            importedTokens.push(item.trim());
          } else {
            errors.push(`Invalid token format: ${JSON.stringify(item)}`);
          }
        }
      }

      // Merge with existing favorites (avoid duplicates)
      const existingAccountKeys = new Set(this.accounts.map(acc => acc.operationalKey));
      const existingTokenNais = new Set(this.tokens.map(token => token.nai));

      const newAccounts = importedAccounts.filter(key => !existingAccountKeys.has(key));
      const newTokens = importedTokens.filter(nai => !existingTokenNais.has(nai));

      // Add new favorites
      newAccounts.forEach(operationalKey => {
        this.accounts.push({
          operationalKey,
          addedAt: Date.now()
        });
      });

      newTokens.forEach(nai => {
        this.tokens.push({
          nai,
          symbol: '', // Will be populated when viewed
          addedAt: Date.now()
        });
      });

      this.saveToStorage();

      return {
        accountsImported: newAccounts.length,
        tokensImported: newTokens.length,
        errors
      };
    }
  }
});
