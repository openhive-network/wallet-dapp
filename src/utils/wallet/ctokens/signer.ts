import type { IBeekeeperInstance, IBeekeeperUnlockedWallet } from '@hiveio/beekeeper';
import type { IHiveChainInterface, ISignatureTransaction, TPublicKey, TRole, TSignature, TWaxRestExtended } from '@hiveio/wax';
import { AEncryptionProvider } from '@hiveio/wax';

import RestApi from './api';

export class WaxCTokensEncryptionProviderError extends Error {
  public constructor (message: string, cause?: Error) {
    super(message, { cause });
  }
}

const OPERATIONAL_WALLET_NAME_SUFFIX = 'operational';
const MANAGEMENT_WALLET_NAME_SUFFIX = 'management';

const LOCAL_STORAGE_WALLET_INDEX_KEY = 'ctokens_wallet_index';
const LOCAL_STORAGE_WALLET_INDEX_DEFAULT = 0;

export class CTokensProvider extends AEncryptionProvider {
  static #beekeeper: IBeekeeperInstance | undefined;

  static #operationalWallet: IBeekeeperUnlockedWallet | undefined;
  static #managementWallet: IBeekeeperUnlockedWallet | undefined;

  public readonly publicKey: TPublicKey;

  public readonly extendedChain: TWaxRestExtended<typeof RestApi, IHiveChainInterface>;

  public static isLoggedIn (): boolean {
    return !!CTokensProvider.#operationalWallet;
  }

  public static getOperationalPublicKey (): string | undefined {
    if (CTokensProvider.#operationalWallet)
      return CTokensProvider.#operationalWallet.getPublicKeys()[0];

    return undefined;
  }

  public static getManagementPublicKey (): string | undefined {
    if (CTokensProvider.#managementWallet)
      return CTokensProvider.#managementWallet.getPublicKeys()[0];

    return undefined;
  }

  private constructor (
    chain: IHiveChainInterface,
    public readonly role: TRole,
    endpointUrl: string
  ) {
    super();

    this.extendedChain = chain.extendRest(RestApi);
    this.extendedChain.restApi.ctokensApi.endpointUrl = endpointUrl;

    const publicKey = role === 'owner' ? CTokensProvider.getManagementPublicKey() : CTokensProvider.getOperationalPublicKey();

    if (!publicKey)
      throw new WaxCTokensEncryptionProviderError('The requested wallet does not have a public key.');

    this.publicKey = publicKey;
  }

  private async publicKeyHasAccount (): Promise<boolean> {
    const response = await this.extendedChain.restApi.ctokensApi.users({ user: this.publicKey });

    return !!response?.management_key;
  }

  public async destroy () {
    await CTokensProvider.#beekeeper?.delete();
    CTokensProvider.#beekeeper = undefined;
    CTokensProvider.#operationalWallet = undefined;
    CTokensProvider.#managementWallet = undefined;
  }

  private static async prepareBeekeeper () {
    if (!CTokensProvider.#beekeeper) {
      // XXX: Fix dynamic beekeeeper import
      CTokensProvider.#beekeeper = await (import('@hiveio/beekeeper')).then(async bk => {
        return await bk.default({ inMemory: false, enableLogs: false, unlockTimeout: /* 1 day: */ 86400 });
      });
    }
  }

  private static get walletIndex (): number {
    let ctokens_wallet_index = localStorage.getItem(LOCAL_STORAGE_WALLET_INDEX_KEY);
    if (!ctokens_wallet_index)
      localStorage.setItem(LOCAL_STORAGE_WALLET_INDEX_KEY, ctokens_wallet_index = LOCAL_STORAGE_WALLET_INDEX_DEFAULT.toString());


    const num = parseInt(ctokens_wallet_index);
    if (isNaN(num) || num < 0)
      throw new WaxCTokensEncryptionProviderError('Invalid ctokens wallet index stored in local storage');


    return num;
  }

  public static get currentOperationalWalletName (): string {
    const walletIndex = CTokensProvider.walletIndex;
    return `CTOKENS_WALLET_${walletIndex}_${OPERATIONAL_WALLET_NAME_SUFFIX}`;
  }

  public static get currentManagementWalletName (): string {
    const walletIndex = CTokensProvider.walletIndex;
    return `CTOKENS_WALLET_${walletIndex}_${MANAGEMENT_WALLET_NAME_SUFFIX}`;
  }

  public static async login (password: string) {
    await CTokensProvider.prepareBeekeeper();

    const session = CTokensProvider.#beekeeper!.createSession(Math.random().toString());

    try {
      CTokensProvider.#operationalWallet = session.openWallet(CTokensProvider.currentOperationalWalletName).unlock(password);
    } catch (error) {
      throw new WaxCTokensEncryptionProviderError('Failed to unlock operational wallet. Make sure the password is correct.', error as Error);
    }

    try {
      CTokensProvider.#managementWallet = session.openWallet(CTokensProvider.currentManagementWalletName).unlock(password);
    } catch {
      // Owner wallet is optional
      CTokensProvider.#managementWallet = undefined;
    }
  }

  public static async hasWallet (): Promise<boolean> {
    if (!CTokensProvider.#beekeeper)
      await CTokensProvider.prepareBeekeeper();
    const session = CTokensProvider.#beekeeper!.createSession(Math.random().toString());

    return session.hasWallet(CTokensProvider.currentOperationalWalletName);
  }

  public static async createWallet (userNewWalletPassword: string, operationalPrivateKey: TPublicKey, managementPrivateKey?: TPublicKey): Promise<{ management?: TPublicKey; operational: TPublicKey; }> {
    await CTokensProvider.prepareBeekeeper();

    const session = CTokensProvider.#beekeeper!.createSession(Math.random().toString());

    // Increment wallet index for the wallet creation
    localStorage.setItem(LOCAL_STORAGE_WALLET_INDEX_KEY, (CTokensProvider.walletIndex + 1).toString());

    const { wallet } = await session.createWallet(CTokensProvider.currentOperationalWalletName, userNewWalletPassword);

    const operational = await wallet.importKey(operationalPrivateKey);
    wallet.lock();

    let management: TPublicKey | undefined;

    if (managementPrivateKey) {
      const { wallet: managementWallet } = await session.createWallet(CTokensProvider.currentManagementWalletName, userNewWalletPassword);
      management = await managementWallet.importKey(managementPrivateKey);
      managementWallet.lock();
    }

    return { management, operational };
  }

  public static async for (chain: IHiveChainInterface, role: TRole, onlineCheckKeys = true, ctokensUrl?: string): Promise<CTokensProvider> {
    if (role === 'owner') {
      if (!CTokensProvider.#managementWallet)
        throw new WaxCTokensEncryptionProviderError('Owner wallet is not available. Make sure to login with the correct password and import the required key.');
    } else {
      if (!CTokensProvider.#operationalWallet)
        throw new WaxCTokensEncryptionProviderError('Management wallet is not available. Make sure to login with the correct password and import the required key.');
    }

    if (!CTokensProvider.#beekeeper)
      await CTokensProvider.prepareBeekeeper();

    const { public: { ctokensApiUrl } } = useRuntimeConfig();

    if (!ctokensUrl)
      ctokensUrl = ctokensApiUrl || 'http://192.168.6.7';

    const instance = new CTokensProvider(chain, role, ctokensUrl);

    if (onlineCheckKeys) {
      const hasPublicKeyInSystem = await instance.publicKeyHasAccount();

      if (!hasPublicKeyInSystem)
        throw new WaxCTokensEncryptionProviderError(`The provided ${role} key is not registered in the ctokens system. Please use a different key.`);
    }

    return instance;
  }

  public async encryptData (content: string, recipient: TPublicKey): Promise<string> {
    return this.extendedChain.encrypt(CTokensProvider.#operationalWallet!, content, this.publicKey, recipient);
  }

  public async decryptData (content: string): Promise<string> {
    return this.extendedChain.decrypt(CTokensProvider.#operationalWallet!, content);
  }

  protected async generateSignatures (transaction: ISignatureTransaction): Promise<TSignature[]> {
    const wallet = this.role === 'owner' ? CTokensProvider.#managementWallet! : CTokensProvider.#operationalWallet!;

    const signature = wallet.signDigest(this.publicKey, transaction.sigDigest);

    return [signature];
  }
}

export default CTokensProvider;
