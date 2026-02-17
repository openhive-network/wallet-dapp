export type AvatarShape = 'circle' | 'square' | 'rounded' | 'diamond' | 'hexagon'
export type AvatarContentType = 'text' | 'icon' | 'svg'

export interface AvatarIcon {
  name: string
  label: string
  path: string
  type: 'fill' | 'stroke'
}

export interface AvatarConfig {
  shape: AvatarShape
  bgColor: string
  contentType: AvatarContentType
  text: string
  contentColor: string
  icon: string
  customSvg: string
}

export const AVATAR_SHAPES: { value: AvatarShape, label: string, preview: string }[] = [
  { value: 'circle', label: 'Circle', preview: '<circle cx="12" cy="12" r="11" />' },
  { value: 'square', label: 'Square', preview: '<rect x="1" y="1" width="22" height="22" />' },
  { value: 'rounded', label: 'Rounded', preview: '<rect x="1" y="1" width="22" height="22" rx="5" />' },
  { value: 'diamond', label: 'Diamond', preview: '<polygon points="12,1 23,12 12,23 1,12" />' },
  { value: 'hexagon', label: 'Hexagon', preview: '<polygon points="12,1 22,6.5 22,17.5 12,23 2,17.5 2,6.5" />' }
];

export const AVATAR_ICONS: AvatarIcon[] = [
  { name: 'star', label: 'Star', path: 'M32 6l7.6 17.2L59 26l-14 13.6L48.4 59 32 50.2 15.6 59 19 39.6 5 26l19.4-2.8z', type: 'fill' },
  { name: 'heart', label: 'Heart', path: 'M32 54C32 54 8 38 8 22c0-8 6-14 14-14 5 0 8 3 10 6 2-3 5-6 10-6 8 0 14 6 14 14 0 16-24 32-24 32z', type: 'fill' },
  { name: 'check', label: 'Check', path: 'M14 34l12 12 24-28', type: 'stroke' },
  { name: 'cross', label: 'Plus', path: 'M32 12v40M12 32h40', type: 'stroke' },
  { name: 'code', label: 'Code', path: 'M24 16L8 32l16 16M40 16l16 16-16 16', type: 'stroke' },
  { name: 'bolt', label: 'Lightning', path: 'M36 4L14 34h14L24 60l26-30H36z', type: 'fill' },
  { name: 'flame', label: 'Flame', path: 'M32 6c0 0-16 14-16 28 0 10 7 18 16 18s16-8 16-18c0-6-4-12-8-16 0 8-4 12-8 8s0-12 0-20z', type: 'fill' },
  { name: 'crown', label: 'Crown', path: 'M8 48V20l12 12 12-16 12 16 12-12v28z', type: 'fill' },
  { name: 'shield', label: 'Shield', path: 'M32 4L8 16v16c0 14 10 24 24 28 14-4 24-14 24-28V16z', type: 'fill' },
  { name: 'gear', label: 'Gear', path: 'M28 8h8l1 6 5 2 5-4 6 6-4 5 2 5 6 1v8l-6 1-2 5 4 5-6 6-5-4-5 2-1 6h-8l-1-6-5-2-5 4-6-6 4-5-2-5-6-1v-8l6-1 2-5-4-5 6-6 5 4 5-2z', type: 'fill' }
];

export const AVATAR_PRESET_COLORS = [
  '#e05d44', '#fe7d37', '#dfb317', '#97ca00', '#44cc11',
  '#007ec6', '#3178c6', '#8b5cf6', '#ec4899', '#555555'
];

const SIZE = 64;

function escapeXml (str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function getShapeSvg (shape: AvatarShape, color: string): string {
  const s = SIZE;
  const h = s / 2;

  switch (shape) {
  case 'circle':
    return `<circle cx="${h}" cy="${h}" r="${h}" fill="${color}"/>`;
  case 'square':
    return `<rect width="${s}" height="${s}" fill="${color}"/>`;
  case 'rounded':
    return `<rect width="${s}" height="${s}" rx="12" fill="${color}"/>`;
  case 'diamond':
    return `<polygon points="${h},0 ${s},${h} ${h},${s} 0,${h}" fill="${color}"/>`;
  case 'hexagon': {
    const r = h;
    const points = Array.from({ length: 6 }, (_, i) => {
      const angle = (Math.PI / 3) * i - Math.PI / 2;
      return `${(h + r * Math.cos(angle)).toFixed(1)},${(h + r * Math.sin(angle)).toFixed(1)}`;
    }).join(' ');
    return `<polygon points="${points}" fill="${color}"/>`;
  }
  }
}

function getContentSvg (config: AvatarConfig): string {
  const h = SIZE / 2;

  if (config.contentType === 'text' && config.text) {
    const len = config.text.length;
    const fontSize = len === 1 ? 38 : len === 2 ? 30 : 22;
    return `<text x="${h}" y="${h}" text-anchor="middle" dominant-baseline="central" fill="${config.contentColor}" font-family="Arial,Helvetica,sans-serif" font-size="${fontSize}" font-weight="700">${escapeXml(config.text)}</text>`;
  }

  if (config.contentType === 'icon' && config.icon) {
    const icon = AVATAR_ICONS.find(i => i.name === config.icon);
    if (!icon) return '';
    if (icon.type === 'stroke')
      return `<path d="${icon.path}" fill="none" stroke="${config.contentColor}" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>`;

    return `<path d="${icon.path}" fill="${config.contentColor}"/>`;
  }

  return '';
}

export function generateAvatarSvg (config: AvatarConfig): string {
  if (config.contentType === 'svg' && config.customSvg)
    return config.customSvg.trim();


  const shape = getShapeSvg(config.shape, config.bgColor);
  const content = getContentSvg(config);

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${SIZE} ${SIZE}" width="${SIZE}" height="${SIZE}">${shape}${content}</svg>`;
}

export function svgToBase64 (svg: string): string {
  const encoded = encodeURIComponent(svg)
    .replace(/%([0-9A-F]{2})/g, (_, p1) => String.fromCharCode(Number.parseInt(p1, 16)));
  return btoa(encoded);
}

export function useAvatarBuilder () {
  const config = useState<AvatarConfig>('avatar-config', () => ({
    shape: 'circle',
    bgColor: '#007ec6',
    contentType: 'text',
    text: '',
    contentColor: '#ffffff',
    icon: 'star',
    customSvg: ''
  }));

  const avatarSvg = computed(() => generateAvatarSvg(config.value));
  const avatarBase64 = computed(() => svgToBase64(avatarSvg.value));
  const avatarPreviewUrl = computed(() => `data:image/svg+xml;base64,${avatarBase64.value}`);

  const hasContent = computed(() => {
    if (config.value.contentType === 'text') return config.value.text.length > 0;
    if (config.value.contentType === 'icon') return !!config.value.icon;
    if (config.value.contentType === 'svg') return config.value.customSvg.trim().length > 0;
    return false;
  });

  return {
    config,
    avatarSvg,
    avatarBase64,
    avatarPreviewUrl,
    hasContent
  };
}
