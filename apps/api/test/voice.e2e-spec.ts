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
import { VoiceService } from "../src/voice/voice.service.js";

/** Contra a base de dados real (Neon); ignorado sem DATABASE_URL (CI). */
const dbUrl = process.env["DATABASE_URL"];
const LANG = "kabuverdianu";

describe.skipIf(!dbUrl)(
  "Faladores e Ouvintes (e2e, base de dados real)",
  { timeout: 60_000 },
  () => {
    let app: INestApplication<App>;
    let prisma: PrismaService;
    let voice: VoiceService;
    const tag = randomUUID().slice(0, 8);
    const dir = join(tmpdir(), `fala-neto-audio-${tag}`);
    const ids: string[] = [];
    let speaker: AuthUser;
    let l1: AuthUser;
    let l2: AuthUser;
    let l3: AuthUser;
    let outsider: AuthUser;
    let wordId = "";

    const makeUser = async (name: string, roles: AuthUser["roles"]): Promise<AuthUser> => {
      const u = await prisma.user.create({
        data: {
          email: `teste+voice-${name}-${tag}@lingua-stp.invalid`,
          username: `teste_voice_${name}_${tag}`,
          name: `Teste ${name}`,
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
      speaker = await makeUser("speaker", [{ role: "VOICE_SPEAKER", languageId: LANG }]);
      l1 = await makeUser("l1", [{ role: "VOICE_LISTENER", languageId: LANG }]);
      l2 = await makeUser("l2", [{ role: "VOICE_LISTENER", languageId: null }]);
      l3 = await makeUser("l3", [{ role: "VOICE_LISTENER", languageId: LANG }]);
      outsider = await makeUser("outsider", [{ role: "VOICE_LISTENER", languageId: "forro" }]);
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
      await prisma.recording.deleteMany({ where: { speakerId: { in: ids } } });
      await prisma.vocabulary.deleteMany({ where: { id: wordId } });
      await prisma.audioAsset.deleteMany({
        where: { id: { in: recs.flatMap((r) => (r.audioId ? [r.audioId] : [])) } },
      });
      await prisma.voiceContributor.deleteMany({ where: { userId: { in: ids } } });
      await prisma.user.deleteMany({ where: { id: { in: ids } } });
      await app.close();
      await rm(dir, { recursive: true, force: true });
    });

    it("sem consentimento (18+) não grava nem ouve", async () => {
      expect(await fail(voice.wordsToRecord(speaker, LANG, "pt"))).toMatchObject({
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
      const me = await consent(speaker, "Voz de teste");
      expect(me.profile).toMatchObject({ consentCurrent: true, region: "Santiago" });
      expect(me.speakerLanguages.map((l) => l.id)).toContain(LANG);
      for (const u of [l1, l2, l3, outsider]) await consent(u);
    });

    it("gravar: valida formato e duração, e não grava a mesma palavra duas vezes", async () => {
      const words = await voice.wordsToRecord(speaker, LANG, "pt");
      expect(words.length).toBeGreaterThan(0);
      const base = { vocabularyId: wordId, data: fakeAudio };
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
      ).toMatchObject({ status: 409, body: { code: "ALREADY_RECORDED" } });
      // Sai da fila de quem a gravou.
      const again = await voice.wordsToRecord(speaker, LANG, "pt");
      expect(again.some((w) => w.vocabularyId === wordId)).toBe(false);
    });

    it("ouvir: nunca a própria, nem de outra língua; 2 votos iguais aprovam e a palavra ganha som", async () => {
      const rec = await prisma.recording.findFirstOrThrow({ where: { vocabularyId: wordId } });
      expect(
        await fail(voice.review(speaker, rec.id, { verdict: "APPROVE", reason: null })),
      ).toMatchObject({
        status: 403,
      });
      expect(
        await fail(voice.review(outsider, rec.id, { verdict: "APPROVE", reason: null })),
      ).toMatchObject({
        status: 403,
      });
      // O ouvinte recebe-a sem saber quem gravou.
      const seen = await voice.audio(l1, rec.id);
      expect(seen.mime).toBe("audio/webm");
      expect(seen.data.length).toBe(2_000);

      await voice.review(l1, rec.id, { verdict: "APPROVE", reason: null });
      expect(
        await fail(voice.review(l1, rec.id, { verdict: "APPROVE", reason: null })),
      ).toMatchObject({
        status: 409,
      });
      await voice.review(l2, rec.id, { verdict: "REJECT", reason: "NOISE" });
      expect((await prisma.recording.findUniqueOrThrow({ where: { id: rec.id } })).status).toBe(
        "PENDING",
      ); // 1–1: espera pelo terceiro
      await voice.review(l3, rec.id, { verdict: "APPROVE", reason: null });

      const done = await prisma.recording.findUniqueOrThrow({
        where: { id: rec.id },
        include: { audio: true, vocabulary: { select: { audioId: true } } },
      });
      expect(done).toMatchObject({ status: "APPROVED", approvals: 2, rejections: 1 });
      expect(done.audio).toMatchObject({
        status: "APPROVED",
        speakerName: "Voz de teste",
        region: "Santiago",
        consentRecorded: true,
      });
      expect(done.vocabulary.audioId).toBe(done.audioId);

      // Aprovada: pública (a app toca-a sem sessão), com CORP para o site noutro domínio.
      const res = await request(app.getHttpServer()).get(`/api/v1/media/audio/${rec.storageKey}`);
      expect(res.status).toBe(200);
      expect(res.headers["cross-origin-resource-policy"]).toBe("cross-origin");
    });

    it("perguntas de controlo não decidem; relatório conta só votos reais", async () => {
      const rec = await prisma.recording.findFirstOrThrow({ where: { vocabularyId: wordId } });
      const extra = await makeUser("l4", [{ role: "VOICE_LISTENER", languageId: LANG }]);
      await consent(extra);
      await voice.review(extra, rec.id, { verdict: "REJECT", reason: "PRONUNCIATION" });
      const control = await prisma.recordingReview.findUniqueOrThrow({
        where: { recordingId_listenerId: { recordingId: rec.id, listenerId: extra.id } },
      });
      expect(control).toMatchObject({ isControl: true, matched: false });
      expect((await prisma.recording.findUniqueOrThrow({ where: { id: rec.id } })).status).toBe(
        "APPROVED",
      );

      const today = new Date();
      const tomorrow = new Date(today.getTime() + 86_400_000);
      const report = await voice.report(new Date(today.getTime() - 86_400_000), tomorrow);
      const row = (id: string) => report.people.find((p) => p.userId === id);
      expect(row(speaker.id)).toMatchObject({ recorded: 1, approved: 1 });
      expect(row(l1.id)).toMatchObject({ reviews: 1, controls: 0 });
      expect(row(extra.id)).toMatchObject({ reviews: 0, controls: 1, controlsMatched: 0 });

      // Painel do falador: estado, motivos reais (o controlo não conta) e o próprio áudio.
      const mine = await voice.myRecordings(speaker, "pt", undefined);
      expect(mine[0]).toMatchObject({ status: "APPROVED", rejectReasons: ["NOISE"] });
      expect((await voice.audio(speaker, rec.id)).data.length).toBe(2_000);
      const me = await voice.me(speaker);
      expect(me.speaker).toMatchObject({ total: 1, approved: 1, pending: 0, rejected: 0 });
    });

    it("pendentes e rejeitadas nunca são públicas", async () => {
      const res = await request(app.getHttpServer()).get(
        `/api/v1/media/audio/rec_${randomUUID()}.webm`,
      );
      expect(res.status).toBe(404);
    });
  },
);
