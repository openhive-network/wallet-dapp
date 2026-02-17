<script setup lang="ts">
import { generateBadgeUrl, BADGE_TEMPLATES, useBadge } from '@/composables/useBadge';
import type { BadgeConfig } from '@/composables/useBadge';

const { applyTemplate } = useBadge();

function getTemplateUrl (template: typeof BADGE_TEMPLATES[number]): string {
  return generateBadgeUrl({
    type: 'static',
    label: template.label,
    message: template.message,
    color: template.color,
    logo: template.logo,
    style: template.style,
    dataUrl: '',
    query: '',
    prefix: '',
    suffix: '',
    labelColor: '',
    logoMode: 'simple-icons',
    logoColor: '',
    logoSize: '',
    customLogoSvg: '',
    messageDynamic: false
  } satisfies BadgeConfig);
}
</script>

<template>
  <div class="rounded-xl border border-border bg-card/50 p-3 sm:p-4">
    <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
      <button
        v-for="template in BADGE_TEMPLATES"
        :key="template.name"
        class="group flex flex-col items-center gap-1.5 rounded-lg border border-transparent p-2.5 transition-all hover:border-border hover:bg-accent/60 active:scale-[0.97]"
        :title="template.name"
        @click="applyTemplate(template)"
      >
        <img
          :src="getTemplateUrl(template)"
          :alt="template.name"
          class="h-5 transition-transform group-hover:scale-105"
        >
        <span class="text-[10px] leading-tight text-muted-foreground/70 group-hover:text-foreground transition-colors">
          {{ template.name }}
        </span>
      </button>
    </div>
  </div>
</template>
