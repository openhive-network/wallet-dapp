<script setup lang="ts">
import { toRaw } from 'vue';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useErrorDialogStore } from '@/stores/error-dialog.store';

const errorStore = useErrorDialogStore();

const updateOpen = (value: boolean) => {
  if (value === false)
    errorStore.closeError();
};

const logOriginator = () => {
  /* eslint-disable-next-line no-console */
  console.error(toRaw(errorStore.originator));
};

const createErrorText = () => `${errorStore.title} - ${errorStore.description}`;
</script>

<template>
  <Dialog
    :open="errorStore.hasError"
    class="max-w-[90vw]"
    @update:open="updateOpen"
  >
    <DialogContent data-testid="error-dialog" class="max-w-[95vw] sm:max-w-[600px] md:max-w-[700px] lg:max-w-[800px] grid-rows-[auto_minmax(0,1fr)_auto] p-0 max-h-[90dvh]">
      <DialogHeader class="p-6 pb-0">
        <DialogTitle>{{ errorStore.title }}</DialogTitle>
        <DialogDescription>
          Read the error message below to understand what went wrong.
        </DialogDescription>
      </DialogHeader>
      <div class="py-4 overflow-y-auto px-6">
        <code>
          <pre class="break-all whitespace-pre-wrap">{{ errorStore.description }}</pre>
        </code>
      </div>
      <DialogFooter class="p-6 pt-0">
        <Button
          data-testid="error-log-btn"
          variant="secondary"
          @click="logOriginator"
        >
          Log error to console
        </Button>
        <Button data-testid="error-copy-btn" :copy="createErrorText">
          Copy error message
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
