<script setup lang="ts">
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  mdiCheckCircle,
  mdiAlertCircle,
  mdiNumeric1Circle
} from '@mdi/js';
import { computed, ref, watch } from 'vue';
import { toastError } from '@/utils/parse-error';
import { getWax } from '@/stores/wax.store';

interface Props {
  modelValue: string;
  id?: string;
  label?: string;
  placeholder?: string;
  showStepIcon?: boolean;
  class?: string;
  disabled?: boolean;
}

interface Emits {
  (e: 'update:modelValue', value: string): void;
  (e: 'validation-change', isValid: boolean): void;
}

const props = withDefaults(defineProps<Props>(), {
  id: 'account_name',
  label: 'Account Name',
  placeholder: 'Enter your desired account name',
  showStepIcon: false,
  class: '',
  disabled: false
});

const emit = defineEmits<Emits>();

const accountNameValid = ref(false);
const accountNameError = ref('');
const isValidatingName = ref(false);

const accountName = computed({
  get: () => props.modelValue,
  set: (value: string) => emit('update:modelValue', value)
});

const validateAccountName = async () => {
  try {
    isValidatingName.value = true;
    accountNameError.value = '';

    if (!accountName.value) {
      accountNameValid.value = false;
      emit('validation-change', false);
      return;
    }

    const cleanAccountName = accountName.value.startsWith("@") ? accountName.value.slice(1) : accountName.value;
    if (!cleanAccountName) {
      accountNameValid.value = false;
      accountNameError.value = 'Account name cannot be empty';
      emit('validation-change', false);
      return;
    }

    const wax = await getWax();
    const isValid = wax.isValidAccountName(cleanAccountName);

    if (isValid) {
      accountNameValid.value = true;
      accountNameError.value = '';
      emit('validation-change', true);
    } else {
      accountNameValid.value = false;
      accountNameError.value = 'Invalid account name format';
      emit('validation-change', false);
    }

  } catch (error) {
    accountNameError.value = 'Failed to validate account name';
    toastError("Failed to validate account name", error);
    accountNameValid.value = false;
    emit('validation-change', false);
  } finally {
    isValidatingName.value = false;
  }
};

watch(accountName, () => {
  validateAccountName();
});

defineExpose({
  isValid: computed(() => accountNameValid.value),
  error: computed(() => accountNameError.value),
  isValidating: computed(() => isValidatingName.value),
  validate: validateAccountName
});
</script>

<template>
  <div class="space-y-3">
    <div class="flex items-center space-x-2">
      <svg v-if="showStepIcon" width="18" height="18" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
        <path style="fill: hsl(var(--primary))" :d="mdiNumeric1Circle"/>
      </svg>
      <Label :for="id" class="text-base font-semibold">{{ label }}</Label>
    </div>
    <div class="relative">
      <Input
        :id="id"
        v-model="accountName"
        :placeholder="placeholder"
        :disabled="disabled"
        :class="[
          {
            'border-red-500': accountName && !accountNameValid && accountNameError,
            'border-green-500': accountNameValid,
            'pr-10': isValidatingName || accountNameValid
          },
          'w-full',
          props.class
        ]"
      />
      <div v-if="isValidatingName || accountNameValid" class="absolute inset-y-0 right-0 flex items-center pr-3">
        <svg v-if="isValidatingName" class="animate-spin h-4 w-4 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        <svg v-else-if="accountNameValid" width="16" height="16" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
          <path style="fill: rgb(34 197 94)" :d="mdiCheckCircle"/>
        </svg>
      </div>
    </div>
    <div v-if="accountNameError" class="flex items-start space-x-2 text-sm text-red-600">
      <svg width="14" height="14" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="mt-0.5 flex-shrink-0">
        <path style="fill: currentColor" :d="mdiAlertCircle"/>
      </svg>
      <span>{{ accountNameError }}</span>
    </div>
    <div v-else-if="accountNameValid" class="flex items-center justify-center space-x-2 text-sm text-green-600">
      <svg width="14" height="14" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
        <path style="fill: currentColor" :d="mdiCheckCircle"/>
      </svg>
      <span>Valid account name</span>
    </div>
  </div>
</template>
