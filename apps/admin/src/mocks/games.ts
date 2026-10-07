/** Multiplayer demo data: bots are the shared demo people, questions come from ./questions. */
import { APP_CONFIG } from "@stp/config";
import type { Subscription } from "@/types";
import type { MatchPlayerSeed } from "@stp/types/multiplayer";
import { people } from "./users";

export { buildQuestionPool } from "./questions";

/** Simulated opponents — same people as friends/rankings, never a separate list. */
export const MOCK_OPPONENTS: MatchPlayerSeed[] = people.map((p) => ({
  id: p.id,
  name: p.name,
  color: p.color,
  skill: p.skill,
}));

export const dailyChallenge = {
  questions: 5,
  xpReward: APP_CONFIG.rewards.dailyXp,
  coinReward: APP_CONFIG.rewards.dailyCoins,
  participants: 247,
};

export const subscriptions: Subscription[] = [
  {
    id: "monthly",
    label: "Mensal",
    price: `${APP_CONFIG.currencySymbol}${APP_CONFIG.pricing.monthly}`,
    period: "/mês",
  },
  {
    id: "yearly",
    label: "Anual",
    price: `${APP_CONFIG.currencySymbol}${APP_CONFIG.pricing.yearly}`,
    period: "/ano",
    highlight: "Poupa com o plano anual",
  },
];

export const shopItems = [
  { id: "s1", name: "Avatar Cacau", category: "Avatar", icon: "🍫", price: 150 },
  { id: "s2", name: "Avatar Tartaruga", category: "Avatar", icon: "🐢", price: 200 },
  { id: "s3", name: "Moldura Floresta", category: "Moldura de perfil", icon: "🌿", price: 250 },
  { id: "s4", name: "Badge Pico Cão Grande", category: "Badge", icon: "⛰️", price: 300 },
  { id: "s5", name: "Streak Freeze", category: "Proteção", icon: "🧊", price: 100 },
  { id: "s6", name: "Tema Oceano", category: "Tema visual", icon: "🌊", price: 400 },
];
