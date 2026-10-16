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
import { localDate } from "../src/progress/rules/local-date.js";

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
          matchmakingWaitMs: 300,
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

    // Cada teste começa limpo: ninguém fica preso numa sala ou partida do teste anterior.
    afterEach(async () => {
      await Promise.all(
        sockets
          .filter((s) => s.connected)
          .map((s) =>
            s
              .timeout(5_000)
              .emitWithAck("room:leave", {})
              .catch(() => null),
          ),
      );
      sockets.splice(0).forEach((s) => s.disconnect());
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
      s.timeout(20_000).emitWithAck(event, body ?? {}) as Promise<Payload>;
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

    it("duelo 1 contra 1: desafio a amigos, arranque automático, pontos e prémios", async () => {
      const a = await connect(ids["ana"]!);
      const b = await connect(ids["bia"]!);
      expect(await ack(a, "duel:challenge", { userId: ids["caio"] })).toMatchObject({
        ok: false,
        code: "NOT_FRIENDS",
      });
      // A Bia já fez 3 duelos premiados hoje: joga, mas não recebe.
      const bia = await prisma.user.findUniqueOrThrow({ where: { id: ids["bia"]! } });
      const today = new Date(`${localDate(new Date(), bia.timezone)}T00:00:00Z`);
      for (let i = 0; i < 3; i++) {
        await prisma.xpEvent.create({
          data: {
            userId: ids["bia"]!,
            amount: 1,
            reason: "ARENA_PLACE",
            sourceType: "arena_duel",
            sourceId: `teste-${tag}-${i}`,
            localDate: today,
          },
        });
      }

      const invited = next(b, "arena:invite");
      const challenged = await ack(a, "duel:challenge", { userId: ids["bia"] });
      expect(challenged).toMatchObject({
        ok: true,
        room: { mode: "duel", config: { players: 2 } },
      });
      const invite = await invited;
      expect(invite).toMatchObject({ mode: "duel", from: { userId: ids["ana"] } });

      // A Ana responde sempre certo; a Bia sempre errado.
      const answer = (s: Socket, right: boolean) => (p: Payload) => {
        const correct = correctOption(invite["code"]);
        const opts = p["question"].options as { id: string }[];
        const optionId = right ? correct : opts.find((o) => o.id !== correct)!.id;
        void ack(s, "match:answer", { questionId: p["question"].questionId, optionId });
      };
      a.on("match:question", answer(a, true));
      b.on("match:question", answer(b, false));
      const finished = next(a, "match:finished");
      const rewardA = next(a, "match:reward");
      const rewardB = next(b, "match:reward");
      expect(await ack(b, "room:join", { code: invite["code"] })).toMatchObject({ ok: true });

      const result = await finished;
      expect(result["rounds"]).toBe(10);
      const [first, second] = result["standings"] as Payload[];
      expect(first).toMatchObject({ userId: ids["ana"], place: 1, correct: 10 });
      expect(first!["score"]).toBeGreaterThanOrEqual(1000);
      expect(second).toMatchObject({ userId: ids["bia"], place: 2, score: 0, wrong: 10 });
      expect(await rewardA).toMatchObject({ xp: 120, coins: 20, reason: "ok" });
      expect(await rewardB).toMatchObject({ xp: 0, reason: "duel_limit" });
      const saved = await prisma.arenaMatch.findFirstOrThrow({
        where: { roomCode: invite["code"], mode: "duel" },
      });
      expect(saved).toMatchObject({ status: "FINISHED", rounds: 10, rewarded: true });
      const win = await prisma.xpEvent.findFirstOrThrow({
        where: { userId: ids["ana"]!, sourceType: "arena_duel", sourceId: saved.id },
      });
      expect(win).toMatchObject({ reason: "DUEL_WIN", amount: 120 });
      a.off("match:question");
      b.off("match:question");
      await ack(a, "room:leave");
      await ack(b, "room:leave");
    });

    it("duelo: quem sai a meio perde e o outro ganha logo", async () => {
      const a = await connect(ids["ana"]!);
      const b = await connect(ids["bia"]!);
      const invited = next(b, "arena:invite");
      await ack(a, "duel:challenge", { userId: ids["bia"] });
      const { code } = await invited;
      const q = next(b, "match:question");
      await ack(b, "room:join", { code });
      await q;
      const finished = next(a, "match:finished");
      await ack(b, "room:leave");
      const result = await finished;
      expect(result["standings"][0]).toMatchObject({ userId: ids["ana"], place: 1 });
      expect(result["standings"][1]).toMatchObject({ userId: ids["bia"], left: true });
      await ack(a, "room:leave");
    });

    it("2 contra 2: equipas, 8 perguntas, soma por equipa e prémios", async () => {
      const [a, b, cc, d] = await Promise.all(
        ["ana", "bia", "caio", "duda"].map((n) => connect(ids[n]!)),
      );
      const created = await ack(a!, "room:create", { mode: "teams" });
      expect(created).toMatchObject({ ok: true, room: { mode: "teams", config: { players: 4 } } });
      const code = created["room"].code as string;
      for (const s of [b, cc, d]) await ack(s!, "room:join", { code });
      // Entram alternando entre as equipas: A, B, A, B.
      const roomNow = (arena as unknown as { rooms: Map<string, Payload> }).rooms.get(code)!;
      const teamOf = (n: string) => roomNow["members"].get(ids[n])?.team;
      expect(["ana", "bia", "caio", "duda"].map(teamOf)).toEqual(["A", "B", "A", "B"]);
      expect(await ack(d!, "room:team", { team: "A" })).toMatchObject({
        ok: false,
        code: "TEAM_FULL",
      });
      expect(await ack(a!, "room:start")).toMatchObject({ ok: false, code: "NOT_READY" });
      for (const s of [b, cc, d]) await ack(s!, "room:ready", { ready: true });

      // Equipa A (Ana e Caio) acerta sempre; equipa B (Bia e Duda) erra sempre.
      const answer = (s: Socket, right: boolean) => (p: Payload) => {
        const correct = correctOption(code);
        const opts = p["question"].options as { id: string }[];
        const optionId = right ? correct : opts.find((o) => o.id !== correct)!.id;
        void ack(s, "match:answer", { questionId: p["question"].questionId, optionId });
      };
      a!.on("match:question", answer(a!, true));
      cc!.on("match:question", answer(cc!, true));
      b!.on("match:question", answer(b!, false));
      d!.on("match:question", answer(d!, false));
      const finished = next(a!, "match:finished");
      const rewardA = next(a!, "match:reward");
      const rewardB = next(b!, "match:reward");
      expect(await ack(a!, "room:start")).toMatchObject({ ok: true });

      const result = await finished;
      expect(result).toMatchObject({ rounds: 8, rewarded: true, winnerTeam: "A" });
      expect(result["teams"].A).toBeGreaterThanOrEqual(1600);
      expect(result["teams"].B).toBe(0);
      const places = Object.fromEntries(
        (result["standings"] as Payload[]).map((s) => [s["userId"], [s["team"], s["place"]]]),
      );
      expect(places[ids["caio"]!]).toEqual(["A", 1]);
      expect(places[ids["duda"]!]).toEqual(["B", 2]);
      expect(await rewardA).toMatchObject({ xp: 120, coins: 20, reason: "ok" });
      expect(await rewardB).toMatchObject({ xp: 40, coins: 5, reason: "ok" });
      const saved = await prisma.arenaMatch.findFirstOrThrow({ where: { roomCode: code } });
      expect(saved).toMatchObject({ mode: "teams", status: "FINISHED", rounds: 8 });
      for (const s of [a, b, cc, d]) {
        s!.off("match:question");
        await ack(s!, "room:leave");
      }
    });

    it("procurar partida (duelo): junta dois desconhecidos e começa sozinho", async () => {
      const a = await connect(ids["ana"]!);
      const b = await connect(ids["caio"]!); // não são amigos
      const first = await ack(a, "queue:join", { mode: "duel" });
      expect(first).toMatchObject({
        ok: true,
        room: { mode: "duel", isPublic: true, status: "WAITING" },
      });
      // Pedir outra vez não abre outra sala.
      expect((await ack(a, "queue:join", { mode: "duel" }))["room"].code).toBe(
        first["room"].code,
      );
      const started = next(a, "match:question");
      const second = await ack(b, "queue:join", { mode: "duel" });
      expect(second["room"].code).toBe(first["room"].code);
      expect((await started)["round"]).toBe(1);
      const finished = next(a, "match:finished");
      await ack(b, "room:leave");
      await finished;
      // A sala pública acaba com a partida: procurar outra vez abre uma nova.
      const again = await ack(a, "queue:join", { mode: "duel" });
      expect(again["room"].code).not.toBe(first["room"].code);
      await ack(a, "room:leave");
    });

    it("procurar partida (Sobrevivência): com 4 começa sozinha após a espera, sem 'pronto'", async () => {
      const players = await Promise.all(
        ["ana", "bia", "caio", "duda"].map((n) => connect(ids[n]!)),
      );
      const rooms: Payload[] = [];
      for (const s of players.slice(0, 3)) rooms.push(await ack(s, "queue:join", { mode: "survival" }));
      expect(new Set(rooms.map((r) => r["room"].code)).size).toBe(1);
      expect(rooms[2]!["room"]).toMatchObject({ isPublic: true, autoStartAt: null });
      expect(await ack(players[0]!, "room:start")).toMatchObject({ ok: false, code: "NOT_HOST" });

      // O 4.º jogador marca a hora de começar (o servidor avisa a sala).
      const timed = new Promise<Payload>((resolve) => {
        const on = (p: Payload) => {
          if (p["autoStartAt"] === null) return;
          players[0]!.off("room:state", on);
          resolve(p);
        };
        players[0]!.on("room:state", on);
      });
      const started = next(players[0]!, "match:countdown");
      await ack(players[3]!, "queue:join", { mode: "survival" });
      expect((await timed)["autoStartAt"]).toEqual(expect.any(Number));
      await started;
      // Os outros 3 saem; a Ana responde sempre certo até eles ficarem sem vidas.
      const finished = next(players[0]!, "match:finished");
      players[0]!.on("match:question", (p: Payload) => {
        void ack(players[0]!, "match:answer", {
          questionId: p["question"].questionId,
          optionId: correctOption(rooms[0]!["room"].code),
        });
      });
      for (const s of players.slice(1)) await ack(s, "room:leave");
      const result = await finished;
      players[0]!.off("match:question");
      expect(result["rewarded"]).toBe(true);
      expect(result["standings"][0]).toMatchObject({ userId: ids["ana"], place: 1 });
      await ack(players[0]!, "room:leave");
    });

    it("2 contra 2: se uma equipa sai toda, a outra ganha logo", async () => {
      const [a, b, cc, d] = await Promise.all(
        ["ana", "bia", "caio", "duda"].map((n) => connect(ids[n]!)),
      );
      const { room } = await ack(a!, "room:create", { mode: "teams" });
      for (const s of [b, cc, d]) await ack(s!, "room:join", { code: room.code });
      for (const s of [b, cc, d]) await ack(s!, "room:ready", { ready: true });
      const q = next(a!, "match:question");
      await ack(a!, "room:start");
      await q;
      const finished = next(a!, "match:finished");
      await ack(b!, "room:leave"); // equipa B
      await ack(d!, "room:leave"); // equipa B
      const result = await finished;
      expect(result["winnerTeam"]).toBe("A");
      expect(result["rounds"]).toBe(1);
      for (const s of [a, cc]) await ack(s!, "room:leave");
    });
  },
);
