/** In-memory hand-off between multiplayer screens (lobby → match → results). */
import type { LobbyMember, MatchConfig, MatchResult } from "@/types/multiplayer";

export interface PendingMatch {
  source: "private";
  config: MatchConfig;
  members: LobbyMember[];
}

let pending: PendingMatch | null = null;
let lastResult: MatchResult | null = null;

export const session = {
  setPending(p: PendingMatch | null) { pending = p; },
  peekPending() { return pending; },
  setResult(r: MatchResult) { lastResult = r; },
  getResult() { return lastResult; },
};
