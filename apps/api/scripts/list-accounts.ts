/**
 * Lista as contas reais (vindas do Clerk) só com @username e data, para saber a quem dar
 * o primeiro papel (scripts/grant-role.ts aceita email ou @username).
 *
 *   pnpm --filter @stp/api exec tsx scripts/list-accounts.ts
 */
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client.js";

const url = process.env["DATABASE_URL"];
if (!url) throw new Error("Falta DATABASE_URL (apps/api/.env).");
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: url }) });

const rows = await prisma.user.findMany({
  where: { clerkId: { not: null }, status: { not: "DELETED" } },
  orderBy: { createdAt: "asc" },
  select: { username: true, name: true, createdAt: true },
});
if (!rows.length) console.log("Ainda não há contas reais.");
for (const r of rows) {
  console.log(`@${r.username} · ${r.name} · ${r.createdAt.toISOString().slice(0, 10)}`);
}
await prisma.$disconnect();
