import fs from 'node:fs';
import path from 'node:path';

import { defineNuxtConfig } from 'nuxt/config';

const getCommitHash = () => {
  const rev = fs.readFileSync('.git/HEAD').toString().trim();

  if (!rev.includes(':'))
    return rev;
  else
    return fs.readFileSync(`.git/${rev.substring(5)}`).toString().trim();
};

export default defineNuxtConfig({
  compatibilityDate: '2025-10-28',
  app: {
    head: {
      title: 'Hive Bridge',
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        { name: 'description', content: 'Bridge to Hive' }
      ],
      link: [
        { rel: 'icon', type: 'image/svg+xml', href: '/icon.svg' }
      ]
    }
  },
  dir: {
    app: 'src',
    assets: 'src/assets',
    layouts: 'src/layouts',
    pages: 'src/pages',
    middleware: 'src/middleware',
    plugins: 'src/plugins'
  },
  modules: ['@nuxtjs/tailwindcss', '@nuxtjs/color-mode', '@nuxt/eslint', '@pinia/nuxt'],
  alias: {
    /* eslint-disable-next-line @typescript-eslint/naming-convention */
    '@': path.resolve(import.meta.dirname, './src')
  },
  eslint: {
    checker: true
  },
  runtimeConfig: {
    public: {
      commitHash: getCommitHash(),
      ctokensApiUrl: 'https://htm.fqdn.pl:10081',
      hiveNodeEndpoint: 'https://api.hive.blog',
      hiveChainId: '',
      snapOrigin: '',
      snapVersion: ''
    },
    googleApplicationCredentialsJson: {}
  }
});
