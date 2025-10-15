import type { IBeekeeperUnlockedWallet } from '@hiveio/beekeeper';
import type { TPublicKey } from '@hiveio/wax';
import { HtmTransaction } from '@mtyszczak-cargo/htm';

import { getWax } from '@/stores/wax.store';

import {
  HTMTransactionBuilder,
  type HTMUserSignupData,
  type HTMAssetDefinitionData,
  type HTMTokenTransferData,
  type HTMUserMetadataUpdateData,
  type HTMAssetMetadataUpdateData
} from './htm';

// Re-export types from htm.ts for convenience
export type {
  HTMUserSignupData,
  HTMAssetDefinitionData,
  HTMTokenTransferData,
  HTMUserMetadataUpdateData,
  HTMAssetMetadataUpdateData
} from './htm';

/**
 * Create and broadcast an HTM user signup transaction
 * This is the full implementation using HTM library and beekeeper wallets.
 */
export async function createHTMUser (
  signupData: HTMUserSignupData,
  wallet: IBeekeeperUnlockedWallet,
  operationalAccount: string
): Promise<string> {
  const wax = await getWax();

  // Set proxy account for HTM transactions
  HtmTransaction.HiveProxyAccount = operationalAccount;

  // Create L2 HTM transaction for user signup
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
}/**
 * Create and broadcast an HTM asset definition transaction
 * This is the full implementation using HTM library and beekeeper wallets.
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

  // Create L2 HTM transaction for asset definition
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
 * This is the full implementation using HTM library and beekeeper wallets.
 */
export async function transferHTMToken (
  transferData: HTMTokenTransferData,
  wallet: IBeekeeperUnlockedWallet,
  operationalAccount: string
): Promise<string> {
  const wax = await getWax();

  // Set proxy account for HTM transactions
  HtmTransaction.HiveProxyAccount = operationalAccount;

  // Create L2 HTM transaction for token transfer
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
 * This is the full implementation using HTM library and beekeeper wallets.
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

  // Create L2 HTM transaction for metadata update
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
 * This is the full implementation using HTM library and beekeeper wallets.
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

  // Create L2 HTM transaction for asset metadata update
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
 * Generate a random NAI identifier for new tokens
 */
export function generateNAI (): string {
  // Generate a random number between 100000000 and 999999999
  const randomNum = Math.floor(Math.random() * 900000000) + 100000000;
  return `@@${randomNum}`;
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
