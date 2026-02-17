<script setup lang="ts">
import AvatarBuilder from '@/components/badge-builder/AvatarBuilder.vue';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { useBadge, NAMED_COLORS, BADGE_STYLES } from '@/composables/useBadge';

const { config } = useBadge();

function getColorPreviewStyle (color: string): Record<string, string> {
  if (!color) return {};
  const named = NAMED_COLORS.find(c => c.name === color);
  const hex = named ? named.hex : color.startsWith('#') ? color : `#${color}`;
  return { backgroundColor: hex };
}
</script>

<template>
  <div class="space-y-5">
    <!-- Badge Style -->
    <div class="space-y-2.5">
      <Label class="text-xs text-muted-foreground">Style</Label>
      <div class="flex flex-wrap gap-1.5">
        <button
          v-for="style in BADGE_STYLES"
          :key="style.value"
          class="flex items-center gap-2 rounded-lg border px-3 py-2 transition-colors hover:bg-accent"
          :class="[config.style === style.value ? 'border-primary bg-accent' : 'border-border']"
          @click="config.style = style.value"
        >
          <img
            :src="`https://img.shields.io/badge/style-preview-blue?style=${style.value}`"
            :alt="style.label"
            class="h-4"
          >
          <span class="text-xs text-muted-foreground">{{ style.label }}</span>
        </button>
      </div>
    </div>

    <Separator />

    <!-- Colors -->
    <div class="grid gap-4 sm:grid-cols-2">
      <!-- Badge Color -->
      <div class="space-y-2">
        <Label
          for="badge-color"
          class="text-xs text-muted-foreground"
        >Badge Color</Label>
        <div class="relative">
          <Input
            id="badge-color"
            v-model="config.color"
            placeholder="brightgreen, #4c1"
            class="h-8 pr-9 text-xs"
          />
          <div
            v-if="config.color"
            class="absolute right-2.5 top-1/2 size-3.5 -translate-y-1/2 rounded-full border"
            :style="getColorPreviewStyle(config.color)"
          />
        </div>
        <div class="flex flex-wrap gap-1">
          <button
            v-for="color in NAMED_COLORS"
            :key="color.name"
            class="size-5 rounded-full border-2 transition-transform hover:scale-110"
            :class="[config.color === color.name ? 'border-foreground' : 'border-transparent']"
            :style="{ backgroundColor: color.hex }"
            :title="color.name"
            @click="config.color = color.name"
          />
        </div>
      </div>

      <!-- Label Color -->
      <div class="space-y-2">
        <Label
          for="label-color"
          class="text-xs text-muted-foreground"
        >Label Color</Label>
        <div class="relative">
          <Input
            id="label-color"
            v-model="config.labelColor"
            placeholder="Default (grey)"
            class="h-8 pr-9 text-xs"
          />
          <div
            v-if="config.labelColor"
            class="absolute right-2.5 top-1/2 size-3.5 -translate-y-1/2 rounded-full border"
            :style="getColorPreviewStyle(config.labelColor)"
          />
        </div>
        <div class="flex flex-wrap gap-1">
          <button
            v-for="color in NAMED_COLORS"
            :key="color.name"
            class="size-5 rounded-full border-2 transition-transform hover:scale-110"
            :class="[config.labelColor === color.name ? 'border-foreground' : 'border-transparent']"
            :style="{ backgroundColor: color.hex }"
            :title="color.name"
            @click="config.labelColor = config.labelColor === color.name ? '' : color.name"
          />
        </div>
      </div>
    </div>

    <Separator />

    <!-- Logo -->
    <div class="space-y-3">
      <div class="flex items-center justify-between">
        <Label class="text-xs text-muted-foreground">Logo</Label>
        <div class="flex items-center gap-0.5 rounded-lg border border-border bg-muted/50 p-0.5">
          <button
            class="rounded-md px-2.5 py-1 text-xs font-medium transition-colors"
            :class="[config.logoMode === 'simple-icons' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground']"
            @click="config.logoMode = 'simple-icons'"
          >
            Simple Icons
          </button>
          <button
            class="rounded-md px-2.5 py-1 text-xs font-medium transition-colors"
            :class="[config.logoMode === 'custom' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground']"
            @click="config.logoMode = 'custom'"
          >
            Custom
          </button>
        </div>
      </div>

      <!-- Simple Icons mode -->
      <div
        v-show="config.logoMode === 'simple-icons'"
        class="space-y-3"
        :inert="config.logoMode !== 'simple-icons'"
      >
        <div class="grid gap-3 sm:grid-cols-3">
          <div class="space-y-1.5">
            <Label
              for="logo-slug"
              class="text-xs text-muted-foreground"
            >Icon slug</Label>
            <Input
              id="logo-slug"
              v-model="config.logo"
              placeholder="github, npm"
              class="h-8 text-xs"
            />
          </div>
          <div class="space-y-1.5">
            <Label
              for="logo-color"
              class="text-xs text-muted-foreground"
            >Color</Label>
            <Input
              id="logo-color"
              v-model="config.logoColor"
              placeholder="white, #fff"
              class="h-8 text-xs"
            />
          </div>
          <div class="space-y-1.5">
            <Label
              for="logo-size"
              class="text-xs text-muted-foreground"
            >Auto size</Label>
            <div class="flex h-8 items-center gap-2">
              <Switch
                id="logo-size"
                :model-value="config.logoSize === 'auto'"
                @update:model-value="config.logoSize = $event ? 'auto' : ''"
              />
              <span class="text-xs text-muted-foreground">
                {{ config.logoSize === 'auto' ? 'On' : 'Off' }}
              </span>
            </div>
          </div>
        </div>

        <div
          v-if="config.logo"
          class="flex items-center gap-2 rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground"
        >
          <img
            :src="`https://img.shields.io/badge/_-_-grey?logo=${config.logo}&logoColor=${config.logoColor || 'white'}&style=flat-square`"
            alt="Logo preview"
            class="h-4"
          >
          <span>{{ config.logo }}</span>
        </div>
      </div>

      <!-- Custom Avatar mode -->
      <div
        v-show="config.logoMode === 'custom'"
        :inert="config.logoMode !== 'custom'"
      >
        <AvatarBuilder />
      </div>
    </div>
  </div>
</template>
