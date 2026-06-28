import { PrismaClient } from "@prisma/client";

/**
 * Prisma Client singleton for serverless/edge-adjacent Next.js environments.
 *
 * Next.js hot-reloads server modules in development, which would otherwise
 * create a new PrismaClient (and a new DB connection pool) on every reload.
 * Caching the instance on `globalThis` avoids exhausting Postgres connection
 * limits during local development.
 */
declare global {
  var prismaGlobal: PrismaClient | undefined;
}

export const prisma: PrismaClient = globalThis.prismaGlobal ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalThis.prismaGlobal = prisma;
}
