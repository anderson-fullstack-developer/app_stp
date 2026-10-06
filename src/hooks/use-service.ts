import { useQuery } from "@tanstack/react-query";
import { challengeService, friendService, gameService, lessonService, leaderboardService as rankingService, notificationService, shopService, subscriptionService, userService } from "@/services";

export const useMe = () => useQuery({ queryKey: ["me"], queryFn: userService.getMe });
export const useCourse = () => useQuery({ queryKey: ["course"], queryFn: () => lessonService.getCourse() });
export const useLanguages = () => useQuery({ queryKey: ["languages"], queryFn: lessonService.getLanguages });
export const useLesson = (id: string) => useQuery({ queryKey: ["lesson", id], queryFn: () => lessonService.getLesson(id) });
export const useFriends = () => useQuery({ queryKey: ["friends"], queryFn: friendService.list });
export const useUser = (id: string) => useQuery({ queryKey: ["user", id], queryFn: () => userService.getById(id) });
export const useRanking = (scope: "friends" | "weekly" | "global" | "country") =>
  useQuery({ queryKey: ["ranking", scope], queryFn: () => rankingService.get(scope) });
export const useLeague = () => useQuery({ queryKey: ["league"], queryFn: rankingService.getLeague });
export const useAchievements = () => useQuery({ queryKey: ["achievements"], queryFn: userService.getAchievements });
export const useNotifications = () => useQuery({ queryKey: ["notifications"], queryFn: notificationService.list });
export const useDaily = () => useQuery({ queryKey: ["daily"], queryFn: challengeService.getDaily });
export const useRoom = () => useQuery({ queryKey: ["room"], queryFn: () => gameService.getRoom() });
export const usePlans = () => useQuery({ queryKey: ["plans"], queryFn: subscriptionService.getPlans });
export const useShop = () => useQuery({ queryKey: ["shop"], queryFn: shopService.getItems });
export const useTravel = () => useQuery({ queryKey: ["travel"], queryFn: lessonService.getTravelCategories });
