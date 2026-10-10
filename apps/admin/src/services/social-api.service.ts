/** Amigos e rankings contra a API (tipos em @stp/types/api). */
import type {
  FriendsDto,
  RankingDto,
  RankingScopeDto,
  RelationshipDto,
  UserSearchDto,
} from "@stp/types/api";
import { http } from "./http";

export const socialApi = {
  search: (q: string) => http.getQ<UserSearchDto>("users", ["search"], { q }),
  friends: () => http.get<FriendsDto>("friends"),
  request: (userId: string) =>
    http.post<{ status: RelationshipDto; requestId: string | null }>("friends", ["requests"], {
      userId,
    }),
  accept: (requestId: string) => http.post("friends", ["requests", requestId, "accept"]),
  decline: (requestId: string) => http.post("friends", ["requests", requestId, "decline"]),
  remove: (userId: string) => http.del("friends", userId),
  block: (userId: string) => http.post("blocks", [userId]),
  ranking: (scope: RankingScopeDto) => http.getQ<RankingDto>("rankings", [], { scope }),
};

export const socialKeys = {
  friends: ["social", "friends"] as const,
  search: (q: string) => ["social", "search", q] as const,
  ranking: (scope: RankingScopeDto) => ["social", "ranking", scope] as const,
};
