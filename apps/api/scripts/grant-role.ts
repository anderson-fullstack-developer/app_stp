/**
 * Dar um papel a uma conta pela linha de comandos (para o primeiro SUPER_ADMIN, que não
 * tem ninguém no painel que lho dê). Depois disso, os papéis dão-se no painel.
 *
 *   pnpm --filter @stp/api exec tsx scripts/grant-role.ts --list
 *   pnpm --filter @stp/api exec tsx scripts/grant-role.ts <email|@username> <PAPEL> [língua]
 */
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, type Role } from "../src/generated/prisma/client.js";

const ROLES: Role[] = [
  "MODERATOR",
  "CONTENT_EDITOR",
  "LINGUIST",
  "ADMIN",
  "SUPER_ADMIN",
  "VOICE_SPEAKER",
  "VOICE_LISTENER",
];
const url = process.env["DATABASE_URL"];
if (!url) throw new Error("Falta DATABASE_URL (apps/api/.env).");
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: url }) });

async function main() {
  const [first, roleArg, languageId = null] = process.argv.slice(2);
  if (first === "--list") {
    const rows = await prisma.userRole.findMany({
      where: { role: { not: "USER" } },
      select: { role: true, languageId: true, user: { select: { username: true } } },
    });
    if (!rows.length) console.log("Ninguém tem papéis de administração.");
    for (const r of rows)
      console.log(`@${r.user.username}: ${r.role}${r.languageId ? ` (${r.languageId})` : ""}`);
    return;
  }
  const role = roleArg as Role;
  if (!first || !ROLES.includes(role)) {
    throw new Error(`Uso: grant-role.ts <email> <${ROLES.join("|")}> [língua]`);
  }
  const user = first.startsWith("@")
    ? await prisma.user.findUnique({ where: { username: first.slice(1) } })
    : await prisma.user.findUnique({ where: { email: first.toLowerCase() } });
  if (!user) throw new Error("Conta não encontrada (entra primeiro na app com esse email).");
  const existing = await prisma.userRole.findFirst({
    where: { userId: user.id, role, languageId },
  });
  if (!existing) {
    await prisma.userRole.create({ data: { userId: user.id, role, languageId } });
    await prisma.adminAuditLog.create({
      data: {
        action: "user.role_grant",
        entityType: "USER",
        entityId: user.id,
        metadata: { role, languageId, via: "cli" },
      },
    });
  }
  console.log(
    `@${user.username} tem agora o papel ${role}${languageId ? ` (${languageId})` : ""}.`,
  );
}

main()
  .catch((e: unknown) => {
    console.error(e instanceof Error ? e.message : e);
    process.exitCode = 1;
  })
  .finally(() => void prisma.$disconnect());
