import 'dotenv/config';

import { defineConfig } from 'prisma/config';

import { resolveAccountRequestDatabaseUrl } from './server/utils/account-request/database-url';

// Prisma CLI configuration - the runtime client is configured in server/utils/account-request/db.ts.
// The SQLite claims database is synchronised straight from the schema (`pnpm db:push`), no migration history is kept.
export default defineConfig({
  schema: 'prisma/schema.prisma',
  datasource: {
    url: resolveAccountRequestDatabaseUrl(process.env.NUXT_ACCOUNT_REQUEST_DATABASE_URL)
  }
});
