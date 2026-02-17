<script setup lang="ts">
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { useAvatarBuilder, AVATAR_SHAPES, AVATAR_ICONS, AVATAR_PRESET_COLORS } from '@/composables/useAvatarBuilder';
import { useBadge } from '@/composables/useBadge';

const { config: avatarConfig, avatarPreviewUrl, avatarSvg, hasContent } = useAvatarBuilder();
const { config: badgeConfig } = useBadge();

// Sync avatar SVG → badge config whenever it changes
watch(avatarSvg, (svg) => {
  if (badgeConfig.value.logoMode === 'custom')
    badgeConfig.value.customLogoSvg = svg;

}, { immediate: true });

watch(() => badgeConfig.value.logoMode, (mode) => {
  if (mode === 'custom')
    badgeConfig.value.customLogoSvg = avatarSvg.value;

});

const contentTab = computed({
  get: () => avatarConfig.value.contentType,
  set: (val: string) => {
    avatarConfig.value.contentType = val as 'text' | 'icon' | 'svg';
  }
});
</script>

<template>
  <div class="space-y-4">
    <!-- Preview + Shape -->
    <div class="flex items-start gap-4">
      <!-- Live avatar preview -->
      <div class="flex shrink-0 flex-col items-center gap-1">
        <div class="flex size-16 items-center justify-center rounded-xl border border-border bg-muted/50 p-1.5">
          <img
            v-if="hasContent || avatarConfig.contentType === 'icon'"
            :src="avatarPreviewUrl"
            alt="Avatar"
            class="size-12"
          >
          <span
            v-else
            class="text-[10px] text-muted-foreground"
          >Preview</span>
        </div>
        <span class="text-[10px] text-muted-foreground">64&times;64</span>
      </div>

      <!-- Shape + Background -->
      <div class="flex-1 space-y-2">
        <Label class="text-xs text-muted-foreground">Shape</Label>
        <div class="flex flex-wrap gap-1.5">
          <button
            v-for="shape in AVATAR_SHAPES"
            :key="shape.value"
            class="flex size-8 items-center justify-center rounded-lg border transition-colors hover:bg-accent"
            :class="[avatarConfig.shape === shape.value ? 'border-primary bg-accent text-primary' : 'border-border text-muted-foreground']"
            :title="shape.label"
            @click="avatarConfig.shape = shape.value"
          >
            <svg
              viewBox="0 0 24 24"
              class="size-4"
              fill="currentColor"
              stroke="none"
            >
              <!-- eslint-disable-next-line vue/no-v-html -->
              <g v-html="shape.preview" />
            </svg>
          </button>
        </div>

        <Label class="text-xs text-muted-foreground">Background</Label>
        <div class="flex items-center gap-2">
          <label class="flex size-7 shrink-0 items-center justify-center overflow-hidden rounded-md border border-border">
            <input
              v-model="avatarConfig.bgColor"
              type="color"
              class="-m-1 size-9 cursor-pointer border-0"
            >
          </label>
          <Input
            v-model="avatarConfig.bgColor"
            placeholder="#007ec6"
            class="h-7 flex-1 font-mono text-[11px]"
          />
        </div>
        <div class="flex flex-wrap gap-1.5">
          <button
            v-for="color in AVATAR_PRESET_COLORS"
            :key="color"
            class="size-5 rounded-full border-2 transition-transform hover:scale-110"
            :class="[avatarConfig.bgColor === color ? 'border-foreground' : 'border-transparent']"
            :style="{ backgroundColor: color }"
            :title="color"
            @click="avatarConfig.bgColor = color"
          />
        </div>
      </div>
    </div>

    <Separator />

    <!-- Content -->
    <Tabs
      v-model="contentTab"
      class="w-full"
    >
      <TabsList class="grid w-full grid-cols-3">
        <TabsTrigger value="text">
          Initials
        </TabsTrigger>
        <TabsTrigger value="icon">
          Icon
        </TabsTrigger>
        <TabsTrigger value="svg">
          SVG
        </TabsTrigger>
      </TabsList>

      <TabsContent
        value="text"
        class="space-y-2"
      >
        <div class="space-y-1.5">
          <Label
            for="avatar-text"
            class="text-xs"
          >Text (1-3 chars)</Label>
          <Input
            id="avatar-text"
            v-model="avatarConfig.text"
            maxlength="3"
            placeholder="AB"
            class="h-8 font-mono text-lg uppercase tracking-widest"
          />
        </div>
      </TabsContent>

      <TabsContent
        value="icon"
        class="space-y-2"
      >
        <div class="grid grid-cols-5 gap-1.5">
          <button
            v-for="icon in AVATAR_ICONS"
            :key="icon.name"
            class="flex flex-col items-center gap-0.5 rounded-lg border p-1.5 transition-colors hover:bg-accent"
            :class="[avatarConfig.icon === icon.name ? 'border-primary bg-accent text-primary' : 'border-border text-muted-foreground']"
            :title="icon.label"
            @click="avatarConfig.icon = icon.name"
          >
            <svg
              viewBox="0 0 64 64"
              class="size-5"
            >
              <path
                v-if="icon.type === 'fill'"
                :d="icon.path"
                fill="currentColor"
              />
              <path
                v-else
                :d="icon.path"
                fill="none"
                stroke="currentColor"
                stroke-width="5"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>
            <span class="text-[9px]">{{ icon.label }}</span>
          </button>
        </div>
      </TabsContent>

      <TabsContent
        value="svg"
        class="space-y-2"
      >
        <Textarea
          id="avatar-svg"
          v-model="avatarConfig.customSvg"
          placeholder="<svg xmlns=&quot;...&quot; viewBox=&quot;0 0 64 64&quot;>...</svg>"
          rows="3"
          class="font-mono text-[11px]"
        />
      </TabsContent>
    </Tabs>

    <!-- Content Color (for text/icon modes) -->
    <div
      v-if="avatarConfig.contentType !== 'svg'"
      class="space-y-1.5"
    >
      <Label class="text-xs text-muted-foreground">Content Color</Label>
      <div class="flex items-center gap-2">
        <label class="flex size-7 shrink-0 items-center justify-center overflow-hidden rounded-md border border-border">
          <input
            v-model="avatarConfig.contentColor"
            type="color"
            class="-m-1 size-9 cursor-pointer border-0"
          >
        </label>
        <Input
          v-model="avatarConfig.contentColor"
          placeholder="#ffffff"
          class="h-7 flex-1 font-mono text-[11px]"
        />
        <Button
          variant="outline"
          size="sm"
          class="h-7 text-[11px]"
          @click="avatarConfig.contentColor = avatarConfig.contentColor === '#ffffff' ? '#000000' : '#ffffff'"
        >
          {{ avatarConfig.contentColor === '#ffffff' ? 'Dark' : 'Light' }}
        </Button>
      </div>
    </div>
  </div>
</template>
