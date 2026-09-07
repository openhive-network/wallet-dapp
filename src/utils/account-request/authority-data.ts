import { downloadJson } from '@/utils/download-file';

import packageJson from '../../../package.json';

import type { AccountAuthorityData } from './keys';

const AUTHORITY_FILE_NOTE = 'KEEP THIS FILE SAFE! This master key is the key to your entire account. Store it in a secure location and never share it with anyone.';

export const getAuthorityFileGenerator = (): string => {
  const { public: { commitHash } } = useRuntimeConfig();

  return `Hive Bridge v${packageJson.version} #${commitHash}`;
};

export const buildAuthorityDataFile = (accountName: string, data: AccountAuthorityData, generator: string = getAuthorityFileGenerator()) => ({
  account_name: accountName,
  master_key: data.masterPassword,
  generated_at: new Date().toISOString(),
  authorities: {
    owner: { public_key: data.publicKeys.owner, private_key: data.privateKeys.owner },
    active: { public_key: data.publicKeys.active, private_key: data.privateKeys.active },
    posting: { public_key: data.publicKeys.posting, private_key: data.privateKeys.posting },
    memo: { public_key: data.publicKeys.memo, private_key: data.privateKeys.memo }
  },
  _note: AUTHORITY_FILE_NOTE,
  generator
});

export const downloadAuthorityDataFile = (accountName: string, data: AccountAuthorityData): void =>
  downloadJson(buildAuthorityDataFile(accountName, data), `${accountName}-authority-data.json`);
