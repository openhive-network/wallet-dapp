import { defineStore } from 'pinia';

export const useAccountCreationStore = defineStore('account-creation', {
  state: () => ({
    isCreationLinkCopied: false
  }),

  actions: {
    resetCopyState () {
      this.isCreationLinkCopied = false;
    }
  }
});
