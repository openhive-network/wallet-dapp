import path from 'node:path'
import fs from 'node:fs'
import vue from '@vitejs/plugin-vue'
import eslint from '@nabla/vite-plugin-eslint'
import autoprefixer from 'autoprefixer'
import tailwind from 'tailwindcss'
import { defineConfig, loadEnv } from 'vite'

const getCommitHash = () => {
  const rev = fs.readFileSync('.git/HEAD').toString().trim();

  if (!rev.includes(':'))
    return rev;
  else
    return fs.readFileSync(`.git/${rev.substring(5)}`).toString().trim();
};

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Load environment variables based on the current mode
  const env = loadEnv(mode, process.cwd(), '')
  
  // Define default values that can be overridden by environment variables
  const envDefaults = {
    VITE_CTOKENS_API_URL: env.VITE_CTOKENS_API_URL || 'http://localhost:3000',
    VITE_HIVE_NODE_ENDPOINT: env.VITE_HIVE_NODE_ENDPOINT || 'https://api.hive.blog',
    VITE_HIVE_CHAIN_ID: env.VITE_HIVE_CHAIN_ID || '42'
  }

  return {
    css: {
      postcss: {
        plugins: [tailwind(), autoprefixer()],
      },
    },
    plugins: [
      vue(),
      eslint({
        shouldLint: (path) => path.includes('src/') && (path.endsWith('.vue') || path.endsWith('.ts') || path.endsWith('.js'))
      })
    ],
    resolve: {
      alias: {
        '@': path.resolve(import.meta.dirname, './src'),
      },
    },
    server: {
      allowedHosts: [
        '15.bc.fqdn.pl'
      ]
    },
    define: {
      __COMMIT_HASH__: JSON.stringify(getCommitHash()),
      // Make environment variables available in the application
      ...Object.keys(envDefaults).reduce((acc, key) => {
        acc[`import.meta.env.${key}`] = JSON.stringify(envDefaults[key as keyof typeof envDefaults])
        return acc
      }, {} as Record<string, string>)
    },
  }
})
