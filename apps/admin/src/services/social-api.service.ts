/** Amigos, perfis, notificações e rankings contra a API (tipos em @stp/types/api). */
import type {
  FriendsDto,
  NotificationDto,
  PublicProfileDto,
  RankingDto,
  RankingScopeDto,
  RelationshipDto,
  UserSearchDto,
} from "@stp/types/api";
import { http } from "./http";

export const socialApi = {
  search: (q: string) => http.getQ<UserSearchDto>("users", ["search"], { q }),
  profile: (userId: string) => http.get<PublicProfileDto>("users", userId),
  notifications: () => http.get<NotificationDto[]>("me", "notifications"),
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
  profile: (id: string) => ["social", "profile", id] as const,
  notifications: ["social", "notifications"] as const,
  search: (q: string) => ["social", "search", q] as const,
  ranking: (scope: RankingScopeDto) => ["social", "ranking", scope] as const,
};
