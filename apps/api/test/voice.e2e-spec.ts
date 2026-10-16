import "dotenv/config";
import { randomUUID } from "node:crypto";
import { rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { HttpException, type INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import request from "supertest";
import type { App } from "supertest/types.js";
import { AppModule } from "../src/app.module.js";
import { configureApp } from "../src/configure-app.js";
import { loadEnv } from "../src/config/env.js";
import { PrismaService } from "../src/database/prisma.service.js";
import type { AuthUser } from "../src/users/users.service.js";
import { VoiceAdminService } from "../src/voice/voice-admin.service.js";
import { VoiceService } from "../src/voice/voice.service.js";

/** Contra a base de dados real (Neon); ignorado sem DATABASE_URL (CI). */
const dbUrl = process.env["DATABASE_URL"];
const LANG = "kabuverdianu";

describe.skipIf(!dbUrl)(
  "Faladores e Ouvintes — tarefas pagas (e2e, base de dados real)",
  { timeout: 90_000 },
  () => {
    let app: INestApplication<App>;
    let prisma: PrismaService;
    let voice: VoiceService;
    let admin: VoiceAdminService;
    const tag = randomUUID().slice(0, 8);
    const dir = join(tmpdir(), `fala-neto-audio-${tag}`);
    const ids: string[] = [];
    let boss: AuthUser;
    let speaker: AuthUser;
    let l1: AuthUser;
    let l2: AuthUser;
    let l3: AuthUser;
    let l4: AuthUser;
    let nobody: AuthUser;
    let wordId = "";
    let recordTask = "";
    const reviewTask: Record<string, string> = {};

    const makeUser = async (name: string, roles: AuthUser["roles"]): Promise<AuthUser> => {
      const u = await prisma.user.create({
        data: {
          email: `teste+voice-${name}-${tag}@lingua-stp.invalid`,
          username: `teste_voice_${name}_${tag}`,
          name: `Teste ${name}`,
          roles: { create: roles.map((r) => ({ role: r.role, languageId: r.languageId })) },
        },
      });
      ids.push(u.id);
      return { id: u.id, clerkId: "", roles };
    };
    const consent = (u: AuthUser, displayName: string | null = null) =>
      voice.saveProfile(u, {
        displayName,
        region: "Santiago",
        adultConfirmed: true,
        consentAccepted: true,
      });
    const fail = (p: Promise<unknown>) =>
      p.then(
        () => null,
        (e: HttpException) => ({
          status: e.getStatus(),
          body: e.getResponse() as { code?: string },
        }),
      );
    const task = (who: AuthUser, kind: "RECORD" | "REVIEW", target: number, rateCents: number) =>
      admin.createTask(boss, {
        kind,
        assigneeId: who.id,
        languageId: LANG,
        title: `Teste ${kind} ${tag}`,
        notes: null,
        target,
        rateCents,
        unitId: null,
        dueAt: null,
      });
    // "Áudio" falso: o servidor não descodifica, só valida formato, duração e tamanho.
    const fakeAudio = Buffer.alloc(2_000, 7).toString("base64");

    beforeAll(async () => {
      const env = loadEnv({ NODE_ENV: "test", DATABASE_URL: dbUrl, AUDIO_STORAGE_DIR: dir });
      const moduleRef = await Test.createTestingModule({
        imports: [AppModule.register(env)],
      }).compile();
      app = moduleRef.createNestApplication();
      configureApp(app, env);
      await app.init();
      prisma = app.get(PrismaService);
      voice = app.get(VoiceService);
      admin = app.get(VoiceAdminService);
      boss = await makeUser("boss", [{ role: "ADMIN", languageId: null }]);
      speaker = await makeUser("speaker", [{ role: "VOICE_SPEAKER", languageId: LANG }]);
      l1 = await makeUser("l1", [{ role: "VOICE_LISTENER", languageId: LANG }]);
      l2 = await makeUser("l2", [{ role: "VOICE_LISTENER", languageId: null }]);
      l3 = await makeUser("l3", [{ role: "VOICE_LISTENER", languageId: LANG }]);
      l4 = await makeUser("l4", [{ role: "VOICE_LISTENER", languageId: LANG }]);
      nobody = await makeUser("nobody", []);
      // Palavra só deste teste (nunca mexe nas palavras reais).
      const w = await prisma.vocabulary.create({
        data: {
          languageId: LANG,
          word: `teste-voz-${tag}`,
          status: "DRAFT",
          createdById: speaker.id,
          translations: { create: { locale: "pt", text: `teste ${tag}` } },
        },
      });
      wordId = w.id;
    });

    afterAll(async () => {
      const recs = await prisma.recording.findMany({
        where: { speakerId: { in: ids } },
        select: { audioId: true },
      });
      await prisma.voicePayout.deleteMany({ where: { userId: { in: ids } } });
      await prisma.recording.deleteMany({ where: { speakerId: { in: ids } } });
      await prisma.voiceTask.deleteMany({ where: { assigneeId: { in: ids } } });
      await prisma.vocabulary.deleteMany({ where: { id: wordId } });
      await prisma.audioAsset.deleteMany({
        where: { id: { in: recs.flatMap((r) => (r.audioId ? [r.audioId] : [])) } },
      });
      await prisma.adminAuditLog.deleteMany({ where: { actorId: { in: ids } } });
      await prisma.voiceContributor.deleteMany({ where: { userId: { in: ids } } });
      await prisma.userRole.deleteMany({ where: { userId: { in: ids } } });
      await prisma.user.deleteMany({ where: { id: { in: ids } } });
      await app.close();
      await rm(dir, { recursive: true, force: true });
    });

    it("tarefas só para quem tem o papel; sem consentimento (18+) não trabalha", async () => {
      expect(await fail(task(nobody, "RECORD", 5, 10))).toMatchObject({
        status: 400,
        body: { code: "MISSING_ROLE" },
      });
      expect(await fail(task(speaker, "REVIEW", 5, 10))).toMatchObject({
        body: { code: "MISSING_ROLE" },
      });
      recordTask = (await task(speaker, "RECORD", 1, 10)).id;
      expect(await fail(voice.wordsToRecord(speaker, recordTask, "pt"))).toMatchObject({
        status: 403,
        body: { code: "CONSENT_REQUIRED" },
      });
      expect(
        await fail(
          voice.saveProfile(speaker, {
            displayName: null,
            region: null,
            adultConfirmed: false,
            consentAccepted: true,
          }),
        ),
      ).toMatchObject({ status: 400 });
      await consent(speaker, "Voz de teste");
      for (const u of [l1, l2, l3, l4]) await consent(u);
      for (const u of [l1, l2, l3, l4]) reviewTask[u.id] = (await task(u, "REVIEW", 5, 2)).id;
      // Ninguém trabalha na tarefa de outra pessoa.
      expect(await fail(voice.wordsToRecord(l1, recordTask, "pt"))).toMatchObject({
        status: 404,
      });
    });

    it("gravar: valida formato e duração, e nunca passa do pedido na tarefa", async () => {
      const words = await voice.wordsToRecord(speaker, recordTask, "pt");
      expect(words.length).toBe(1); // a tarefa pede 1
      const base = { taskId: recordTask, vocabularyId: wordId, data: fakeAudio };
      expect(
        await fail(voice.record(speaker, { ...base, mimeType: "video/mp4", durationMs: 1200 })),
      ).toMatchObject({ body: { code: "BAD_FORMAT" } });
      expect(
        await fail(voice.record(speaker, { ...base, mimeType: "audio/webm", durationMs: 100 })),
      ).toMatchObject({ body: { code: "BAD_DURATION" } });
      const rec = await voice.record(speaker, {
        ...base,
        mimeType: "audio/webm;codecs=opus",
        durationMs: 1200,
      });
      expect(rec.status).toBe("PENDING");
      expect(
        await fail(voice.record(speaker, { ...base, mimeType: "audio/webm", durationMs: 1200 })),
      ).toMatchObject({ status: 409, body: { code: "TASK_FULL" } });
      expect(await voice.wordsToRecord(speaker, recordTask, "pt")).toEqual([]);
      const [t] = await voice.myTasks(speaker);
      expect(t).toMatchObject({ progress: { pending: 1, remaining: 0 }, pendingCents: 10 });
    });

    it("ouvir: nunca a própria; 2 votos iguais aprovam, a palavra ganha som e a tarefa fecha", async () => {
      const rec = await prisma.recording.findFirstOrThrow({ where: { vocabularyId: wordId } });
      const seen = await voice.audio(l1, rec.id);
      expect(seen.mime).toBe("audio/webm");
      expect(seen.data.length).toBe(2_000);

      const vote = (u: AuthUser, verdict: "APPROVE" | "REJECT", reason: string | null = null) =>
        voice.review(u, rec.id, { taskId: reviewTask[u.id]!, verdict, reason });
      await vote(l1, "APPROVE");
      expect(await fail(vote(l1, "APPROVE"))).toMatchObject({ status: 409 });
      await vote(l2, "REJECT", "NOISE");
      expect((await prisma.recording.findUniqueOrThrow({ where: { id: rec.id } })).status).toBe(
        "PENDING",
      ); // 1–1: espera pelo terceiro
      await vote(l3, "APPROVE");

      const done = await prisma.recording.findUniqueOrThrow({
        where: { id: rec.id },
        include: { audio: true, vocabulary: { select: { audioId: true } } },
      });
      expect(done).toMatchObject({ status: "APPROVED", approvals: 2, rejections: 1 });
      expect(done.audio).toMatchObject({ status: "APPROVED", speakerName: "Voz de teste" });
      expect(done.vocabulary.audioId).toBe(done.audioId);
      // A tarefa do falador ficou paga por inteiro: concluída.
      expect((await prisma.voiceTask.findUniqueOrThrow({ where: { id: recordTask } })).status).toBe(
        "COMPLETED",
      );

      const res = await request(app.getHttpServer()).get(`/api/v1/media/audio/${rec.storageKey}`);
      expect(res.status).toBe(200);
      expect(res.headers["cross-origin-resource-policy"]).toBe("cross-origin");
    });

    it("controlos não decidem nem pagam; ganhos, pagamento e saldo batem certo", async () => {
      const rec = await prisma.recording.findFirstOrThrow({ where: { vocabularyId: wordId } });
      await voice.review(l4, rec.id, {
        taskId: reviewTask[l4.id]!,
        verdict: "REJECT",
        reason: "PRONUNCIATION",
      });
      const control = await prisma.recordingReview.findUniqueOrThrow({
        where: { recordingId_listenerId: { recordingId: rec.id, listenerId: l4.id } },
      });
      expect(control).toMatchObject({ isControl: true, matched: false });
      expect((await voice.earnings(l4)).earnedCents).toBe(0);
      expect((await voice.earnings(l1)).earnedCents).toBe(2);

      const before = await voice.earnings(speaker);
      expect(before).toMatchObject({ earnedCents: 10, pendingCents: 0, balanceCents: 10 });
      await admin.createPayout(boss, {
        userId: speaker.id,
        amountCents: 10,
        method: "SEPA",
        reference: `TESTE-${tag}`,
        note: null,
      });
      const after = await voice.earnings(speaker);
      expect(after).toMatchObject({ paidCents: 10, balanceCents: 0 });
      expect(after.payouts[0]).toMatchObject({ amountCents: 10, method: "SEPA" });

      const people = await admin.people();
      expect(people.find((p) => p.userId === speaker.id)).toMatchObject({
        approved: 1,
        approvalRate: 1,
        balanceCents: 0,
      });
      expect(people.find((p) => p.userId === l4.id)).toMatchObject({
        controls: 1,
        controlAccuracy: 0,
      });

      const now = Date.now();
      const report = await admin.report(new Date(now - 86_400_000), new Date(now + 86_400_000));
      expect(report.people.find((p) => p.userId === speaker.id)).toMatchObject({
        approved: 1,
        earnedCents: 10,
      });

      const mine = await voice.myRecordings(speaker, "pt", undefined);
      expect(mine[0]).toMatchObject({ status: "APPROVED", rejectReasons: ["NOISE"] });
    });

    it("pausar a pessoa ou a tarefa corta o trabalho novo", async () => {
      const t2 = (await task(speaker, "RECORD", 3, 10)).id;
      await admin.setPaused(boss, speaker.id, true);
      expect(await fail(voice.wordsToRecord(speaker, t2, "pt"))).toMatchObject({
        body: { code: "PAUSED" },
      });
      await admin.setPaused(boss, speaker.id, false);
      await admin.updateTask(boss, t2, { status: "PAUSED" });
      expect(await fail(voice.wordsToRecord(speaker, t2, "pt"))).toMatchObject({
        body: { code: "TASK_NOT_ACTIVE" },
      });
    });

    it("pendentes e rejeitadas nunca são públicas", async () => {
      const res = await request(app.getHttpServer()).get(
        `/api/v1/media/audio/rec_${randomUUID()}.webm`,
      );
      expect(res.status).toBe(404);
    });
  },
);
