import { PrismaPg } from '@prisma/adapter-pg';

const DEFAULT_DATABASE_URL =
  'postgresql://postgres:postgres@localhost:5432/pos_dev?schema=public';

export function createPrismaClientOptions() {
  return {
    adapter: new PrismaPg({
      connectionString: process.env['DATABASE_URL'] ?? DEFAULT_DATABASE_URL,
    }),
  };
}
