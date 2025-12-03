import type { IBeekeeperInstance, IBeekeeperUnlockedWallet } from '@hiveio/beekeeper';
import type { ISignatureTransaction, TPublicKey, TSignature } from '@hiveio/wax';
import { AEncryptionProvider } from '@hiveio/wax';

/**
 * Temporary signer for one-time transactions using a private key from QR code
 * Does not persist the key - only exists in memory for the transaction
 */
export class TempCTokensSigner extends AEncryptionProvider {
  private static beekeeper?: Promise<IBeekeeperInstance>;

  #wallet: IBeekeeperUnlockedWallet;

  private constructor (
    wallet: IBeekeeperUnlockedWallet,
    public readonly publicKey: TPublicKey
  ) {
    super();
    this.#wallet = wallet;
  }

  /**
   * Create a temporary signer from a private key (e.g., scanned from QR code)
   */
  public static async for (privateKey: string): Promise<TempCTokensSigner> {
    // Initialize beekeeper if needed
    if (!TempCTokensSigner.beekeeper) {
      const bk = await import('@hiveio/beekeeper');
      TempCTokensSigner.beekeeper = bk.default({
        inMemory: true,
        enableLogs: false,
        unlockTimeout: 120 // Very short timeout - just for this transaction - two minutes
      });
    }

    const bk = await TempCTokensSigner.beekeeper;

    const session = bk.createSession(Math.random().toString());

    const tempPassword = Math.random().toString(36);
    const walletName = `TEMP_WALLET_${Math.random()}`;

    const { wallet } = await session.createWallet(walletName, tempPassword, true);

    const publicKey = await wallet.importKey(privateKey);

    return new TempCTokensSigner(wallet, publicKey);
  }

  /**
   * Clean up temporary resources
   */
  public async destroy (): Promise<void> {
    this.#wallet.close();
  }

  public override async generateSignatures (transaction: ISignatureTransaction): Promise<TSignature[]> {
    if (!TempCTokensSigner.beekeeper)
      throw new Error('Beekeeper not initialized');

    const signature = this.#wallet.signDigest(this.publicKey, transaction.sigDigest);

    await this.destroy(); // Clean up directly after use

    return [signature];
  }

  // Encryption/decryption not supported for temp signers
  public async encryptData (_content: string, _recipient: TPublicKey): Promise<string> {
    throw new Error('Encryption not supported for temporary signers');
  }

  public async decryptData (_content: string): Promise<string> {
    throw new Error('Decryption not supported for temporary signers');
  }
}
