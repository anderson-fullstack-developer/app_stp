/**
 * Cliente da Arena: o estado segue só o que o servidor envia e as ações mandam
 * intenções certas (ligação Socket.IO simulada; sem servidor nem Clerk reais).
 */
import { act, renderHook } from "@testing-library/react";

type Handler = (payload: unknown) => void;
const handlers = new Map<string, Handler>();
const sent: { event: string; body: unknown }[] = [];
const replies = new Map<string, unknown>();

const fakeSocket = {
  on: (event: string, h: Handler) => {
    handlers.set(event, h);
    return fakeSocket;
  },
  timeout: () => ({
    emitWithAck: async (event: string, body: unknown) => {
      sent.push({ event, body });
      return replies.get(event) ?? { ok: true };
    },
  }),
};

vi.mock("socket.io-client", () => ({ io: vi.fn(() => fakeSocket) }));
vi.mock("@clerk/tanstack-react-start", () => ({
  useAuth: () => ({ getToken: async () => "token", isSignedIn: true }),
}));

const fire = (event: string, payload: unknown) => act(() => handlers.get(event)?.(payload));

describe("Cliente da Arena (web)", () => {
  it("segue os eventos do servidor e envia só intenções", async () => {
    const { arena, useArena } = await import("@/lib/multiplayer/arena-client");
    const { result } = renderHook(() => useArena(true));
    expect(result.current.status).toBe("connecting");

    fire("arena:ready", { userId: "eu", inRoom: false });
    expect(result.current).toMatchObject({ status: "ready", me: "eu" });

    // Duelo: o servidor devolve a sala criada.
    const room = {
      code: "ABC234",
      hostId: "eu",
      status: "WAITING",
      mode: "duel",
      config: { players: 2, lives: 1, seconds: 10 },
      languageId: "kabuverdianu",
      locale: "pt",
      members: [],
    };
    replies.set("duel:challenge", { ok: true, room });
    await act(async () => {
      await arena.challenge("amigo");
    });
    expect(sent.at(-1)).toEqual({ event: "duel:challenge", body: { userId: "amigo" } });
    expect(result.current.room?.mode).toBe("duel");

    // O relógio do servidor está 5 s adiantado: os prazos passam para o relógio local.
    const serverNow = Date.now() + 5_000;
    fire("match:countdown", { matchId: "m1", startsAt: serverNow + 3_000, serverNow });
    const countdownIn = result.current.match!.countdownAt! - Date.now();
    expect(countdownIn).toBeGreaterThan(2_500);
    expect(countdownIn).toBeLessThanOrEqual(3_100);

    const question = {
      questionId: "m1:1",
      exerciseId: "e1",
      mode: "meaning",
      prompt: "kasa",
      partOfSpeech: "NOUN",
      options: [
        { id: "o1", label: "casa" },
        { id: "o2", label: "cão" },
      ],
    };
    fire("match:question", {
      matchId: "m1",
      round: 1,
      question,
      deadlineAt: serverNow + 10_000,
      serverNow,
    });
    expect(result.current.match).toMatchObject({ phase: "question", round: 1, selected: null });
    expect(result.current.match!.question).not.toHaveProperty("correctOptionId");

    replies.set("match:answer", { accepted: true });
    await act(async () => {
      expect(await arena.answer("o1")).toEqual({ accepted: true });
    });
    expect(sent.at(-1)).toEqual({
      event: "match:answer",
      body: { questionId: "m1:1", optionId: "o1" },
    });
    expect(result.current.match!.selected).toBe("o1");
    // Segunda resposta na mesma ronda: nem chega a ser enviada.
    const before = sent.length;
    await act(async () => {
      expect(await arena.answer("o2")).toMatchObject({ accepted: false, reason: "duplicate" });
    });
    expect(sent.length).toBe(before);

    const players = [
      {
        userId: "eu",
        lives: 1,
        correct: 1,
        wrong: 0,
        timeouts: 0,
        placement: null,
        eliminated: false,
        left: false,
        score: 140,
      },
      {
        userId: "amigo",
        lives: 1,
        correct: 0,
        wrong: 1,
        timeouts: 0,
        placement: null,
        eliminated: false,
        left: false,
        score: 0,
      },
    ];
    fire("match:reveal", {
      matchId: "m1",
      round: 1,
      questionId: "m1:1",
      correctOptionId: "o1",
      outcomes: { eu: "correct", amigo: "wrong" },
      players,
      summary: {
        round: 1,
        correct: 1,
        wrong: 1,
        noAnswer: 0,
        eliminated: [],
        alive: 2,
        voided: false,
      },
    });
    expect(result.current.match).toMatchObject({ phase: "reveal", deadlineAt: null });
    expect(result.current.match!.players[0]!.score).toBe(140);

    fire("match:finished", { matchId: "m1", standings: [], rewarded: true, rounds: 10 });
    fire("match:reward", { matchId: "m1", xp: 120, coins: 20, reason: "ok" });
    expect(result.current.finished?.rounds).toBe(10);
    expect(result.current.reward).toMatchObject({ xp: 120, reason: "ok" });

    // Convite recebido em tempo real.
    fire("arena:invite", {
      code: "XYZ789",
      mode: "duel",
      from: { userId: "outro", username: "o", name: "Outro", avatarColor: null },
      at: Date.now(),
      expiresAt: Date.now() + 600_000,
    });
    expect(result.current.invite?.mode).toBe("duel");
    act(() => arena.dismissInvite());
    expect(result.current.invite).toBeNull();
  });
});
