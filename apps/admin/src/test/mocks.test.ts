import { describe, expect, it } from "vitest";
import { createSeed } from "@/mocks/admin";
import { currentUser, friends, leaderboard, MOCK_OPPONENTS, people, sampleRoom } from "@/mocks";

const ids = new Set([currentUser.id, ...people.map((p) => p.id)]);

describe("demo data has one source of players", () => {
  it("opponents, friends, rankings and rooms reuse the shared people", () => {
    for (const x of [...MOCK_OPPONENTS, ...friends, ...sampleRoom.players])
      expect(ids.has(x.id)).toBe(true);
    for (const e of leaderboard) expect(ids.has(e.userId)).toBe(true);
  });
  it("admin users use the same usernames", () => {
    const names = new Set([currentUser.username, ...people.map((p) => p.username)]);
    for (const u of createSeed().users) expect(names.has(u.username)).toBe(true);
  });
  it("person ids are unique", () => {
    expect(ids.size).toBe(people.length + 1);
  });
});
