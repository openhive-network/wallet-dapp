import { svgToBase64 } from '@/composables/useAvatarBuilder';

export type BadgeType = 'static' | 'dynamic-json' | 'dynamic-xml' | 'dynamic-yaml' | 'dynamic-toml' | 'endpoint'

export type BadgeStyle = 'flat' | 'flat-square' | 'plastic' | 'for-the-badge' | 'social'

export type LogoMode = 'simple-icons' | 'custom'

export interface BadgeConfig {
  type: BadgeType
  label: string
  message: string
  dataUrl: string
  query: string
  prefix: string
  suffix: string
  style: BadgeStyle
  color: string
  labelColor: string
  logoMode: LogoMode
  logo: string
  logoColor: string
  logoSize: string
  customLogoSvg: string
  messageDynamic: boolean
}

export const NAMED_COLORS = [
  { name: 'brightgreen', hex: '#44cc11' },
  { name: 'green', hex: '#97ca00' },
  { name: 'yellowgreen', hex: '#a4a61d' },
  { name: 'yellow', hex: '#dfb317' },
  { name: 'orange', hex: '#fe7d37' },
  { name: 'red', hex: '#e05d44' },
  { name: 'blue', hex: '#007ec6' },
  { name: 'grey', hex: '#555555' },
  { name: 'lightgrey', hex: '#9f9f9f' }
] as const;

export const BADGE_STYLES: { value: BadgeStyle, label: string, description: string }[] = [
  { value: 'flat', label: 'Flat', description: 'Clean, modern look' },
  { value: 'flat-square', label: 'Flat Square', description: 'Sharp corners' },
  { value: 'plastic', label: 'Plastic', description: 'Classic glossy' },
  { value: 'for-the-badge', label: 'For the Badge', description: 'Large & bold' },
  { value: 'social', label: 'Social', description: 'GitHub-style' }
];

export const BADGE_TEMPLATES = [
  { name: 'Build Passing', label: 'build', message: 'passing', color: 'brightgreen', logo: '', style: 'flat' as BadgeStyle },
  { name: 'Build Failing', label: 'build', message: 'failing', color: 'red', logo: '', style: 'flat' as BadgeStyle },
  { name: 'Coverage 95%', label: 'coverage', message: '95%25', color: 'brightgreen', logo: '', style: 'flat' as BadgeStyle },
  { name: 'License MIT', label: 'license', message: 'MIT', color: 'blue', logo: '', style: 'flat' as BadgeStyle },
  { name: 'Version', label: 'version', message: 'v1.0.0', color: 'blue', logo: '', style: 'flat' as BadgeStyle },
  { name: 'npm', label: 'npm', message: 'v1.2.3', color: 'cb3837', logo: 'npm', style: 'flat' as BadgeStyle },
  { name: 'Node.js', label: 'node', message: '≥18', color: 'brightgreen', logo: 'nodedotjs', style: 'flat' as BadgeStyle },
  { name: 'TypeScript', label: 'TypeScript', message: '5.0', color: '3178c6', logo: 'typescript', style: 'flat' as BadgeStyle },
  { name: 'PRs Welcome', label: 'PRs', message: 'welcome', color: 'brightgreen', logo: '', style: 'flat' as BadgeStyle },
  { name: 'Prettier', label: 'code style', message: 'prettier', color: 'ff69b4', logo: 'prettier', style: 'flat' as BadgeStyle },
  { name: 'Docker', label: 'docker', message: 'ready', color: '2496ed', logo: 'docker', style: 'flat' as BadgeStyle },
  { name: 'Made with Love', label: 'Made with', message: '♥', color: 'red', logo: '', style: 'for-the-badge' as BadgeStyle }
];

function encodeShieldsText (text: string): string {
  return text
    .replace(/-/g, '--')
    .replace(/_/g, '__')
    .replace(/ /g, '_');
}

function stripHash (color: string): string {
  return color.startsWith('#') ? color.slice(1) : color;
}

function buildCommonParams (config: BadgeConfig, excludeColor = false): URLSearchParams {
  const params = new URLSearchParams();
  if (config.style !== 'flat') params.set('style', config.style);
  if (config.logoMode === 'custom' && config.customLogoSvg)
    params.set('logo', `data:image/svg+xml;base64,${svgToBase64(config.customLogoSvg)}`);

  else if (config.logo)
    params.set('logo', config.logo);

  if (config.logoColor && config.logoMode !== 'custom') params.set('logoColor', stripHash(config.logoColor));
  if (config.logoSize) params.set('logoSize', config.logoSize);
  if (config.labelColor) params.set('labelColor', stripHash(config.labelColor));
  if (!excludeColor && config.color) params.set('color', stripHash(config.color));
  return params;
}

export function generateBadgeUrl (config: BadgeConfig): string {
  const BASE = 'https://img.shields.io';

  if (config.type === 'static') {
    const label = encodeShieldsText(config.label);
    const messageText = config.messageDynamic ? '{dynamic}' : (config.message || 'badge');
    const message = encodeShieldsText(messageText);
    const color = stripHash(config.color) || 'blue';

    const pathContent = label
      ? `${label}-${message}-${color}`
      : `${message}-${color}`;

    const params = buildCommonParams(config, true);
    const queryString = params.toString();
    return `${BASE}/badge/${pathContent}${queryString ? `?${queryString}` : ''}`;
  }

  if (config.type === 'endpoint') {
    const params = buildCommonParams(config);
    if (config.dataUrl) params.set('url', config.dataUrl);
    if (config.label) params.set('label', config.label);
    return `${BASE}/endpoint?${params.toString()}`;
  }

  // Dynamic badges (json, xml, yaml, toml)
  const format = config.type.replace('dynamic-', '');
  const params = buildCommonParams(config);
  if (config.dataUrl) params.set('url', config.dataUrl);
  if (config.query) params.set('query', config.query);
  if (config.prefix) params.set('prefix', config.prefix);
  if (config.suffix) params.set('suffix', config.suffix);
  if (config.label) params.set('label', config.label);

  return `${BASE}/badge/dynamic/${format}?${params.toString()}`;
}

export function useBadge () {
  const config = useState<BadgeConfig>('badge-config', () => ({
    type: 'static',
    label: 'build',
    message: 'passing',
    dataUrl: '',
    query: '',
    prefix: '',
    suffix: '',
    style: 'flat',
    color: 'brightgreen',
    labelColor: '',
    logoMode: 'simple-icons',
    logo: '',
    logoColor: '',
    logoSize: '',
    customLogoSvg: '',
    messageDynamic: false
  }));

  const badgeUrl = computed(() => generateBadgeUrl(config.value));

  const altText = computed(() => {
    if (config.value.type === 'static') {
      const msg = config.value.messageDynamic ? '{dynamic}' : config.value.message;
      return config.value.label
        ? `${config.value.label}: ${msg}`
        : msg || 'badge';
    }
    return config.value.label || 'badge';
  });

  const markdownSnippet = computed(() => `![${altText.value}](${badgeUrl.value})`);

  const htmlSnippet = computed(() => `<img src="${badgeUrl.value}" alt="${altText.value}">`);

  const rstSnippet = computed(() => `.. image:: ${badgeUrl.value}\n   :alt: ${altText.value}`);

  const asciiDocSnippet = computed(() => `image:${badgeUrl.value}[${altText.value}]`);

  const endpointJson = computed(() => {
    const c = config.value;
    const json: Record<string, unknown> = {
      label: c.label || ''
    };
    if (!c.messageDynamic) json.message = c.message || '';
    if (c.color) json.color = stripHash(c.color);
    if (c.labelColor) json.labelColor = stripHash(c.labelColor);
    if (c.style !== 'flat') json.style = c.style;
    if (c.logoMode === 'custom' && c.customLogoSvg)
      json.logoSvg = c.customLogoSvg;

    else if (c.logo)
      json.namedLogo = c.logo;

    if (c.logoColor && c.logoMode !== 'custom') json.logoColor = stripHash(c.logoColor);
    if (c.logoSize) json.logoSize = c.logoSize;
    return JSON.stringify(json, null, 2);
  });

  function applyTemplate (template: typeof BADGE_TEMPLATES[number]) {
    Object.assign(config.value, {
      type: 'static' as BadgeType,
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
      logoMode: template.logo ? 'simple-icons' as LogoMode : config.value.logoMode,
      logoColor: '',
      logoSize: '',
      customLogoSvg: template.logo ? '' : config.value.customLogoSvg,
      messageDynamic: false
    });
  }

  function resetConfig () {
    Object.assign(config.value, {
      type: 'static' as BadgeType,
      label: 'build',
      message: 'passing',
      dataUrl: '',
      query: '',
      prefix: '',
      suffix: '',
      style: 'flat' as BadgeStyle,
      color: 'brightgreen',
      labelColor: '',
      logoMode: 'simple-icons' as LogoMode,
      logo: '',
      logoColor: '',
      logoSize: '',
      customLogoSvg: '',
      messageDynamic: false
    });
  }

  return {
    config,
    badgeUrl,
    altText,
    markdownSnippet,
    htmlSnippet,
    rstSnippet,
    asciiDocSnippet,
    endpointJson,
    applyTemplate,
    resetConfig
  };
}
