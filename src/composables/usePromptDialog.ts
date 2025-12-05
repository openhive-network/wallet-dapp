import { ref, type Ref } from 'vue';

export class PromptDialogCancelledError extends Error {
  public constructor (message: string = 'User cancelled prompt dialog') {
    super(message);
    this.name = 'PromptDialogCancelledError';
  }
}

type ValueResolver<T> = (value: T) => void;
type ValueRejecter = (error: Error) => void;

export interface PromptDialogState<T> {
  readonly isOpen: Ref<boolean>;
  request: () => Promise<T>;
  submit: (value: T) => void;
  cancel: () => void;
}

export function usePromptDialog<T = string> (errorMessage?: string): PromptDialogState<T> {
  const isOpen = ref(false);
  let _resolve: ValueResolver<T> | null = null;
  let _reject: ValueRejecter | null = null;

  const request = (): Promise<T> => {
    return new Promise((resolve, reject) => {
      _resolve = resolve;
      _reject = reject;
      isOpen.value = true;
    });
  };

  const submit = (value: T) => {
    if (_resolve) {
      _resolve(value);
      _resolve = null;
      _reject = null;
    }
    isOpen.value = false;
  };

  const cancel = () => {
    if (_reject) {
      _reject(new PromptDialogCancelledError(errorMessage));
      _resolve = null;
      _reject = null;
    }
    isOpen.value = false;
  };

  return {
    isOpen,
    request,
    submit,
    cancel
  };
}

// Singleton instances for shared state across components
export class PasswordEntryCancelledError extends PromptDialogCancelledError {
  public constructor () {
    super('User cancelled password entry');
    this.name = 'PasswordEntryCancelledError';
  }
}

export class AccountNameEntryCancelledError extends PromptDialogCancelledError {
  public constructor () {
    super('User cancelled account name entry');
    this.name = 'AccountNameEntryCancelledError';
  }
}

let recoveryPasswordDialog: PromptDialogState<string> | null = null;
let accountNamePromptDialog: PromptDialogState<string> | null = null;

export function useRecoveryPasswordDialog (): PromptDialogState<string> {
  if (!recoveryPasswordDialog)
    recoveryPasswordDialog = usePromptDialog<string>('User cancelled password entry');

  return recoveryPasswordDialog;
}

export function useAccountNamePromptDialog (): PromptDialogState<string> {
  if (!accountNamePromptDialog)
    accountNamePromptDialog = usePromptDialog<string>('User cancelled account name entry');

  return accountNamePromptDialog;
}
