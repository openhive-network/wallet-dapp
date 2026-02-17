<script setup lang="ts">
import { mdiArrowLeft } from '@mdi/js';
import { useElementBounding, useMediaQuery } from '@vueuse/core';
import { RotateCcw, Shield, Layers, Palette, Zap } from 'lucide-vue-next';

import BadgeCustomization from '@/components/badge-builder/BadgeCustomization.vue';
import BadgeOutput from '@/components/badge-builder/BadgeOutput.vue';
import BadgePreview from '@/components/badge-builder/BadgePreview.vue';
import BadgeTemplates from '@/components/badge-builder/BadgeTemplates.vue';
import DynamicBadgeForm from '@/components/badge-builder/DynamicBadgeForm.vue';
import EndpointBadgeForm from '@/components/badge-builder/EndpointBadgeForm.vue';
import StaticBadgeForm from '@/components/badge-builder/StaticBadgeForm.vue';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TooltipProvider } from '@/components/ui/tooltip';
import { useBadge } from '@/composables/useBadge';
import type { BadgeType } from '@/composables/useBadge';

definePageMeta({
  layout: 'htm',
  isPublicPage: true
});

const { config, resetConfig } = useBadge();

const activeTab = computed({
  get: () => {
    if (config.value.type === 'static') return 'static';
    if (config.value.type === 'endpoint') return 'endpoint';
    return 'dynamic';
  },
  set: (tab: string) => {
    if (tab === 'static') config.value.type = 'static';
    else if (tab === 'endpoint') config.value.type = 'endpoint';
    else if (!config.value.type.startsWith('dynamic-')) config.value.type = 'dynamic-json' as BadgeType;
  }
});

// Sticky left panel — only pins once the user scrolls it to the header edge
const isDesktop = useMediaQuery('(min-width: 1024px)');
const asidePlaceholderRef = ref<HTMLElement | null>(null);
const { left: asideLeft, width: asideWidth, top: asideTop } = useElementBounding(asidePlaceholderRef);

const HEADER_OFFSET = 76; // 60px header + 16px breathing room

const shouldPin = computed(() => isDesktop.value && asideTop.value <= HEADER_OFFSET);

const asideStyle = computed(() => {
  if (!shouldPin.value) return {};
  return {
    position: 'fixed' as const,
    top: `${HEADER_OFFSET}px`,
    bottom: '24px',
    left: `${asideLeft.value}px`,
    width: `${asideWidth.value}px`,
    overflowY: 'auto' as const
  };
});
</script>

<template>
  <TooltipProvider>
    <div class="container mx-auto py-4 sm:py-6 space-y-6 px-2 sm:px-4">
      <!-- Navigation + Actions -->
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <NuxtLink
          to="/tokens/list"
          class="keychainify-checked"
        >
          <Button
            variant="ghost"
            size="sm"
            class="gap-2 hover:bg-accent"
          >
            <svg
              width="16"
              height="16"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              class="flex-shrink-0"
            >
              <path
                style="fill: currentColor"
                :d="mdiArrowLeft"
              />
            </svg>
            <span class="hidden sm:inline">Back to Tokens</span>
            <span class="sm:hidden">Back</span>
          </Button>
        </NuxtLink>
        <Button
          variant="outline"
          size="sm"
          @click="resetConfig"
        >
          <RotateCcw class="size-4 sm:mr-2" />
          <span class="hidden sm:inline">Reset All</span>
        </Button>
      </div>

      <!-- Page Title -->
      <div>
        <h1 class="text-2xl sm:text-3xl font-bold tracking-tight flex items-center gap-2">
          <Shield class="size-6 sm:size-7 text-primary" />
          Badge Builder
        </h1>
        <p class="text-muted-foreground text-sm sm:text-base mt-1">
          Design custom status badges for your projects &mdash; just follow the steps below
        </p>
      </div>
    </div>

    <!-- Two-column layout: left panel fixed on desktop, page scrolls normally -->
    <div class="lg:grid lg:grid-cols-[400px_1fr] lg:gap-6 container mx-auto px-2 sm:px-4 pb-6">
      <!-- Left Panel: placeholder reserves space in grid, content is fixed on desktop -->
      <div ref="asidePlaceholderRef" class="lg:self-start">
        <aside
          class="space-y-4"
          :style="asideStyle"
        >
          <BadgePreview />
          <BadgeOutput />
        </aside>
      </div>

      <!-- Right Panel: Guided Steps -->
      <div class="mt-6 lg:mt-0 space-y-6">
        <!-- Step 1: Quick Start Templates -->
        <section class="space-y-3">
          <div class="flex items-center gap-3">
            <span class="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold text-xs">
              1
            </span>
            <div>
              <h2 class="text-sm font-semibold tracking-tight">Pick a template</h2>
              <p class="text-xs text-muted-foreground">Click any badge below to start quickly, or skip to configure from scratch</p>
            </div>
          </div>
          <BadgeTemplates />
        </section>

        <!-- Step 2: Badge Type & Configuration -->
        <Card>
          <CardHeader class="pb-4">
            <div class="flex items-center gap-3">
              <span class="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold text-xs">
                2
              </span>
              <div>
                <CardTitle class="flex items-center gap-2 text-base">
                  <Layers class="size-4 text-primary" />
                  Configure your badge
                </CardTitle>
                <CardDescription>
                  Choose how your badge gets its data
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Tabs
              v-model="activeTab"
              class="w-full"
            >
              <TabsList class="mb-4 grid w-full grid-cols-3">
                <TabsTrigger value="static">
                  Static
                </TabsTrigger>
                <TabsTrigger value="dynamic">
                  Dynamic
                </TabsTrigger>
                <TabsTrigger value="endpoint">
                  Endpoint
                </TabsTrigger>
              </TabsList>

              <!-- Tab hint text -->
              <p class="text-[11px] text-muted-foreground mb-3">
                <template v-if="activeTab === 'static'">
                  <Zap class="size-3 inline mr-1 text-primary" />
                  Static badges display fixed text &mdash; perfect for status labels, versions, and licenses.
                </template>
                <template v-else-if="activeTab === 'dynamic'">
                  <Zap class="size-3 inline mr-1 text-primary" />
                  Dynamic badges fetch live data from a JSON, XML, YAML, or TOML endpoint.
                </template>
                <template v-else>
                  <Zap class="size-3 inline mr-1 text-primary" />
                  Endpoint badges read badge configuration from a JSON endpoint on your server.
                </template>
              </p>

              <div>
                <StaticBadgeForm v-show="activeTab === 'static'" />
                <DynamicBadgeForm v-show="activeTab === 'dynamic'" />
                <EndpointBadgeForm v-show="activeTab === 'endpoint'" />
              </div>
            </Tabs>
          </CardContent>
        </Card>

        <!-- Step 3: Appearance Customization -->
        <Card>
          <CardHeader class="pb-4">
            <div class="flex items-center gap-3">
              <span class="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold text-xs">
                3
              </span>
              <div>
                <CardTitle class="flex items-center gap-2 text-base">
                  <Palette class="size-4 text-primary" />
                  Customize appearance
                </CardTitle>
                <CardDescription>
                  Fine-tune the style, colors, and logo to match your brand
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <BadgeCustomization />
          </CardContent>
        </Card>
      </div>
    </div>
  </TooltipProvider>
</template>

