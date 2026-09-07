import { computed, nextTick, onMounted, ref, watch, type Ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { toast } from 'vue-sonner';


import { PromptDialogCancelledError, usePromptDialog } from '@/composables/usePromptDialog';
import { useAccountRequestStore } from '@/stores/account-request.store';
import { useSettingsStore } from '@/stores/settings.store';
import type { AccountAuthorityData } from '@/utils/account-request/keys';
import {
  checkGoogleDriveRegistration,
  createGoogleDriveStrategy,
  createMetamaskStrategy,
  createPasswordStrategy,
  type AccountRegistrationStrategy,
  type PreparedAccountKeys
} from '@/utils/account-request/methods';
import { toastError } from '@/utils/parse-error';

import {
  ACCOUNT_REQUEST_CREATE_PATH,
  ACCOUNT_REQUEST_TOKEN_QUERY_PARAM,
  type AccountPublicKeys,
  type AccountRegistrationMethod,
  type AccountRequestClaimResponse
} from '#shared/types/account-request';
import { normalizeAccountName } from '#shared/utils/account-name';

export type AccountCreationStage = 'verifying' | 'invalid' | 'claimed' | 'unavailable' | 'ready' | 'submitting' | 'success';
export type AccountCreationStep = 'preparing' | 'creating' | 'finalizing';

interface AccountCreationDraft {
  accountName: string;
  method?: AccountRegistrationMethod;
}

/** Everything the success screen shows - public data only, the private keys never leave the session that generated them */
export interface CreatedAccount {
  accountName: string;
  method: AccountRegistrationMethod;
  publicKeys: AccountPublicKeys;
  transactionId: string;
}

/** Per-token session storage: the draft survives the Google sign-in round trip, the created account a page reload */
const tokenStorage = <T>(prefix: string) => ({
  save: (token: string, value: T) => {
    try {
      sessionStorage.setItem(`${prefix}${token}`, JSON.stringify(value));
    } catch {}
  },
  load: (token: string): T | undefined => {
    try {
      const raw = sessionStorage.getItem(`${prefix}${token}`);

      return raw ? JSON.parse(raw) as T : undefined;
    } catch {
      return undefined;
    }
  },
  clear: (token: string) => {
    try {
      sessionStorage.removeItem(`${prefix}${token}`);
    } catch {}
  }
});

const draftStorage = tokenStorage<AccountCreationDraft>('hivebridge_account_request_draft:');
const createdAccountStorage = tokenStorage<CreatedAccount>('hivebridge_account_request_created:');

/**
 * Orchestrates the "create account from a scanned QR code" flow:
 * token verification -> account name -> registration method (submits immediately) -> backend claim -> wallet login.
 * Presentation components only bind to the state and actions exposed here.
 */
export const useAccountCreationFlow = (token: Ref<string>) => {
  const accountRequestStore = useAccountRequestStore();
  const settingsStore = useSettingsStore();
  const route = useRoute();
  const router = useRouter();

  const stage = ref<AccountCreationStage>('verifying');
  const step = ref<AccountCreationStep | undefined>();
  const preparingMessage = ref<string | undefined>();

  const accountName = ref('');
  const isAccountNameValid = ref(false);
  /** Method whose inline form is expanded (only the password method has one) */
  const selectedMethod = ref<AccountRegistrationMethod | undefined>();
  /** Method whose pre-checks are running before submission (e.g. Google session lookup) */
  const pendingMethod = ref<AccountRegistrationMethod | undefined>();

  /** The created account - fresh from the claim or recalled from session storage after a page reload */
  const result = ref<CreatedAccount | undefined>();
  /** Private key material - exists only in the session that generated it, never after a page reload */
  const authorityData = ref<AccountAuthorityData | undefined>();

  /** Asks for the password encrypting a brand new Google Drive wallet file */
  const recoveryPasswordSetupDialog = usePromptDialog<string>('User cancelled recovery password setup');

  const normalizedAccountName = computed(() => normalizeAccountName(accountName.value));
  const canSubmit = computed(() => stage.value === 'ready' && isAccountNameValid.value && normalizedAccountName.value.length > 0 && !pendingMethod.value);
  const isSubmitting = computed(() => stage.value === 'submitting');

  const showCreatedAccount = (account: CreatedAccount, keys?: AccountAuthorityData) => {
    result.value = account;
    authorityData.value = keys;
    draftStorage.clear(token.value);

    stage.value = 'success';
    step.value = undefined;
  };

  const verify = async () => {
    if (!token.value) {
      stage.value = 'invalid';
      return;
    }

    stage.value = 'verifying';

    try {
      const verification = await accountRequestStore.verifyToken(token.value);

      if (verification.valid)
        stage.value = 'ready';
      else
        stage.value = verification.reason === 'claimed' ? 'claimed' : 'invalid';
    } catch {
      stage.value = 'unavailable';
    }
  };

  const submit = async (strategy: AccountRegistrationStrategy) => {
    if (!canSubmit.value)
      return;

    const name = normalizedAccountName.value;

    stage.value = 'submitting';
    step.value = 'preparing';
    preparingMessage.value = strategy.preparingMessage;

    let keys: PreparedAccountKeys;
    try {
      keys = await strategy.prepare(name);
    } catch (error) {
      if (!(error instanceof PromptDialogCancelledError))
        toastError('Failed to prepare the account keys', error);

      stage.value = 'ready';
      step.value = undefined;
      return;
    }

    step.value = 'creating';

    let claim: AccountRequestClaimResponse;
    try {
      claim = await accountRequestStore.claimAccount({ token: token.value, accountName: name, method: strategy.method, publicKeys: keys.publicKeys });
    } catch (error) {
      await strategy.onFailed?.(name, keys).catch(() => undefined);

      toastError('Account creation failed', error);
      step.value = undefined;
      // A rejected request may still have used the token up (or another tab may have completed it) - follow the backend state
      await verify();
      return;
    }

    step.value = 'finalizing';

    try {
      await strategy.onCreated?.(name, claim, keys);
    } catch (error) {
      toastError('Account created, but the automatic wallet login failed', error);
    }

    const created: CreatedAccount = { accountName: name, method: strategy.method, publicKeys: keys.publicKeys, transactionId: claim.transactionId };

    // The token is used up now - remembering the outcome lets a page reload show this screen again instead of a "link already used" notice
    createdAccountStorage.save(token.value, created);
    showCreatedAccount(created, keys.authorityData);

    toast.success(`Account @${name} has been created!`);
  };

  /** Redirects to Google OAuth; the draft is restored and the flow resumes when Google sends the user back here */
  const startGoogleLogin = () => {
    draftStorage.save(token.value, { accountName: accountName.value, method: 'google' });

    const returnUrl = new URL(ACCOUNT_REQUEST_CREATE_PATH, window.location.origin);
    returnUrl.searchParams.set(ACCOUNT_REQUEST_TOKEN_QUERY_PARAM, token.value);

    settingsStore.loginWithGoogle(`${returnUrl.pathname}${returnUrl.search}`);
  };

  const submitWithPassword = (password: string) => submit(createPasswordStrategy(password));

  const submitWithMetamask = () => submit(createMetamaskStrategy());

  /** Signs in with Google when needed, asks for a recovery password for a new wallet file and submits */
  const submitWithGoogleDrive = async () => {
    if (!canSubmit.value)
      return;

    pendingMethod.value = 'google';

    try {
      const precheck = await checkGoogleDriveRegistration();

      if (!precheck.authenticated) {
        startGoogleLogin();
        return;
      }

      let recoveryPassword: string | undefined;

      if (!precheck.walletExists) {
        try {
          recoveryPassword = await recoveryPasswordSetupDialog.request();
        } catch {
          return;
        }
      }

      pendingMethod.value = undefined;

      await submit(createGoogleDriveStrategy({ walletExists: precheck.walletExists, recoveryPassword }));
    } catch (error) {
      toastError('Failed to check the Google Drive wallet', error);
    } finally {
      pendingMethod.value = undefined;
    }
  };

  /** Google and MetaMask submit right away - only the password method expands an inline form first */
  const selectMethod = (method: AccountRegistrationMethod) => {
    switch (method) {
    case 'google':
      void submitWithGoogleDrive();
      break;
    case 'metamask':
      void submitWithMetamask();
      break;
    default:
      selectedMethod.value = selectedMethod.value === method ? undefined : method;
    }
  };

  /** Consumes the OAuth result query params appended by the Google callback, keeping the token in the URL */
  const handleOAuthReturn = (): boolean => {
    const { auth, error, ...remainingQuery } = route.query;

    if (auth === undefined && error === undefined)
      return false;

    if (typeof error === 'string')
      toastError('Google sign-in failed', new Error(error));

    void router.replace({ query: remainingQuery });

    return auth === 'success';
  };

  onMounted(() => {
    // Reloading the page after a successful creation: the token is used up, but this tab still knows what it created
    const created = createdAccountStorage.load(token.value);
    if (created) {
      showCreatedAccount(created);
      return;
    }

    const draft = draftStorage.load(token.value);
    const resumeGoogleRegistration = handleOAuthReturn() && draft?.method === 'google';

    // Back from Google sign-in: continue automatically once the restored account name passes validation
    if (resumeGoogleRegistration) {
      const stopWaiting = watch(isAccountNameValid, (isValid) => {
        if (!isValid || stage.value !== 'ready')
          return;

        stopWaiting();
        void submitWithGoogleDrive();
      });
    }

    void verify().then(async () => {
      if (!draft?.accountName || stage.value !== 'ready')
        return;

      // The name input mounts together with the form - the restored value is applied afterwards so its validation runs
      await nextTick();
      accountName.value = draft.accountName;
    });
  });

  return {
    stage,
    step,
    preparingMessage,
    accountName,
    normalizedAccountName,
    isAccountNameValid,
    selectedMethod,
    pendingMethod,
    canSubmit,
    isSubmitting,
    result,
    authorityData,
    recoveryPasswordSetupDialog,
    verify,
    selectMethod,
    submitWithPassword,
    submitWithMetamask,
    submitWithGoogleDrive,
    startGoogleLogin
  };
};
