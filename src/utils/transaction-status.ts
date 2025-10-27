import type { AEncryptionProvider, ITransaction } from '@hiveio/wax';
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
export async function pollTransactionStatus (
  refId: string,
  maxAttempts: number = 30,
  intervalMs: number = 2000
): Promise<{ success: boolean; message: string; details?: string }> {
  const wax = await getWax();

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      // Call status endpoint
      /* eslint-disable-next-line @typescript-eslint/naming-convention */
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
      const errorObj = error as Record<string, unknown>;
      const response = errorObj?.response as Record<string, unknown> | undefined;
      const httpCode = errorObj?.httpCode || errorObj?.status || response?.status;

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
        message: (errorObj?.message as string) || 'Transaction failed',
        details: (errorObj?.details as string) || (errorObj?.hint as string) || JSON.stringify(error)
      };
    }
  }

  // Timeout - transaction not confirmed within max attempts
  return {
    success: false,
    message: 'Transaction status timeout',
    details: 'Could not confirm transaction status within the expected time.'
  };
}

const broadcastHtmOperation = async (
  operationsFactory: (tx: ITransaction) => htm_operation[],
  l2Wallet: AEncryptionProvider | undefined = undefined
): Promise<string> => {
  const settingsStore = useSettingsStore();
  const tokensStore = useTokensStore();
  const wax = await getWax();
  const walletStore = useWalletStore();

  // Remove later on. No checks for other wallets or any connection type here as users may not be connected yet, but want to register an account
  if (walletStore.isL2Wallet)
    throw new Error('HTM transactions are not supported with Layer 2 wallets at this time.');

  // Set proxy account for HTM transactions
  HtmTransaction.HiveProxyAccount = settingsStore.settings.account!;

  // Create Layer 2 HTM transaction for user signup
  const l2Transaction = new HtmTransaction(wax);

  // Create Layer 1 transaction and broadcast
  const l1Transaction = await wax.createTransaction();

  operationsFactory(l1Transaction).map(op => l2Transaction.pushOperation(op));

  // We are in the scope of the automated function for retrieving status of HTM transactions.
  // Therefore, we must ensure that no custom, injected HTM operations are mixed with proper, observable operations in the same transaction.
  for(const op of l1Transaction.transaction.operations)
  {if (op.custom_json_operation?.id === PROTOCOL_OPERATION_ID)
    throw new Error('Custom, injected HTM operations cannot be mixed with other operations in the same transaction.');
  }

  await (l2Wallet ?? tokensStore.wallet!).signTransaction(l2Transaction);

  const l1Op = l2Transaction.toLayer1Operation();

  l1Transaction.pushOperation(l1Op);

  if (!walletStore.wallet)
    throw new Error('No wallet available for signing the transaction. Currently, you are required to connect a Layer 1 wallet to perform HTM transactions.');

  // Sign Layer 1 transaction with the Hive active key
  await walletStore.createWalletFor(settingsStore.settings, l1Op.custom_json_operation!.required_auths.length > 0 ? 'active' : 'posting');
  await walletStore.wallet!.signTransaction(l1Transaction);

  // Broadcast the transaction
  await wax.broadcast(l1Transaction);

  return `${l1Transaction.legacy_id}_${l1Transaction.transaction.operations.length - 1}`;
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
    const refId = await broadcastHtmOperation(operationsFactory, l2Wallet);

    const result = await pollTransactionStatus(refId);

    if (!enableToasts) return;

    toast.dismiss(loadingToast);
    if (result.success) {
      toast.success(`${operationName} successful`, {
        description: result.message
      });
    } else {
      toast.error(`${operationName} failed`, {
        description: result.details || result.message
      });
    }
  } catch (error: unknown) {
    if (enableToasts) {
      toast.dismiss(loadingToast);
      toast.error(`${operationName} failed`, {
        description: error instanceof Error ? error.message : 'Unknown error occurred'
      });
    }

    throw error;
  }
};
