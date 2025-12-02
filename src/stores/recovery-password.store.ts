import { defineStore } from 'pinia';

export class PasswordEntryCancelledError extends Error {
  public constructor () {
    super('User cancelled password entry');
    this.name = 'PasswordEntryCancelledError';
  }
}

type PasswordResolver = (password: string) => void;
type PasswordRejecter = (error: Error) => void;

export const useRecoveryPasswordStore = defineStore('recoveryPassword', {
  state: () => ({
    isOpen: false,
    _resolve: null as PasswordResolver | null,
    _reject: null as PasswordRejecter | null
  }),
  actions: {
    requestPassword (): Promise<string> {
      return new Promise((resolve, reject) => {
        this._resolve = resolve;
        this._reject = reject;
        this.isOpen = true;
      });
    },

    submitPassword (password: string) {
      if (this._resolve) {
        this._resolve(password);
        this._resolve = null;
        this._reject = null;
      }
      this.isOpen = false;
    },

    cancel () {
      if (this._reject) {
        this._reject(new PasswordEntryCancelledError());
        this._resolve = null;
        this._reject = null;
      }
      this.isOpen = false;
    }
  }
});
