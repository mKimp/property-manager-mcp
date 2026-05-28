import 'dotenv/config'
import { defineConfig } from 'prisma/config'

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    // LOCAL_DATABASE_URL is used for local `prisma migrate dev` against Turso.
    // On Render, this env var isn't set — but prisma generate (build step) doesn't
    // connect to the DB, so a placeholder is fine. Runtime uses the libsql adapter.
    url: process.env.LOCAL_DATABASE_URL ?? 'file:./dev.db',
  },
})
