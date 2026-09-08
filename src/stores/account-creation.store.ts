import { defineStore } from 'pinia';

import { getWax } from '@/stores/wax.store';
import { generateAccountNameCandidates } from '@/utils/account-name-suggestions';

/** Candidates are checked against the chain in batches - one request per batch */
const SUGGESTION_BATCH_SIZE = 5;
const SUGGESTION_MAX_BATCHES = 3;

export const useAccountCreationStore = defineStore('account-creation', {
  state: () => ({
    isCreationLinkCopied: false
  }),

  actions: {
    resetCopyState () {
      this.isCreationLinkCopied = false;
    },

    /** Random account name that passes the chain's format rules and is not registered yet */
    async suggestAvailableAccountName (): Promise<string> {
      const wax = await getWax();

      for (let batch = 0; batch < SUGGESTION_MAX_BATCHES; ++batch) {
        const candidates = generateAccountNameCandidates(SUGGESTION_BATCH_SIZE).filter(name => wax.isValidAccountName(name));
        const response = await wax.api.database_api.find_accounts({ accounts: candidates });
        const taken = new Set((response?.accounts ?? []).map(account => account.name));
        const available = candidates.find(name => !taken.has(name));

        if (available)
          return available;
      }

      throw new Error('All suggested account names are already taken');
    }
  }
});
