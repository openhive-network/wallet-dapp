const BLOCK_EXPLORER_URL = 'https://explore.openhive.network';

export const getTransactionExplorerUrl = (transactionId: string): string => `${BLOCK_EXPLORER_URL}/tx/${transactionId}`;
