<script setup lang="ts">
import type { HTMLAttributes } from 'vue'
import { computed } from 'vue'
import { cn } from '@/lib/utils'
import { type AlertVariants, alertVariants } from '.'
import { mdiInformation, mdiAlertOctagon, mdiAlertCircle, mdiCheckCircle } from '@mdi/js'

const props = defineProps<{
  class?: HTMLAttributes['class']
  variant?: AlertVariants['variant']
  role?: 'alert' | 'status' | 'loader'
  disableIcon?: boolean
}>()

const iconClass = computed(() => {
  const baseClass = 'w-6 h-6 mr-2 -mt-1 flex-shrink-0'
  switch (props.variant) {
    case 'info':
      return `${baseClass} text-blue-500`
    case 'loading':
      return `${baseClass} text-blue-500`
    case 'warning':
      return `${baseClass} text-orange-500`
    case 'destructive':
      return `${baseClass} text-red-500`
    case 'success':
      return `${baseClass} text-green-500`
    default:
      return `${baseClass} text-gray-500`
  }
})

const defaultIcon = computed(() => {
  switch (props.variant) {
    case 'info':
      return mdiInformation
    case 'warning':
      return mdiAlertOctagon
    case 'destructive':
      return mdiAlertCircle
    case 'success':
      return mdiCheckCircle
    default:
      return mdiInformation
  }
})
</script>

<template>
  <div :class="cn(alertVariants({ variant }), props.class)" :role="props.role || 'alert'">
    <div class="flex items-start">
      <!-- Loading spinner or icon -->
      <div v-if="props.variant === 'loading'" class="animate-spin rounded-full h-4 w-4 border-b-2 mr-2 -mt-0.5 flex-shrink-0 border-blue-500" />
      <svg
        v-else-if="!props.disableIcon"
        :class="iconClass"
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
      >
        <path
          fill="currentColor"
          :d="defaultIcon"
        />
      </svg>

      <!-- Content -->
      <div class="flex-1">
        <slot />
      </div>
    </div>
  </div>
</template>
