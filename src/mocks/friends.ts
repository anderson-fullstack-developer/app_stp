import type { Friend } from "@/types";
import { people } from "./users";

/** Derived from `people` — only those with a social relation appear. */
export const friends: Friend[] = people
  .filter((p) => p.relation !== "none")
  .map(({ id, name, username, color, level, streak, weeklyXp, country, relation }) => ({
    id, name, username, avatarColor: color, level, streak, weeklyXp, country, status: relation as Friend["status"],
  }));
