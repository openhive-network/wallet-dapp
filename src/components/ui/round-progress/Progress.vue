<script setup lang="ts">
import { computed } from "vue"
import { cn } from "@/lib/utils"

const props = withDefaults(
  defineProps<{
    max?: number
    value?: number
    min?: number
    gaugePrimaryColor: string
    gaugeSecondaryColor: string
    className?: string
  }>(),
  {
    max: 100,
    min: 0,
    value: 0,
  },
)

const circumference = 2 * Math.PI * 45
const percentPx = circumference / 100
const currentPercent = computed(() =>
  ((props.value - props.min) / (props.max - props.min)) * 100,
)

const rootStyle = computed(() => ({
  "--circle-size": "100px",
  "--circumference": circumference,
  "--percent-to-px": `${percentPx}px`,
  "--gap-percent": "5",
  "--offset-factor": "0",
  "--transition-length": "1s",
  "--transition-step": "200ms",
  "--delay": "0s",
  "--percent-to-deg": "3.6deg",
  transform: "translateZ(0)",
}))

const secondaryCircleStyle = computed(() => ({
  stroke: props.gaugeSecondaryColor,
  "--stroke-percent": 90 - currentPercent.value,
  "--offset-factor-secondary": "calc(1 - var(--offset-factor))",
  "stroke-dasharray":
    "calc(var(--stroke-percent) * var(--percent-to-px)) var(--circumference)",
  transform:
    "rotate(calc(1turn - 90deg - (var(--gap-percent) * var(--percent-to-deg) * var(--offset-factor-secondary)))) scaleY(-1)",
  transition: "all var(--transition-length) ease var(--delay)",
  "transform-origin":
    "calc(var(--circle-size) / 2) calc(var(--circle-size) / 2)",
}))

const primaryCircleStyle = computed(() => ({
  stroke: props.gaugePrimaryColor,
  "--stroke-percent": currentPercent.value,
  "stroke-dasharray":
    "calc(var(--stroke-percent) * var(--percent-to-px)) var(--circumference)",
  transition:
    "var(--transition-length) ease var(--delay),stroke var(--transition-length) ease var(--delay)",
  "transition-property": "stroke-dasharray,transform",
  transform:
    "rotate(calc(-90deg + var(--gap-percent) * var(--offset-factor) * var(--percent-to-deg)))",
  "transform-origin":
    "calc(var(--circle-size) / 2) calc(var(--circle-size) / 2)",
}))
</script>

<template>
  <div
    :class="cn('relative size-40 text-2xl font-semibold', className)"
    :style="rootStyle"
  >
    <svg
      fill="none"
      class="size-full"
      stroke-width="2"
      viewBox="0 0 100 100"
    >
      <circle
        v-if="currentPercent <= 90 && currentPercent >= 0"
        cx="50"
        cy="50"
        r="45"
        stroke-width="10"
        stroke-dashoffset="0"
        stroke-linecap="round"
        stroke-linejoin="round"
        class="opacity-100"
        :style="secondaryCircleStyle"
      />
      <circle
        cx="50"
        cy="50"
        r="45"
        stroke-width="10"
        stroke-dashoffset="0"
        stroke-linecap="round"
        stroke-linejoin="round"
        class="opacity-100"
        :style="primaryCircleStyle"
      />
    </svg>
    <span
      :data-current-value="currentPercent"
      class="[transition-duration:var(--transition-length)] [transition-delay:var(--delay)] absolute inset-0 m-auto size-fit ease-linear animate-in fade-in"
    >
      {{ currentPercent.toFixed(2) }}%
    </span>
  </div>
</template>

