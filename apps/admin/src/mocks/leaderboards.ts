import type { LeaderboardEntry, League } from "@/types";
import { friends } from "./friends";
import { currentUser, people } from "./users";

/** Ranking derived from the same demo people (friends + current user), sorted by XP. */
export const leaderboard: LeaderboardEntry[] = [
  { userId: currentUser.id, name: currentUser.name, avatarColor: currentUser.avatarColor, xp: currentUser.xp, isCurrentUser: true },
  ...friends.map((f) => ({ userId: f.id, name: f.name, avatarColor: f.avatarColor, xp: people.find((p) => p.id === f.id)!.xp })),
]
  .sort((a, b) => b.xp - a.xp)
  .map((e, i) => ({ ...e, rank: i + 1 }));

export const league: League = { tier: "Gold", endsIn: "2d 14h", promoteTop: 10, demoteBottom: 5 };
