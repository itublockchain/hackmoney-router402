import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import { PrismaClient } from "../../generated/prisma/client.js";

let prisma: PrismaClient | null = null;

/**
 * Get or create Prisma client with Neon adapter
 */
export function getPrismaClient(databaseUrl: string): PrismaClient {
  if (prisma) {
    return prisma;
  }

  const pool = new pg.Pool({ connectionString: databaseUrl });
  const adapter = new PrismaPg(pool);

  prisma = new PrismaClient({ adapter });

  return prisma;
}

/**
 * Disconnect Prisma client
 */
export async function disconnectPrisma(): Promise<void> {
  if (prisma) {
    await prisma.$disconnect();
    prisma = null;
  }
}
