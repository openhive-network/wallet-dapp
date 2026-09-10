import 'dotenv/config';

import { defineConfig } from 'prisma/config';

// Prisma CLI configuration - the runtime client is configured in server/utils/account-request/db.ts.
// The SQLite claims database is synchronised straight from the schema (`pnpm db:push`), no migration history is kept.
// The datasource URL is only defined when the optional account-request module is configured.
export default defineConfig({
  schema: 'prisma/schema.prisma',
  datasource: {
    url: process.env.NUXT_ACCOUNT_REQUEST_DATABASE_URL
  }
});
