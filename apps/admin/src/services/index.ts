import { adPolicy } from "@/config/ads";
import { multiplayerService } from "./game.service";
/**
 * Service layer — currently backed by mock data.
 * Replace each function body with http.* calls (./http.ts, endpoints in @/config/api); keep signatures.
 */
import * as mock from "@/mocks";
export { listInvitableFriends, listOpponents, opponentSkill, mePlayer } from "./game.service";
import type { Course, Friend, LeaderboardEntry, Lesson, User } from "@/types";

const delay = <T>(value: T, ms = 250) => new Promise<T>((r) => setTimeout(() => r(value), ms));

export { authService } from "./auth.service";
export type { AuthSession, SignInInput, SignUpInput } from "./auth.service";
export { imageService, audioService, AUDIO_PLACEHOLDER_URL } from "./media.service";
export type { MediaAsset, UploadResult } from "./media.service";
export { subscriptionService, PREMIUM_ENTITLEMENT_ID } from "./subscription.service";
export type { SubscriptionPackage, SubscriptionStatus } from "./subscription.service";

export const userService = {
  getMe: (): Promise<User> => delay(mock.currentUser),
  /** Synchronous seed for client game state until GET /me exists. */
  getMeSnapshot: (): User => mock.currentUser,
  getById: (id: string) => delay(mock.friends.find((f) => f.id === id) ?? null),
  getAchievements: () => delay(mock.achievements),
};

export const notificationService = {
  // Future: push via FCM, email via Resend
  list: () => delay(mock.notifications),
};

export const lessonService = {
  getLanguages: () => delay(mock.languages),
  getCourse: (_languageId = "forro"): Promise<Course> => delay(mock.forroCourse),
  getLesson: (id: string): Promise<Lesson | undefined> =>
    delay(mock.forroCourse.units.flatMap((u) => u.lessons).find((l) => l.id === id)),
  getTravelCategories: () => delay(mock.travelCategories),
};

export const progressService = {
  // Future: POST /progress/lesson — client state lives in hooks/use-game until then
  submitLesson: (_lessonId: string, _accuracy: number) => delay(true),
};

export const friendService = {
  list: (): Promise<Friend[]> => delay(mock.friends),
  search: (q: string) =>
    delay(mock.friends.filter((f) => f.name.toLowerCase().includes(q.toLowerCase()))),
  sendRequest: (_username: string) => delay(true),
};

export const leaderboardService = {
  get: (_scope: "friends" | "weekly" | "global" | "country"): Promise<LeaderboardEntry[]> =>
    delay(mock.leaderboard),
  getLeague: () => delay(mock.league),
};
/** @deprecated alias */
export const rankingService = leaderboardService;

export const challengeService = {
  getDaily: () => delay(mock.dailyChallenge),
};

export const gameService = {
  // Future: Socket.IO + Upstash Redis matchmaking
  getRoom: (_code?: string) => delay(mock.sampleRoom),
  ...multiplayerService,
};

export const shopService = {
  getItems: () => delay(mock.shopItems),
};

export const adsService = {
  // Future: Google AdMob. Policy lives in src/config/ads.ts.
  isPremium: () => mock.currentUser.isPremium,
  canShow: (placement: string) => !mock.currentUser.isPremium && adPolicy.canShow(placement),
  showRewarded: () => (adPolicy.isBlocked() ? Promise.resolve(false) : delay(true, 1500)),
};

/** Named aliases matching the handoff contract (docs/HANDOFF.md). */
export const languageService = {
  list: lessonService.getLanguages,
  getCourse: lessonService.getCourse,
};
export const achievementService = { list: userService.getAchievements };
export const roomService = {
  getRoom: gameService.getRoom,
  watchLobby: multiplayerService.watchLobby.bind(multiplayerService),
  createPrivateRoom: multiplayerService.createPrivateRoom.bind(multiplayerService),
  joinPrivateRoom: multiplayerService.joinPrivateRoom.bind(multiplayerService),
  leaveRoom: multiplayerService.leaveRoom,
};
