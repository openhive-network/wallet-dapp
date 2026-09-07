import { defineStore } from 'pinia';

import { toAccountRequestError } from '@/utils/account-request/errors';

import type {
  AccountRequestClaimBody,
  AccountRequestClaimResponse,
  AccountRequestStatusResponse,
  AccountRequestTokenResponse,
  AccountRequestVerifyResponse
} from '#shared/types/account-request';


/** Client side gateway to the account request (QR onboarding) API */
export const useAccountRequestStore = defineStore('account-request', {
  state: () => ({
    /** Whether the module is configured on the server - `undefined` until checked */
    isEnabled: undefined as boolean | undefined,
    verification: undefined as AccountRequestVerifyResponse | undefined,
    isVerifying: false,
    isClaiming: false,
    lastClaim: undefined as AccountRequestClaimResponse | undefined
  }),
  getters: {
    isTokenValid: state => state.verification?.valid === true
  },
  actions: {
    /** The module is optional - when the server is not configured for it, the UI hides the feature */
    async checkAvailability (): Promise<boolean> {
      try {
        const { enabled } = await $fetch<AccountRequestStatusResponse>('/api/account-request/status');
        this.isEnabled = enabled;
      } catch {
        this.isEnabled = false;
      }

      return this.isEnabled;
    },

    async fetchRequestToken (): Promise<AccountRequestTokenResponse> {
      try {
        return await $fetch<AccountRequestTokenResponse>('/api/account-request/token');
      } catch (error) {
        throw toAccountRequestError(error);
      }
    },

    /** Read-only check - never claims the token */
    async verifyToken (token: string): Promise<AccountRequestVerifyResponse> {
      this.isVerifying = true;

      try {
        this.verification = await $fetch<AccountRequestVerifyResponse>('/api/account-request/verify', { query: { token } });

        return this.verification;
      } catch (error) {
        this.verification = undefined;
        throw toAccountRequestError(error);
      } finally {
        this.isVerifying = false;
      }
    },

    /** The real account creation request - claims (locks) the token on the backend */
    async claimAccount (body: AccountRequestClaimBody): Promise<AccountRequestClaimResponse> {
      this.isClaiming = true;

      try {
        this.lastClaim = await $fetch<AccountRequestClaimResponse>('/api/account-request/claim', { method: 'POST', body });

        return this.lastClaim;
      } catch (error) {
        throw toAccountRequestError(error);
      } finally {
        this.isClaiming = false;
      }
    },

    reset () {
      this.verification = undefined;
      this.lastClaim = undefined;
    }
  }
});
