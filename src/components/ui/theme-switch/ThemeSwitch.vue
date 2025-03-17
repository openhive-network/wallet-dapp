<script setup lang="ts">
// https://web.dev/patterns/theming/theme-switch

import { onMounted, ref } from 'vue';

type Preference = 'light' | 'dark';

const storageKey = 'theme-preference';

const themePreference = ref<Preference | undefined>();

const switchPreference = () => {
  setPreference(themePreference.value = themePreference.value === 'light' ? 'dark' : 'light');
};

const reflectPreference = () => {
  if (themePreference.value === 'dark')
    document.documentElement.classList.add('dark');
  else
    document.documentElement.classList.remove('dark');
};

const setPreference = (value: Preference) => {
  localStorage.setItem(storageKey, value);

  reflectPreference();
};

onMounted(() => {
  const media = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : undefined;

  const getColorPreference = (): Preference => {
    if (localStorage.getItem(storageKey))
      return localStorage.getItem(storageKey) as Preference;
    else
      return media?.matches ? 'dark' : 'light';
  };

  themePreference.value = getColorPreference();

  reflectPreference();

  media?.addEventListener('change', ({ matches: isDark }) => {
    setPreference(isDark ? 'dark' : 'light')
  });
});

const props = defineProps<{
  class?: string;
}>();
</script>

<template>
  <button :class="['theme-toggle', props.class]" id="theme-toggle" title="Toggles light & dark" @click="switchPreference" aria-live="polite">
    <svg :class="['sun-and-moon', props.class]" aria-hidden="true" width="24" height="24" viewBox="0 0 24 24">
      <mask class="moon" id="moon-mask">
        <rect x="0" y="0" width="100%" height="100%" fill="white" />
        <circle cx="24" cy="10" r="6" fill="black" />
      </mask>
      <circle class="sun" cx="12" cy="12" r="6" mask="url(#moon-mask)" fill="currentColor" />
      <g class="sun-beams" stroke="currentColor">
        <line x1="12" y1="1" x2="12" y2="3" />
        <line x1="12" y1="21" x2="12" y2="23" />
        <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
        <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
        <line x1="1" y1="12" x2="3" y2="12" />
        <line x1="21" y1="12" x2="23" y2="12" />
        <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
        <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
      </g>
    </svg>
  </button>
</template>

<style scoped>
.sun-and-moon > :is(.moon, .sun, .sun-beams) {
  transform-origin: center;
}

.sun-and-moon > :is(.moon, .sun) {
  fill: hsl(var(--foreground));
}

.theme-toggle:is(:hover, :focus-visible) > .sun-and-moon > :is(.moon, .sun) {
  fill: hsla(var(--foreground) / 80%);
}

.sun-and-moon > .sun-beams {
  stroke: hsl(var(--foreground));
  stroke-width: 2px;
}

.theme-toggle:is(:hover, :focus-visible) .sun-and-moon > .sun-beams {
  stroke: hsla(var(--foreground) / 80%);
}

.dark .sun-and-moon > .sun {
  transform: scale(1.75);
}

.dark .sun-and-moon > .sun-beams {
  opacity: 0;
}

.dark .sun-and-moon > .moon > circle {
  transform: translateX(-7px);
}

@supports (cx: 1) {
  .dark .sun-and-moon > .moon > circle {
    cx: 17;
    transform: translateX(0);
  }
}

@media (prefers-reduced-motion: no-preference) {
  .sun-and-moon > .sun {
    transition: transform .5s cubic-bezier(.5,1.25,.75,1.25);
  }

  .sun-and-moon > .sun-beams {
    transition: transform .5s cubic-bezier(.5,1.5,.75,1.25), opacity .5s cubic-bezier(.25,0,.3,1);
  }

  .sun-and-moon .moon > circle {
    transition: transform .25s cubic-bezier(0,0,0,1);
  }

  @supports (cx: 1) {
    .sun-and-moon .moon > circle {
      transition: cx .25s cubic-bezier(0,0,0,1);
    }
  }

  .dark .sun-and-moon > .sun {
    transition-timing-function: cubic-bezier(.25,0,.3,1);
    transition-duration: .25s;
    transform: scale(1.75);
  }

  .dark .sun-and-moon > .sun-beams {
    transition-duration: .15s;
    transform: rotateZ(-25deg);
  }

  .dark .sun-and-moon > .moon > circle {
    transition-duration: .5s;
    transition-delay: .25s;
  }
}
</style>
