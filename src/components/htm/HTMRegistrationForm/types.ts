import type { ComputedRef, InjectionKey, Ref } from 'vue';

export interface HTMRegistrationContext {
  registrationData: Ref<{
    name: string;
    about: string;
    website: string;
    profile_image: string;
    walletPassword: string;
    repeatPassword: string;
  }>;
  generatedKeys: Ref<{
    operationalPrivateKey: string;
    operationalPublicKey: string;
    managementPrivateKey: string;
    managementPublicKey: string;
  }>;
  keysGenerated: Ref<boolean>;
  hasConfirmedDownload: Ref<boolean>;
  isLoading: Ref<boolean>;
  isBasicInfoValid: ComputedRef<boolean>;
  generateAndDownloadKeys: () => Promise<void>;
  downloadKeysFile: () => void;
  resetProcess: () => void;
}

export const HTM_REGISTRATION_KEY: InjectionKey<HTMRegistrationContext> = Symbol('htm-registration');
