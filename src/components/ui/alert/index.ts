import { cva, type VariantProps } from 'class-variance-authority'

export { default as Alert } from './Alert.vue'
export { default as AlertDescription } from './AlertDescription.vue'
export { default as AlertTitle } from './AlertTitle.vue'

export const alertVariants = cva(
  'relative w-full border-l-4 p-4 [&>svg]:flex-shrink-0',
  {
    variants: {
      variant: {
        default: 'bg-background text-foreground border-l-gray-500',
        destructive: 'bg-red-700/5 border-l-red-700 [&_h5]:text-red-500',
        warning: 'bg-orange-700/5 border-l-orange-700 [&_h5]:text-orange-500',
        info: 'bg-blue-700/5 border-l-blue-700 [&_h5]:text-blue-500',
        loading: 'bg-blue-700/5 border-l-blue-700 [&_h5]:text-blue-500',
        success: 'bg-green-700/5 border-l-green-700 [&_h5]:text-green-500',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
)

export type AlertVariants = VariantProps<typeof alertVariants>
