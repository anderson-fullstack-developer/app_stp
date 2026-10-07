import { type ExecutionContext, HttpException } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import type { ClerkUserInput } from "../users/clerk-user.mapper.js";
import type { UsersService } from "../users/users.service.js";
import { ClerkAuthGuard } from "./clerk-auth.guard.js";
import type { ClerkService } from "./clerk.service.js";

type DbUser = {
  id: string;
  clerkId: string | null;
  status: string;
  roles: { role: string; languageId: string | null }[];
};

function setup(opts: { configured?: boolean; db?: DbUser[]; roles?: string[] } = {}) {
  const db = [...(opts.db ?? [])];
  const clerk = {
    configured: opts.configured ?? true,
    verifySession: async (t: string) => (t.startsWith("ok_") ? t.slice(3) : null),
    getUser: async (id: string): Promise<ClerkUserInput> => ({
      clerkId: id,
      email: `${id}@x.com`,
      firstName: null,
      lastName: null,
      username: null,
      unsafeMetadata: {},
    }),
  } as unknown as ClerkService;
  const users = {
    findAuthUser: async (clerkId: string) => db.find((u) => u.clerkId === clerkId) ?? null,
    upsertFromClerk: async (u: ClerkUserInput) => {
      db.push({
        id: "novo",
        clerkId: u.clerkId,
        status: "ACTIVE",
        roles: [{ role: "USER", languageId: null }],
      });
      return null;
    },
  } as unknown as UsersService;
  const reflector = new Reflector();
  reflector.getAllAndOverride = (() => opts.roles) as Reflector["getAllAndOverride"];
  return new ClerkAuthGuard(clerk, users, reflector);
}

function ctx(authorization?: string) {
  const req: { headers: Record<string, string>; user?: unknown } = {
    headers: authorization ? { authorization } : {},
  };
  const context = {
    switchToHttp: () => ({ getRequest: () => req }),
    getHandler: () => undefined,
    getClass: () => undefined,
  } as unknown as ExecutionContext;
  return { req, context };
}

async function status(guard: ClerkAuthGuard, authorization?: string) {
  try {
    await guard.canActivate(ctx(authorization).context);
    return 200;
  } catch (e) {
    return e instanceof HttpException ? e.getStatus() : 500;
  }
}

const admin: DbUser = {
  id: "a",
  clerkId: "user_admin",
  status: "ACTIVE",
  roles: [{ role: "ADMIN", languageId: null }],
};

describe("ClerkAuthGuard", () => {
  it("recusa pedidos sem sessão ou com sessão inválida (401)", async () => {
    const guard = setup();
    expect(await status(guard)).toBe(401);
    expect(await status(guard, "Basic abc")).toBe(401);
    expect(await status(guard, "Bearer invalido")).toBe(401);
  });

  it("responde 503 se o Clerk não estiver configurado", async () => {
    expect(await status(setup({ configured: false }), "Bearer ok_user_1")).toBe(503);
  });

  it("sincroniza na hora um utilizador que o webhook ainda não criou", async () => {
    const guard = setup();
    const { req, context } = ctx("Bearer ok_user_novo");
    expect(await guard.canActivate(context)).toBe(true);
    expect(req.user).toMatchObject({ id: "novo", clerkId: "user_novo" });
  });

  it("bloqueia contas suspensas ou eliminadas (403)", async () => {
    const guard = setup({ db: [{ ...admin, status: "SUSPENDED" }] });
    expect(await status(guard, "Bearer ok_user_admin")).toBe(403);
  });

  it("verifica papéis com @Roles; SUPER_ADMIN passa sempre", async () => {
    const user: DbUser = {
      ...admin,
      clerkId: "user_u",
      roles: [{ role: "USER", languageId: null }],
    };
    const superAdmin: DbUser = {
      ...admin,
      clerkId: "user_s",
      roles: [{ role: "SUPER_ADMIN", languageId: null }],
    };
    const guard = setup({ db: [admin, user, superAdmin], roles: ["ADMIN"] });
    expect(await status(guard, "Bearer ok_user_admin")).toBe(200);
    expect(await status(guard, "Bearer ok_user_u")).toBe(403);
    expect(await status(guard, "Bearer ok_user_s")).toBe(200);
  });
});
