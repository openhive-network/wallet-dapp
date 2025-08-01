import type { ApiAccount } from '@hiveio/wax/vite';
import { defineStore } from 'pinia';

interface JsonMetadata {
  profile?: {
    profile_image?: string;
    name?: string;
    about?: string;
    website?: string;
  };
}

export const useUserStore = defineStore('user', {
  state: () => ({
    isReady: false,
    parsedJsonMetadata: undefined as undefined | JsonMetadata,
    userData: undefined as undefined | ApiAccount
  }),
  getters: {
    profileImage: (ctx): undefined | string => ctx.isReady ? ctx.parsedJsonMetadata?.profile?.profile_image : undefined,
    name: (ctx): undefined | string => ctx.isReady ? ctx.parsedJsonMetadata?.profile?.name || ctx.userData?.name : undefined,
    about: (ctx): undefined | string => ctx.isReady ? ctx.parsedJsonMetadata?.profile?.about : undefined,
    website: (ctx): undefined | string => ctx.isReady ? ctx.parsedJsonMetadata?.profile?.website : undefined
  },
  actions: {
    // Used for logout
    resetSettings () {
      this.isReady = false;
      this.parsedJsonMetadata = undefined;
      this.userData = undefined;
    },
    setUserData (data: ApiAccount) {
      this.userData = data;
      try {
        this.parsedJsonMetadata = JSON.parse(data.posting_json_metadata);
      } catch {}
      this.isReady = true;
    }
  }
});
