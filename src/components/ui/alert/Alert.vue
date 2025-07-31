<script setup lang="ts">
import type { HTMLAttributes } from 'vue'
import { computed } from 'vue'
import { cn } from '@/lib/utils'
import { type AlertVariants, alertVariants } from '.'

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
      return 'M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2M11,7H13V9H11V7M11,11H13V17H11V11Z' // info circle
    case 'warning':
      return 'M13,13H11V7H13M12,17.3A1.3,1.3 0 0,1 10.7,16A1.3,1.3 0 0,1 12,14.7A1.3,1.3 0 0,1 13.3,16A1.3,1.3 0 0,1 12,17.3M15.73,3H8.27L3,8.27V15.73L8.27,21H15.73L21,15.73V8.27L15.73,3Z' // warning
    case 'destructive':
      return 'M13,13H11V7H13M13,17H11V15H13M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2Z' // error
    case 'success':
      return 'M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2M11,16.5L6.5,12L7.91,10.59L11,13.67L16.59,8.09L18,9.5L11,16.5Z' // check circle
    default:
      return 'M13,9H11V7H13M13,17H11V11H13M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2Z' // info circle
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
