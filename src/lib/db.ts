import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;

const isPostgres = (process.env.DATABASE_URL ?? "").startsWith("postgres");

/** Filtro «contiene» sin distinguir mayúsculas: en PostgreSQL usa mode insensitive (SQLite ya lo hace así). */
export function ilike(value: string) {
  return (isPostgres ? { contains: value, mode: "insensitive" } : { contains: value }) as { contains: string };
}
