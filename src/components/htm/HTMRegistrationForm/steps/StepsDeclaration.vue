<script setup lang="ts">
import { mdiCheckCircle, mdiNumeric1Circle, mdiNumeric2Circle, mdiNumeric3Circle } from '@mdi/js';

import { HTM_REGISTRATION_KEY } from '@/components/htm/HTMRegistrationForm/types';
import type { HTMRegistrationContext } from '@/components/htm/HTMRegistrationForm/types';

// Inject the registration context from parent
const { isBasicInfoValid, keysGenerated, hasConfirmedDownload } = inject<HTMRegistrationContext>(HTM_REGISTRATION_KEY)!;

// Step tracking for improved UX (similar to Hive account creation)
const currentStep = computed(() => {
  if (!isBasicInfoValid.value) return 1;
  if (!keysGenerated.value) return 2;
  if (!hasConfirmedDownload.value) return 3;
  return 3;
});

const stepStatus = computed(() => ({
  step1: {
    completed: isBasicInfoValid.value,
    current: currentStep.value === 1,
    icon: mdiNumeric1Circle,
    title: 'Account Info',
    description: 'Basic information'
  },
  step2: {
    completed: keysGenerated.value,
    current: currentStep.value === 2,
    icon: mdiNumeric2Circle,
    title: 'Generate Keys',
    description: 'Auto-create HTM keys'
  },
  step3: {
    completed: hasConfirmedDownload.value,
    current: currentStep.value === 3,
    icon: mdiNumeric3Circle,
    title: 'Confirm & Register',
    description: 'Save keys & register'
  }
}));
</script>

<template>
  <div class="grid grid-cols-3 gap-2 mb-6">
    <div
      v-for="(step, key) in stepStatus"
      :key="key"
      class="flex flex-col items-center text-center"
    >
      <div
        class="w-8 h-8 rounded-full flex items-center justify-center mb-2 transition-all duration-200"
        :class="{
          'bg-green-100 text-green-600': step.completed,
          'bg-blue-100 text-blue-600': step.current && !step.completed,
          'bg-gray-100 text-gray-400': !step.current && !step.completed
        }"
      >
        <svg
          v-if="step.completed"
          width="16"
          height="16"
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
        >
          <path
            style="fill: currentColor"
            :d="mdiCheckCircle"
          />
        </svg>
        <svg
          v-else
          width="16"
          height="16"
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
        >
          <path
            style="fill: currentColor"
            :d="step.icon"
          />
        </svg>
      </div>
      <div class="text-xs">
        <p
          class="font-medium transition-colors duration-200"
          :class="{
            'text-green-600': step.completed,
            'text-blue-600': step.current && !step.completed,
            'text-gray-500': !step.current && !step.completed
          }"
        >
          {{ step.title }}
        </p>
        <p class="text-gray-400 mt-1">
          {{ step.description }}
        </p>
      </div>
    </div>
  </div>
</template>
