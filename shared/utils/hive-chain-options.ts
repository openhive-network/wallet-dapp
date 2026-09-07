export interface HiveChainRuntimeSettings {
  hiveNodeEndpoint: string;
  hiveChainId: string | number;
}

export interface HiveChainOptions {
  apiEndpoint?: string;
  chainId: string;
}

/**
 * Resolves wax chain options from runtime config, falling back to wax defaults when values are empty
 */
export const resolveHiveChainOptions = (
  { hiveNodeEndpoint, hiveChainId }: HiveChainRuntimeSettings,
  defaultChainId: string
): HiveChainOptions => {
  const hasCustomChainId = typeof hiveChainId === 'number' || hiveChainId.length > 0;

  return {
    apiEndpoint: hiveNodeEndpoint.length > 0 ? hiveNodeEndpoint : undefined,
    chainId: hasCustomChainId ? String(hiveChainId).padEnd(64, '0') : defaultChainId
  };
};
