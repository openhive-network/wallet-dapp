import { toast } from 'vue-sonner';

import { getCTokensApi } from './ctokens-api';

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
  const cTokensApi = await getCTokensApi();

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      // Call status endpoint
      const status = await cTokensApi.getTransactionStatus(refId);

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

/**
 * Wait for transaction status and show appropriate toast
 * @param refId - Transaction reference ID (transaction hash)
 * @param operationName - Name of the operation for toast messages (e.g., "Transfer", "Stake")
 * @param onSuccess - Optional callback to execute on success
 * @param onFailure - Optional callback to execute on failure
 */
export async function waitForTransactionStatus (
  refId: string,
  operationName: string,
  onSuccess?: () => void | Promise<void>,
  onFailure?: (error: Error) => void | Promise<void>
): Promise<void> {
  // Show pending toast
  const loadingToast = toast.loading(`${operationName} in progress...`, {
    description: 'Waiting for transaction confirmation'
  });

  try {
    const result = await pollTransactionStatus(refId);

    // Dismiss loading toast
    toast.dismiss(loadingToast);

    if (result.success) {
      // Show success toast
      toast.success(`${operationName} successful`, {
        description: result.message
      });

      // Execute success callback if provided
      if (onSuccess)
        await onSuccess();
    } else {
      // Show error toast
      toast.error(`${operationName} failed`, {
        description: result.details || result.message
      });

      // Execute failure callback if provided
      if (onFailure)
        await onFailure(new Error(result.message));
    }
  } catch (error: unknown) {
    // Dismiss loading toast
    toast.dismiss(loadingToast);

    const err = error as Error;

    // Show error toast
    toast.error(`${operationName} failed`, {
      description: err?.message || 'Unknown error occurred'
    });

    // Execute failure callback if provided
    if (onFailure)
      await onFailure(err);
  }
}
