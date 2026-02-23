export const BUILTIN_METADATA_KEYS = new Set(['name', 'symbol', 'description', 'image', 'website']);

export type CustomMetadataEntry = { key: string; value: string };

export const extractCustomMetadata = (metadata: Record<string, unknown>): CustomMetadataEntry[] =>
  Object.entries(metadata)
    .filter(([key]) => !BUILTIN_METADATA_KEYS.has(key))
    .map(([key, value]) => ({ key, value: String(value ?? '') }));
