import fs from 'node:fs';
import path from 'node:path';

import { defineNuxtConfig } from 'nuxt/config';

import { stripTestIds } from './config/vite-strip-testid';

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
  // Dev-only overrides (not applied to production builds)
  $development: {
    vite: {
      server: {
        // Allow Cloudflare quick tunnels (ephemeral *.trycloudflare.com hostnames)
        allowedHosts: ['.trycloudflare.com']
      }
    }
  },
  vite: {
    plugins: [stripTestIds()],
    esbuild: {
      target: 'es2022'
    },
    build: {
      sourcemap: false // Only affects production builds - dev has sourcemaps enabled by default
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
  imports: {
    dirs: ['src/composables']
  },
  modules: ['@nuxtjs/tailwindcss', '@nuxtjs/color-mode', '@nuxt/eslint', '@pinia/nuxt'],
  alias: {
    '@': path.resolve(import.meta.dirname, './src')
  },
  eslint: {
    checker: true
  },
  nitro: {
    sourceMap: false // Disable server-side sourcemaps in production
  },
  runtimeConfig: {
    public: {
      showHtmInMenu: false,
      enableL1Proxy: true,
      htmProxyAccount: 'htm.proxy',
      commitHash: getCommitHash(),
      ctokensApiUrl: 'https://htm.fqdn.pl:10081',
      hiveNodeEndpoint: 'https://api.hive.blog',
      hiveChainId: '',
      snapOrigin: '',
      snapVersion: '',
      appUrl: process.env.NUXT_PUBLIC_APP_URL || 'http://localhost:3000'
    },
    googleApplicationCredentialsJson: {},
    googleWalletIssuerId: process.env.GOOGLE_WALLET_ISSUER_ID || '',
    googleClientId: process.env.GOOGLE_CLIENT_ID || '',
    googleClientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
    googleApiKey: process.env.GOOGLE_API_KEY || '',
    googleDriveStorageFile: process.env.GOOGLE_DRIVE_STORAGE_FILE || 'profile_data.json',
    // Account onboarding via QR code (optional module, see .env.example - enabled by NUXT_ACCOUNT_CREATOR_*)
    accountRequestTokenInterval: 3,
    accountRequestDatabaseUrl: 'file:./.data/account-requests.sqlite',
    accountCreatorAccount: process.env.NUXT_ACCOUNT_CREATOR_ACCOUNT || '',
    accountCreatorActiveKey: process.env.NUXT_ACCOUNT_CREATOR_ACTIVE_KEY || '',
    accountCreatorUseClaimedAccounts: false
  }
});
