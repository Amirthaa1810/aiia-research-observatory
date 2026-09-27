import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  // Named for Wrangler, which only reads a folder called `migrations` next to its
  // config. Drizzle writes here and `wrangler d1 migrations apply` reads the same
  // SQL, so there is one source of truth for schema changes.
  out: './migrations',
  schema: './db/schema.ts',
  dialect: 'sqlite',
});
