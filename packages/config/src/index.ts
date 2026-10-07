// =============================================================================
// VALORES PROVISÓRIOS (temp config)
// -----------------------------------------------------------------------------
// Todos os valores temporários do produto vivem aqui. O backend será
// posteriormente a fonte de verdade; até lá, muda aqui — nunca nos componentes.
// =============================================================================

/** Nome e slogan do produto (a única fonte — renomear é mudar aqui). */
export const APP_NAME = "Fala Neto";
export const APP_TAGLINE = "Aprende. Joga. Preserva.";

/** Idioma inicial da app (ids definidos em src/mocks/languages.ts). */
export const DEFAULT_LANGUAGE = "forro";

// --- Sobrevivência (provisório) ---
/** Máximo de jogadores aceites numa sala de sobrevivência. */
export const SURVIVAL_MAX_PLAYERS = 16;
/** Vidas com que cada jogador entra (valor por omissão). */
export const SURVIVAL_STARTING_LIVES = 3;
/** Jogadores no lobby público por omissão. */
export const SURVIVAL_DEFAULT_PLAYERS = 8;

// --- Perguntas (provisório) ---
/** Duração por pergunta em segundos (valor por omissão). */
export const QUESTION_DURATION = 10;

// --- Duelo (provisório) ---
/** Número de perguntas por duelo 1v1. */
export const DUEL_QUESTION_COUNT = 10;

// --- Recompensas simuladas (provisório) ---
export const MOCK_XP_REWARDS = {
  correctAnswer: 10,
  lesson: 30,
  daily: 50,
} as const;

export const MOCK_COIN_REWARDS = {
  lesson: 5,
  daily: 10,
  rewardedAd: 20,
} as const;

// --- Premium (provisório; preços só para exibição, sem pagamentos reais) ---
export const PREMIUM_MONTHLY_DISPLAY_PRICE = "4,99";
export const PREMIUM_YEARLY_DISPLAY_PRICE = "39,99";
export const PREMIUM_NOTE = "Os preços apresentados são apenas valores provisórios.";

// =============================================================================
// Configuração derivada (consumida pela app — não alterar aqui em cima de alterações)
// =============================================================================

export const APP_CONFIG = {
  name: APP_NAME,
  tagline: APP_TAGLINE,
  themeColor: "#1f7a55",
  currency: "EUR",
  currencySymbol: "€",
  defaultLanguage: DEFAULT_LANGUAGE,
  pricing: {
    monthly: PREMIUM_MONTHLY_DISPLAY_PRICE,
    yearly: PREMIUM_YEARLY_DISPLAY_PRICE,
    provisionalNote: PREMIUM_NOTE,
  },
  maxLives: 5,
  xpPerLevel: 800,
  rewards: {
    correctAnswerXp: MOCK_XP_REWARDS.correctAnswer,
    lessonXp: MOCK_XP_REWARDS.lesson,
    lessonCoins: MOCK_COIN_REWARDS.lesson,
    dailyXp: MOCK_XP_REWARDS.daily,
    dailyCoins: MOCK_COIN_REWARDS.daily,
    rewardedAdCoins: MOCK_COIN_REWARDS.rewardedAd,
  },
  dailyGoalOptions: [
    { minutes: 5, label: "Casual" },
    { minutes: 10, label: "Regular" },
    { minutes: 15, label: "Sério" },
    { minutes: 20, label: "Intenso" },
  ],
  /** Show an interstitial ad slot after this many completed lessons (free plan only). */
  adEveryNLessons: 3,
} as const;

/** Toggle unfinished features on/off. */
/**
 * Main feature switches (provisional — the backend/remote config will become the source of truth).
 * To turn a feature off, flip it to `false` here. NEVER delete code to disable a feature:
 * gate it with `isFeatureOn()` / `isEnabled()` or the `<FeatureGate>` component instead.
 */
export const features = {
  multiplayer: true,
  tournaments: false,
  premium: true,
  ads: true,
  schoolMode: false,
  aiTools: false,
} as const;

export type Feature = keyof typeof features;
export const isFeatureOn = (feature: Feature): boolean => features[feature];

/** Detailed flags — derived from `features` so one switch controls everything below it. */
export const FEATURE_FLAGS = {
  multiplayerEnabled: features.multiplayer,
  premiumEnabled: features.premium,
  adsEnabled: features.ads,
  rewardedAdsEnabled: features.ads,
  tournamentsEnabled: features.multiplayer && features.tournaments,
  schoolModeEnabled: features.schoolMode,
  aiToolsEnabled: features.aiTools,
  travelPackEnabled: false,
  shopEnabled: true,
} as const;

export type FeatureFlag = keyof typeof FEATURE_FLAGS;
export const isEnabled = (flag: FeatureFlag): boolean => FEATURE_FLAGS[flag];

/**
 * Multiplayer values. The backend (NestJS + Socket.IO) will later send these per room;
 * the UI must read them from here / from the service — never hardcode them in components.
 * Fair play: nothing here may be bought or boosted by Premium.
 */
export const MULTIPLAYER_CONFIG = {
  playerOptions: [4, 8, SURVIVAL_MAX_PLAYERS],
  livesOptions: [1, 2, 3, 5],
  timeOptions: [5, QUESTION_DURATION, 15, 20],
  publicSurvival: {
    players: SURVIVAL_DEFAULT_PLAYERS,
    lives: SURVIVAL_STARTING_LIVES,
    seconds: QUESTION_DURATION,
  },
  duel: { questions: DUEL_QUESTION_COUNT, seconds: QUESTION_DURATION },
  teams: { questions: 8, seconds: QUESTION_DURATION },
  scoring: { base: 100, maxSpeedBonus: 50 },
  urgencySeconds: 3,
  maxRounds: 40,
  survivalRewards: [
    { place: 1, xp: 250, coins: 50 },
    { place: 2, xp: 150, coins: 30 },
    { place: 3, xp: 100, coins: 20 },
  ],
  participationReward: { xp: 40, coins: 5 },
  matchRewards: { win: { xp: 120, coins: 20 }, lose: { xp: 40, coins: 5 } },
} as const;
