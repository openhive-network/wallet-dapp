import type { AEncryptionProvider, ITransaction, WaxRequestError } from '@hiveio/wax';
import { HtmTransaction, type htm_operation, PROTOCOL_OPERATION_ID } from '@mtyszczak-cargo/htm';
import { toast } from 'vue-sonner';

import { useSettingsStore } from '@/stores/settings.store';
import { useTokensStore } from '@/stores/tokens.store';
import { useWalletStore } from '@/stores/wallet.store';
import { getWax } from '@/stores/wax.store';

/**
 * Poll transaction status until it's confirmed or failed
 * @param refId - Transaction reference ID (transaction hash)
 * @param maxAttempts - Maximum number of polling attempts (default: 30)
 * @param intervalMs - Interval between polls in milliseconds (default: 2000)
 * @returns Promise that resolves with transaction status
 */
const pollTransactionStatus = async (
  refId: string,
  maxAttempts: number = 30,
  intervalMs: number = 2000
): Promise<{ success: boolean; message: string; details?: string }> => {
  const wax = await getWax();

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      // Call status endpoint

      const status = await wax.restApi.ctokensApi.status({ 'ref-id': refId });

      // Check if we got a successful response
      if (status) {
        // Transaction found in database - it's confirmed
        return {
          success: true,
          message: status.message || 'Transaction confirmed successfully',
          details: status.details
        };
      }
    } catch (error: unknown) {
      // Check HTTP status code from error
      const errorObj = error as WaxRequestError<Record<string, unknown>>;
      const response = errorObj.response;
      const httpCode = response.status;

      // 404 means transaction not yet processed - keep polling
      if (httpCode === 404) {
        // Wait before next attempt
        if (attempt < maxAttempts - 1) {
          await new Promise(resolve => setTimeout(resolve, intervalMs));
          continue;
        }

        // Max attempts reached
        return {
          success: false,
          message: 'Transaction status timeout',
          details: 'Transaction was broadcast but status could not be confirmed. It may still be processing.'
        };
      }

      // Any other error means transaction failed
      return {
        success: false,
        message: 'Transaction failed',
        details: response.response?.message as string || JSON.stringify(error)
      };
    }
  }

  // Timeout - transaction not confirmed within max attempts
  return {
    success: false,
    message: 'Transaction status timeout',
    details: 'Could not confirm transaction status within the expected time.'
  };
};

const broadcastHtmOperation = async (
  operationsFactory: (tx: ITransaction) => htm_operation[],
  l2Wallet: AEncryptionProvider | undefined = undefined
): Promise<[string] | [string, string]> => {
  const settingsStore = useSettingsStore();
  const tokensStore = useTokensStore();
  const wax = await getWax();
  const walletStore = useWalletStore();

  const hasL1Wallet = typeof settingsStore.settings.account !== 'undefined' && !walletStore.isL2Wallet;

  // Set proxy account for HTM transactions
  const { public: { htmProxyAccount } } = useRuntimeConfig();
  HtmTransaction.HiveProxyAccount = hasL1Wallet ? settingsStore.settings.account! : htmProxyAccount;

  // Create Layer 2 HTM transaction for user signup
  const l2Transaction = new HtmTransaction(wax);

  // Create Layer 1 transaction and broadcast
  const l1Transaction = await wax.createTransaction();

  operationsFactory(l1Transaction).map(op => l2Transaction.pushOperation(op));

  // We are in the scope of the automated function for retrieving status of HTM transactions.
  // Therefore, we must ensure that no custom, injected HTM operations are mixed with proper, observable operations in the same transaction.
  for(const op of l1Transaction.transaction.operations) {
    if (op.custom_json_operation?.id === PROTOCOL_OPERATION_ID)
      throw new Error('Custom, injected HTM operations cannot be mixed with other operations in the same transaction.');
  }

  // TODO: Add specific command to check if active authority is required
  const requiresActive = (l2Transaction.toLayer1Operation().custom_json_operation?.required_auths.length ?? 0) > 0;

  if (requiresActive && !hasL1Wallet)
    throw new Error('Requested active authority action - involving transfers on L1 Hive blockchain. This action is not supported by proxy. Please log in using your L1 wallet first.');

  await (l2Wallet ?? tokensStore.wallet!).signTransaction(l2Transaction);

  const l1Op = l2Transaction.toLayer1Operation();

  l1Transaction.pushOperation(l1Op);

  if (hasL1Wallet) {
    // Sign Layer 1 transaction with the Hive active key
    await walletStore.createWalletFor(settingsStore.settings, requiresActive ? 'active' : 'posting');
    await walletStore.wallet!.signTransaction(l1Transaction);

    // Broadcast the transaction
    await wax.broadcast(l1Transaction);
  } else { // Use proxy
    const { 'ref-id': refId } = await wax.restApi.ctokensApi.broadcastProxy({
      trx: l2Transaction.transaction
    });

    return [ refId! ];
  }

  let legacyRefId: string | undefined = undefined;
  // When the signature requires active authority, we have to deal with Hive assets.
  // Some signers, such as Keychain use only legacy serialization for Hive assets.
  // Therefore, we need to provide both legacy and new HTM transaction reference IDs for such transactions.
  if (requiresActive) {
    HtmTransaction.USE_LEGACY_HIVE_SERIALIZATION = true;

    try {
      // Get legacy transaction reference ID for active authority transactions
      legacyRefId = l2Transaction.getRefId(l1Transaction);
    } finally {
      HtmTransaction.USE_LEGACY_HIVE_SERIALIZATION = false;
    }
  }

  const refId = l2Transaction.getRefId(l1Transaction);

  // Return HTM transaction reference ID in proper serialization (legacy_id / id)
  return legacyRefId ? [ refId, legacyRefId ] : [ refId ];
};

/**
 * Wait for transaction status and show appropriate toast
 * @param operationsFactory - Function that creates HTM operations for the L1 transaction. Thanks to the L1 transaction provided as an argument to the function,
 *                            you can include your custom operations (such as e.g. fees) in the same transaction.
 * @param operationName - Name of the operation for toast messages (e.g., "Transfer", "Stake")
 * @param enableToasts - Whether to show toasts for transaction status (default: true)
 * @param l2Wallet - Optional explicit L2 signer. If not provided, the default signer from tokens store will be used.
 *
 * @throws This function throws an error if the transaction fails or if there is an issue during broadcasting.
 */
export const waitForTransactionStatus = async (
  operationsFactory: (tx: ITransaction) => htm_operation[],
  operationName: string = 'Operation',
  enableToasts: boolean = true,
  l2Wallet: AEncryptionProvider | undefined = undefined
): Promise<void> => {
  // Show pending toast
  const loadingToast = enableToasts ? toast.loading(`${operationName} in progress...`, {
    description: 'Waiting for transaction confirmation'
  }) : undefined;

  try {
    const refIds = await broadcastHtmOperation(operationsFactory, l2Wallet);

    const result = await Promise.race(refIds.map(refId => pollTransactionStatus(refId)));

    if (!enableToasts) return;

    toast.dismiss(loadingToast);
    if (result.success) {
      toast.success(`${operationName} successful`, {
        description: result.message
      });
    } else
      throw new Error(result.details || result.message);
  } catch (error: unknown) {
    if (enableToasts)
      toast.dismiss(loadingToast);

    throw error;
  }
};
