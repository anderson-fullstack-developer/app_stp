import "dotenv/config";
import { randomUUID } from "node:crypto";
import type { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { io, type Socket } from "socket.io-client";
import { ArenaController } from "../src/arena/arena.controller.js";
import { ArenaAuthService } from "../src/arena/arena-auth.service.js";
import { NotificationsService } from "../src/social/notifications.service.js";
import { ARENA_TIMINGS, ArenaService } from "../src/arena/arena.service.js";
import { AppModule } from "../src/app.module.js";
import { configureApp } from "../src/configure-app.js";
import { loadEnv } from "../src/config/env.js";
import { PrismaService } from "../src/database/prisma.service.js";

/** Contra a base de dados real (Neon); ignorado sem DATABASE_URL (CI). */
const dbUrl = process.env["DATABASE_URL"];

type Payload = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

describe.skipIf(!dbUrl)(
  "Arena em tempo real (e2e, Socket.IO + base de dados real)",
  { timeout: 60_000 },
  () => {
    let app: INestApplication;
    let prisma: PrismaService;
    let arena: ArenaService;
    let url = "";
    const tag = randomUUID().slice(0, 8);
    const ids: Record<string, string> = {};
    const sockets: Socket[] = [];

    beforeAll(async () => {
      const env = loadEnv({ NODE_ENV: "test", DATABASE_URL: dbUrl });
      const moduleRef = await Test.createTestingModule({ imports: [AppModule.register(env)] })
        .overrideProvider(ARENA_TIMINGS)
        .useValue({
          countdownMs: 30,
          betweenRoundsMs: 30,
          finalMs: 30,
          lateGraceMs: 100,
          lobbyGraceMs: 200,
        })
        .compile();
      app = moduleRef.createNestApplication();
      configureApp(app, env);
      // Nos testes, o "token" é o id do utilizador (o Clerk real não entra aqui).
      const auth = app.get(ArenaAuthService);
      vi.spyOn(auth, "authenticate").mockImplementation((token) =>
        token ? auth.identity(token) : Promise.resolve(null),
      );
      await app.listen(0);
      const address = app.getHttpServer().address() as { port: number };
      url = `http://127.0.0.1:${address.port}/arena`;
      prisma = app.get(PrismaService);
      arena = app.get(ArenaService);
      for (const name of ["ana", "bia", "caio", "duda"]) {
        const u = await prisma.user.create({
          data: {
            clerkId: `user_arena_${name}_${tag}`,
            email: `teste+arena-${name}-${tag}@lingua-stp.invalid`,
            username: `teste_arena_${name}_${tag}`,
            name: `Teste ${name}`,
            learningLanguageId: "kabuverdianu",
            stats: { create: {} },
          },
        });
        ids[name] = u.id;
      }
    });

    afterAll(async () => {
      sockets.forEach((s) => s.disconnect());
      const users = Object.values(ids);
      await prisma.arenaMatch.deleteMany({ where: { hostId: { in: users } } });
      await prisma.user.deleteMany({ where: { id: { in: users } } });
      await app.close();
    });

    const connect = async (userId: string | null) => {
      const s = io(url, {
        auth: userId ? { token: userId } : {},
        transports: ["websocket"],
        forceNew: true,
      });
      sockets.push(s);
      await new Promise<void>((resolve) => {
        s.once("arena:ready", () => resolve());
        s.once("disconnect", () => resolve());
        s.once("connect_error", () => resolve());
      });
      return s;
    };
    const ack = (s: Socket, event: string, body?: unknown) =>
      s.timeout(5_000).emitWithAck(event, body ?? {}) as Promise<Payload>;
    const next = (s: Socket, event: string) =>
      new Promise<Payload>((resolve) => s.once(event, (p: Payload) => resolve(p)));
    /** Resposta certa da ronda atual (só o servidor a sabe; o teste espreita). */
    const correctOption = (code: string) => {
      const room = (arena as unknown as { rooms: Map<string, Payload> }).rooms.get(code)!;
      const m = room["match"];
      return m.questions[(m.round - 1) % m.questions.length].correctOptionId as string;
    };

    it("recusa ligações sem sessão", async () => {
      const s = await connect(null);
      expect(s.connected).toBe(false);
    });

    it("partida de 4: perguntas, respostas validadas no servidor, vencedor e recompensas", async () => {
      const [a, b, c, d] = await Promise.all(
        ["ana", "bia", "caio", "duda"].map((n) => connect(ids[n]!)),
      );
      const created = await ack(a!, "room:create", {
        config: { players: 4, lives: 1, seconds: 5 },
      });
      expect(created).toMatchObject({
        ok: true,
        room: { status: "WAITING", config: { players: 4, lives: 1, seconds: 5 } },
      });
      const code = created["room"].code as string;

      expect(await ack(b!, "room:join", { code: "ZZZZZZ" })).toMatchObject({
        ok: false,
        code: "ROOM_NOT_FOUND",
      });
      for (const s of [b, c, d])
        expect(await ack(s!, "room:join", { code })).toMatchObject({ ok: true });

      expect(await ack(a!, "room:start")).toMatchObject({ ok: false, code: "NOT_READY" });
      for (const s of [b, c, d]) await ack(s!, "room:ready", { ready: true });
      expect(await ack(b!, "room:start")).toMatchObject({ ok: false, code: "NOT_HOST" });

      const q1 = next(a!, "match:question");
      expect(await ack(a!, "room:start")).toMatchObject({ ok: true });
      const question = await q1;
      expect(question["round"]).toBe(1);
      expect(question["question"]).not.toHaveProperty("correctOptionId");
      const qid = question["question"].questionId as string;
      const right = correctOption(code);
      const wrong = (question["question"].options as { id: string }[]).find(
        (o) => o.id !== right,
      )!.id;

      const reveal1 = next(a!, "match:reveal");
      const final = next(a!, "match:final");
      expect(await ack(a!, "match:answer", { questionId: qid, optionId: right })).toEqual({
        accepted: true,
      });
      expect(await ack(a!, "match:answer", { questionId: qid, optionId: right })).toEqual({
        accepted: false,
        reason: "duplicate",
      });
      expect(await ack(b!, "match:answer", { questionId: qid, optionId: "não-existe" })).toEqual({
        accepted: false,
        reason: "invalid_option",
      });
      await ack(b!, "match:answer", { questionId: qid, optionId: wrong });
      await ack(c!, "match:answer", { questionId: qid, optionId: wrong });
      await ack(d!, "match:answer", { questionId: qid, optionId: right });
      const r1 = await reveal1; // todos responderam: a ronda fecha antes do prazo
      expect(r1["correctOptionId"]).toBe(right);
      expect(r1["outcomes"]).toEqual({
        [ids["ana"]!]: "correct",
        [ids["bia"]!]: "wrong",
        [ids["caio"]!]: "wrong",
        [ids["duda"]!]: "correct",
      });
      expect(r1["summary"]).toMatchObject({
        eliminated: expect.arrayContaining([ids["bia"], ids["caio"]]),
        alive: 2,
      });
      expect(await ack(b!, "match:answer", { questionId: qid, optionId: right })).toMatchObject({
        accepted: false,
      });
      expect((await final)["userIds"].sort()).toEqual([ids["ana"], ids["duda"]].sort());

      const q2 = await next(a!, "match:question");
      expect(
        await ack(b!, "match:answer", {
          questionId: q2["question"].questionId,
          optionId: correctOption(code),
        }),
      ).toEqual({ accepted: false, reason: "eliminated" });
      const finished = next(a!, "match:finished");
      const rewardA = next(a!, "match:reward");
      const rewardD = next(d!, "match:reward");
      const room = next(a!, "room:state");
      const right2 = correctOption(code);
      const wrong2 = (q2["question"].options as { id: string }[]).find((o) => o.id !== right2)!.id;
      await ack(a!, "match:answer", { questionId: q2["question"].questionId, optionId: right2 });
      await ack(d!, "match:answer", { questionId: q2["question"].questionId, optionId: wrong2 });

      const result = await finished;
      expect(result["rewarded"]).toBe(true);
      expect(
        result["standings"].map((s: Payload) => [s["userId"], s["place"]]).slice(0, 2),
      ).toEqual([
        [ids["ana"], 1],
        [ids["duda"], 2],
      ]);
      expect(await rewardA).toMatchObject({ xp: 250, coins: 50, reason: "ok" });
      expect(await rewardD).toMatchObject({ xp: 150, coins: 30, reason: "ok" });
      expect((await room)["status"]).toBe("WAITING"); // podem jogar outra vez

      const saved = await prisma.arenaMatch.findFirstOrThrow({
        where: { roomCode: code },
        include: { players: true },
      });
      expect(saved).toMatchObject({ status: "FINISHED", rewarded: true, rounds: 2 });
      expect(saved.players.find((p) => p.userId === ids["ana"])).toMatchObject({
        place: 1,
        correct: 2,
        xp: 250,
      });
      const stats = await prisma.userStats.findUniqueOrThrow({ where: { userId: ids["ana"]! } });
      expect(stats).toMatchObject({ xpTotal: 250, coins: 50 });
      for (const s of [a, b, c, d]) await ack(s!, "room:leave");
    });

    it("sala de 2: sem recompensa; quem sai a meio perde", async () => {
      const a = await connect(ids["ana"]!);
      const b = await connect(ids["bia"]!);
      const { room } = await ack(a, "room:create", {
        config: { players: 4, lives: 3, seconds: 5 },
      });
      await ack(b, "room:join", { code: room.code });
      await ack(b, "room:ready", { ready: true });
      const q = next(a, "match:question");
      await ack(a, "room:start");
      const question = await q;

      const finished = next(a, "match:finished");
      const rewardA = next(a, "match:reward");
      const rewardB = next(b, "match:reward");
      await ack(b, "room:leave"); // abandona
      // A responde certo em todas as rondas até a Bia (que saiu) ficar sem vidas.
      let qid = question["question"].questionId as string;
      a.on("match:question", (p: Payload) => {
        qid = p["question"].questionId;
        void ack(a, "match:answer", { questionId: qid, optionId: correctOption(room.code) });
      });
      await ack(a, "match:answer", { questionId: qid, optionId: correctOption(room.code) });

      const result = await finished;
      expect(result["rewarded"]).toBe(false);
      expect(result["standings"][0]).toMatchObject({ userId: ids["ana"], place: 1 });
      expect(result["standings"][1]).toMatchObject({ userId: ids["bia"], left: true });
      expect(await rewardA).toMatchObject({ xp: 0, reason: "private_small" });
      expect(await rewardB).toMatchObject({ xp: 0, reason: "left" });
      a.off("match:question");
      await ack(a, "room:leave");
    });

    it("convidar amigos (só amigos) e histórico de partidas", async () => {
      await prisma.friendship.create({
        data: {
          requesterId: ids["ana"]!,
          addresseeId: ids["bia"]!,
          status: "ACCEPTED",
          acceptedAt: new Date(),
        },
      });
      const a = await connect(ids["ana"]!);
      const b = await connect(ids["bia"]!);
      const { room } = await ack(a, "room:create", {
        config: { players: 4, lives: 1, seconds: 5 },
      });
      const got = next(b, "arena:invite");
      expect(await ack(a, "room:invite", { userId: ids["bia"] })).toEqual({ ok: true });
      const invite = await got;
      expect(invite).toMatchObject({ code: room.code, from: { userId: ids["ana"] } });
      expect(await ack(a, "room:invite", { userId: ids["caio"] })).toMatchObject({
        ok: false,
        code: "NOT_FRIENDS",
      });

      const asBia = { id: ids["bia"]!, clerkId: "", roles: [] };
      const notes = await app.get(NotificationsService).list(asBia);
      expect(notes[0]).toMatchObject({
        type: "arena_invite",
        code: room.code,
        user: { id: ids["ana"] },
      });

      await ack(b, "room:join", { code: room.code });
      // Já está na sala: o convite deixa de aparecer.
      const after = await app.get(NotificationsService).list(asBia);
      expect(after.some((n) => n.type === "arena_invite")).toBe(false);
      await ack(a, "room:leave");
      await ack(b, "room:leave");

      const history = await app
        .get(ArenaController)
        .matches({ id: ids["ana"]!, clerkId: "", roles: [] });
      expect(history.length).toBeGreaterThanOrEqual(2);
      expect(history.find((h) => h.players === 4)).toMatchObject({
        place: 1,
        xp: 250,
        rewarded: true,
      });
    });
  },
);
