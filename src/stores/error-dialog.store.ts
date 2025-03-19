import { defineStore } from "pinia"

export const useErrorDialogStore = defineStore('errorDialog', {
  state: () => ({
    title: undefined as undefined | string,
    originator: undefined as unknown,
    description: undefined as undefined | string
  }),
  getters: {
    hasError: ctx => ctx.title !== undefined
  },
  actions: {
    closeError() {
      this.title = undefined;
      this.originator = undefined;
      this.description = undefined;
    },
    setError(title: string, originator: unknown, description?: string) {
      this.title = title;
      this.originator = originator;
      this.description = description;
    }
  }
})
