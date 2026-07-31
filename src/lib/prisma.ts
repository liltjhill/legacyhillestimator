import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

declare global {
  var prismaClient: PrismaClient | undefined;
}

function createPrismaClient() {
  const adapter = new PrismaPg({
    connectionString: process.env.DATABASE_URL,
    // node-postgres has no default connection timeout, so a stalled
    // connection attempt (bad network path, DB unreachable, etc.) hangs
    // forever with no error instead of failing fast.
    connectionTimeoutMillis: 10_000,
    // Serverless functions are ephemeral - keep the per-instance pool small
    // rather than each warm instance accumulating a large one.
    max: 5,
  });
  return new PrismaClient({ adapter });
}

export const prisma = globalThis.prismaClient ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalThis.prismaClient = prisma;
}
