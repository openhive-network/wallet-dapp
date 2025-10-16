/* eslint-disable @typescript-eslint/explicit-member-accessibility */
import type { IBeekeeperUnlockedWallet } from '@hiveio/beekeeper/vite';
import type { TPublicKey, IWaxBaseInterface } from '@hiveio/wax';
import { HtmTransaction } from '@mtyszczak-cargo/htm';

import { getWax } from '@/stores/wax.store';

export interface HTMUserSignupData {
  hiveAccount: string;
  managementKey: TPublicKey;
  operationalKey: TPublicKey;
}

export interface HTMAssetDefinitionData {
  identifier: {
    amount: string;
    nai: string;
    precision: number;
  };
  capped: boolean;
  maxSupply: string;
  owner: TPublicKey;
}

export interface HTMTokenTransferData {
  sender: TPublicKey;
  receiver: TPublicKey;
  amount: {
    amount: string;
    nai: string;
    precision: number;
  };
  memo?: string;
}

export interface HTMUserMetadataUpdateData {
  user: TPublicKey;
  metadata: {
    key: string;
    value: string;
  }[];
}

export interface HTMAssetMetadataUpdateData {
  owner: TPublicKey;
  identifier: {
    amount: string;
    nai: string;
    precision: number;
  };
  metadata: {
    key: string;
    value: string;
  }[];
}

/**
 * HTM Transaction Builder - Utility class for creating and managing HTM transactions
 */
export class HTMTransactionBuilder {
  private transaction: HtmTransaction;

  private constructor (wax: IWaxBaseInterface) {
    this.transaction = new HtmTransaction(wax);
  }

  /**
   * Create a new HTM transaction builder instance
   */
  static async create (): Promise<HTMTransactionBuilder> {
    const wax = await getWax();
    return new HTMTransactionBuilder(wax);
  }

  /**
   * Add user signup operation to the transaction
   */
  addUserSignup (data: HTMUserSignupData): this {
    this.transaction.pushOperation({
      user_signup_operation: {
        hive_account: data.hiveAccount,
        management_key: data.managementKey,
        operational_key: data.operationalKey
      }
    });
    return this;
  }

  /**
   * Add asset definition operation to the transaction
   */
  addAssetDefinition (data: HTMAssetDefinitionData): this {
    this.transaction.pushOperation({
      asset_definition_operation: data
    });
    return this;
  }

  /**
   * Add token transfer operation to the transaction
   */
  addTokenTransfer (data: HTMTokenTransferData): this {
    this.transaction.pushOperation({
      token_transfer_operation: {
        sender: data.sender,
        receiver: data.receiver,
        amount: data.amount,
        memo: data.memo || ''
      }
    });
    return this;
  }

  /**
   * Add user metadata update operation to the transaction
   */
  addUserMetadataUpdate (data: HTMUserMetadataUpdateData): this {
    this.transaction.pushOperation({
      user_metadata_update_operation: {
        user: data.user,
        metadata: {
          items: data.metadata
        }
      }
    });
    return this;
  }

  /**
   * Add asset metadata update operation to the transaction
   */
  addAssetMetadataUpdate (data: HTMAssetMetadataUpdateData): this {
    this.transaction.pushOperation({
      asset_metadata_update_operation: {
        owner: data.owner,
        identifier: data.identifier,
        metadata: {
          items: data.metadata
        }
      }
    });
    return this;
  }

  /**
   * Sign the transaction with the provided wallet
   */
  async sign (wallet: IBeekeeperUnlockedWallet): Promise<this> {
    this.transaction.sign(wallet);
    return this;
  }

  /**
   * Get the underlying HTM transaction
   */
  getTransaction (): HtmTransaction {
    return this.transaction;
  }

  /**
   * Get transaction JSON representation
   */
  toJSON (): string {
    return this.transaction.toString();
  }

  /**
   * Check if transaction is signed
   */
  isSigned (): boolean {
    return this.transaction.isSigned();
  }

  /**
   * Get impacted public keys
   */
  getImpactedKeys (): Iterable<TPublicKey> {
    return this.transaction.impactedPublicKeys;
  }
}

/**
 * Create and broadcast an HTM user signup transaction
 */
export async function createHTMUser (
  signupData: HTMUserSignupData,
  wallet: IBeekeeperUnlockedWallet,
  operationalAccount: string
): Promise<string> {
  const wax = await getWax();

  // Set proxy account for HTM transactions
  HtmTransaction.HiveProxyAccount = operationalAccount;

  // Create L2 transaction for user signup
  const htmBuilder = await HTMTransactionBuilder.create();
  htmBuilder.addUserSignup(signupData);
  await htmBuilder.sign(wallet);

  // Create L1 transaction to broadcast the HTM transaction
  const l1Tx = await wax.createTransaction();
  l1Tx.pushOperation(htmBuilder.getTransaction());
  l1Tx.sign(wallet, signupData.operationalKey);

  // Broadcast the transaction
  await wax.broadcast(l1Tx);
  return l1Tx.id.toString();
}

/**
 * Create and broadcast an HTM asset definition transaction
 */
export async function createHTMAsset (
  assetData: HTMAssetDefinitionData,
  wallet: IBeekeeperUnlockedWallet,
  operationalAccount: string,
  feeAmount = 1.0
): Promise<string> {
  const wax = await getWax();

  // Set proxy account for HTM transactions
  HtmTransaction.HiveProxyAccount = operationalAccount;

  // Create L2 transaction for asset definition
  const htmBuilder = await HTMTransactionBuilder.create();
  htmBuilder.addAssetDefinition(assetData);
  await htmBuilder.sign(wallet);

  // Create L1 transaction with fee transfer and HTM operation
  const l1Tx = await wax.createTransaction();

  // Add fee transfer operation
  l1Tx.pushOperation({
    transfer_operation: {
      from: operationalAccount,
      to: 'fee.htm',
      amount: wax.hiveCoins(feeAmount),
      memo: 'L2 asset creation fee'
    }
  });

  // Add HTM asset definition operation
  l1Tx.pushOperation(htmBuilder.getTransaction());

  // Sign with management key
  l1Tx.sign(wallet, assetData.owner);

  // Broadcast the transaction
  await wax.broadcast(l1Tx);
  return l1Tx.id.toString();
}

/**
 * Create and broadcast an HTM token transfer transaction
 */
export async function transferHTMToken (
  transferData: HTMTokenTransferData,
  wallet: IBeekeeperUnlockedWallet,
  operationalAccount: string
): Promise<string> {
  const wax = await getWax();

  // Set proxy account for HTM transactions
  HtmTransaction.HiveProxyAccount = operationalAccount;

  // Create L2 transaction for token transfer
  const htmBuilder = await HTMTransactionBuilder.create();
  htmBuilder.addTokenTransfer(transferData);
  await htmBuilder.sign(wallet);

  // Create L1 transaction to broadcast the HTM transaction
  const l1Tx = await wax.createTransaction();
  l1Tx.pushOperation(htmBuilder.getTransaction());
  l1Tx.sign(wallet, transferData.sender);

  // Broadcast the transaction
  await wax.broadcast(l1Tx);
  return l1Tx.id.toString();
}

/**
 * Update HTM user metadata
 */
export async function updateHTMUserMetadata (
  metadataData: HTMUserMetadataUpdateData,
  wallet: IBeekeeperUnlockedWallet,
  operationalAccount: string,
  managementKey: TPublicKey
): Promise<string> {
  const wax = await getWax();

  // Set proxy account for HTM transactions
  HtmTransaction.HiveProxyAccount = operationalAccount;

  // Create L2 transaction for metadata update
  const htmBuilder = await HTMTransactionBuilder.create();
  htmBuilder.addUserMetadataUpdate(metadataData);
  await htmBuilder.sign(wallet);

  // Create L1 transaction to broadcast the HTM transaction
  const l1Tx = await wax.createTransaction();
  l1Tx.pushOperation(htmBuilder.getTransaction());
  l1Tx.sign(wallet, managementKey);

  // Broadcast the transaction
  await wax.broadcast(l1Tx);
  return l1Tx.id.toString();
}

/**
 * Update HTM asset metadata
 */
export async function updateHTMAssetMetadata (
  metadataData: HTMAssetMetadataUpdateData,
  wallet: IBeekeeperUnlockedWallet,
  operationalAccount: string,
  feeAmount = 0.001
): Promise<string> {
  const wax = await getWax();

  // Set proxy account for HTM transactions
  HtmTransaction.HiveProxyAccount = operationalAccount;

  // Create L2 transaction for asset metadata update
  const htmBuilder = await HTMTransactionBuilder.create();
  htmBuilder.addAssetMetadataUpdate(metadataData);
  await htmBuilder.sign(wallet);

  // Create L1 transaction with optional fee transfer and HTM operation
  const l1Tx = await wax.createTransaction();

  // Add fee transfer operation if fee > 0
  if (feeAmount > 0) {
    l1Tx.pushOperation({
      transfer_operation: {
        from: operationalAccount,
        to: 'fee.htm',
        amount: wax.hiveCoins(feeAmount),
        memo: 'L2 asset metadata update fee'
      }
    });
  }

  // Add HTM asset metadata update operation
  l1Tx.pushOperation(htmBuilder.getTransaction());

  // Sign with owner key (management key)
  l1Tx.sign(wallet, metadataData.owner);

  // Broadcast the transaction
  await wax.broadcast(l1Tx);
  return l1Tx.id.toString();
}

/**
 * Validate public key format
 */
export function isValidPublicKey (key: string): boolean {
  return /^STM[A-Za-z0-9]+$/.test(key) && key.length >= 50;
}

/**
 * Validate NAI format
 */
export function isValidNAI (nai: string): boolean {
  return /^@@\d{9}$/.test(nai);
}

/**
 * Format asset amount with precision
 */
export function formatAssetAmount (amount: string | bigint, precision: number, symbol?: string): string {
  const numAmount = typeof amount === 'string' ? parseFloat(amount) : Number(amount);
  const divisor = Math.pow(10, precision);
  const formatted = (numAmount / divisor).toFixed(precision);
  return symbol ? `${formatted} ${symbol}` : formatted;
}

/**
 * Parse asset amount to base units
 */
export function parseAssetAmount (amount: string, precision: number): string {
  const numAmount = parseFloat(amount);
  const multiplier = Math.pow(10, precision);
  return Math.floor(numAmount * multiplier).toString();
}
