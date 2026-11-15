import { defineConfig } from 'prisma/config';

export default defineConfig({
  schema: './prisma/schema.prisma',
  migrations: {
    path: './prisma/migrations',
  },
  datasource: {
    // `prisma generate` and `prisma validate` run without a database, so the
    // URL may be empty here. Migrate commands fail on an empty URL.
    url: process.env.DATABASE_URL ?? '',
  },
});
