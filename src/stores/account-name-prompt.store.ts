import { defineStore } from 'pinia';

export class AccountNameEntryCancelledError extends Error {
  public constructor () {
    super('User cancelled account name entry');
    this.name = 'AccountNameEntryCancelledError';
  }
}

type AccountNameResolver = (accountName: string) => void;
type AccountNameRejecter = (error: Error) => void;

export const useAccountNamePromptStore = defineStore('accountNamePrompt', {
  state: () => ({
    isOpen: false,
    _resolve: null as AccountNameResolver | null,
    _reject: null as AccountNameRejecter | null
  }),
  actions: {
    requestAccountName (): Promise<string> {
      return new Promise((resolve, reject) => {
        this._resolve = resolve;
        this._reject = reject;
        this.isOpen = true;
      });
    },

    submitAccountName (accountName: string) {
      if (this._resolve) {
        this._resolve(accountName);
        this._resolve = null;
        this._reject = null;
      }
      this.isOpen = false;
    },

    cancel () {
      if (this._reject) {
        this._reject(new AccountNameEntryCancelledError());
        this._resolve = null;
        this._reject = null;
      }
      this.isOpen = false;
    }
  }
});
