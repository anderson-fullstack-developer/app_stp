/**
 * Multiplayer service (mock). Signatures mirror the future Socket.IO + Redis API:
 * callbacks stand in for socket events; return values stand in for acks.
 */
import { MULTIPLAYER_CONFIG } from "@stp/config";
import { currentUser, friends } from "@/mocks";
import { buildQuestionPool, MOCK_OPPONENTS } from "@/mocks";
import type { JoinRoomResult, LobbyMember, MatchConfig, MatchPlayerSeed, PrivateRoom, RoomMode } from "@stp/types/multiplayer";
import type { AnswerAck, GameStateSnapshot, RealtimeGameService } from "@stp/types/game-contract";
// NOTE: in mock mode lives/score/winner are simulated locally by packages/game-engine
// as a stand-in for the server. In production that engine runs server-side only.

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

export const mePlayer = (): MatchPlayerSeed => ({ id: currentUser.id, name: currentUser.name, color: currentUser.avatarColor, isMe: true });

/** Simulated opponent pool (bots). Future: real players come from the matchmaking socket. */
export const listOpponents = (): MatchPlayerSeed[] => MOCK_OPPONENTS;
/** Bot skill 0..1 used only by the mock simulation; real matches resolve answers server-side. */
export const opponentSkill = (id: string) => MOCK_OPPONENTS.find((o) => o.id === id)?.skill ?? 0.65;
/** Friends that can be invited to a private room. Future: GET /friends?status=friend */
export const listInvitableFriends = () => friends.filter((f) => f.status === "friend");

export const multiplayerService = {
  getQuestions: (count = 40) => buildQuestionPool(count),
  getRewards: async () => MULTIPLAYER_CONFIG.survivalRewards,

  /** Emits players as they join; resolves via onFull. Returns a cancel function. */
  findMatch(size: number, on: { onPlayer: (p: MatchPlayerSeed) => void; onFull: () => void }) {
    const queue = [mePlayer(), ...MOCK_OPPONENTS.slice(0, size - 1)];
    let i = 0;
    let timer: ReturnType<typeof setTimeout>;
    const step = () => {
      on.onPlayer(queue[i++]!);
      if (i >= queue.length) { on.onFull(); return; }
      timer = setTimeout(step, 350 + Math.random() * 650);
    };
    timer = setTimeout(step, 300);
    return () => clearTimeout(timer);
  },
  cancelMatch: async () => { await wait(100); return true; },

  async createPrivateRoom(mode: RoomMode, config: MatchConfig): Promise<PrivateRoom> {
    await wait(300);
    const code = `STP${Math.floor(100 + Math.random() * 900)}`;
    return { code, mode, config, members: [{ id: currentUser.id, name: currentUser.name, color: currentUser.avatarColor, isHost: true, isMe: true, ready: true }] };
  },

  /** Mock rules: STP999 = cheia, STP111 = já começou, formato inválido = inválido. */
  async joinPrivateRoom(code: string): Promise<JoinRoomResult> {
    await wait(700);
    const c = code.toUpperCase();
    if (!/^STP\d{3}$/.test(c)) return { ok: false, reason: "invalid" };
    if (c === "STP999") return { ok: false, reason: "full" };
    if (c === "STP111") return { ok: false, reason: "started" };
    const host = MOCK_OPPONENTS[0]!;
    const second = MOCK_OPPONENTS[1]!;
    return {
      ok: true,
      room: {
        code: c, mode: "survival", config: { ...MULTIPLAYER_CONFIG.publicSurvival, players: 4 },
        members: [
          { id: host.id, name: host.name, color: host.color, isHost: true, ready: true },
          { id: second.id, name: second.name, color: second.color, ready: false },
          { id: currentUser.id, name: currentUser.name, color: currentUser.avatarColor, isMe: true, ready: false },
        ],
      },
    };
  },

  /** Simulates lobby events (players joining / getting ready). Returns unsubscribe. */
  watchLobby(room: PrivateRoom, onChange: (members: LobbyMember[]) => void) {
    let members = room.members;
    const extras = MOCK_OPPONENTS.filter((o) => !members.some((m) => m.id === o.id)).slice(0, Math.min(3, room.config.players - members.length));
    const timers: ReturnType<typeof setTimeout>[] = [];
    extras.forEach((o, i) => {
      timers.push(setTimeout(() => { members = [...members, { id: o.id, name: o.name, color: o.color, ready: false }]; onChange(members); }, 800 + i * 900));
      timers.push(setTimeout(() => { members = members.map((m) => (m.id === o.id ? { ...m, ready: true } : m)); onChange(members); }, 2000 + i * 1300));
    });
    timers.push(setTimeout(() => { members = members.map((m) => (m.isMe ? m : { ...m, ready: true })); onChange(members); }, 2600 + extras.length * 1300));
    return {
      invite: (friendId: string) => {
        const f = friends.find((x) => x.id === friendId);
        if (!f || members.length >= room.config.players || members.some((m) => m.id === f.id)) return;
        timers.push(setTimeout(() => { members = [...members, { id: f.id, name: f.name, color: f.avatarColor, ready: false }]; onChange(members); }, 900));
        timers.push(setTimeout(() => { members = members.map((m) => (m.id === f.id ? { ...m, ready: true } : m)); onChange(members); }, 2200));
      },
      setReady: (ready: boolean) => { members = members.map((m) => (m.isMe ? { ...m, ready } : m)); onChange(members); },
      stop: () => timers.forEach(clearTimeout),
    };
  },
  /** Contract names (RealtimeGameService). Future: socket emits room:create / room:join. */
  createRoom(mode: RoomMode, config: MatchConfig): Promise<PrivateRoom> { return this.createPrivateRoom(mode, config); },
  joinRoom(code: string): Promise<JoinRoomResult> { return this.joinPrivateRoom(code); },
  leaveRoom: async (_code: string) => true,
  /** Future: emit room:ready; server broadcasts updated members. */
  setReady: async (_code: string, _ready: boolean) => true,
  startGame: async (_code: string) => { await wait(200); return true; },
  /** Sends the choice only. Correctness, lives and score come back from the server. */
  submitAnswer: async (_matchId: string, _questionId: string, _optionIndex: number | null): Promise<AnswerAck> => ({ accepted: true }),
  /** Future: re-join socket and receive the authoritative snapshot. */
  reconnect: async (_matchId?: string): Promise<GameStateSnapshot | null> => null,
  /** Future: GET /api/v1/games/:id/state. Mock has no server state yet. */
  getGameState: async (_matchId: string): Promise<GameStateSnapshot | null> => null,
};

/** Compile-time check that the mock implements the realtime contract. */
export const realtimeGameService: RealtimeGameService = multiplayerService;
