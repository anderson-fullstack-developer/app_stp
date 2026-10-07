/**
 * Planned third-party integrations. Nothing here is wired yet — this documents where each
 * service plugs in. Public keys go in VITE_* env vars; secrets stay on the NestJS backend only.
 */
export const INTEGRATIONS = {
  auth: { provider: "Clerk", envKey: "VITE_CLERK_PUBLISHABLE_KEY", usedBy: "authService" },
  api: {
    provider: "NestJS (Prisma + Neon PostgreSQL)",
    envKey: "VITE_API_URL",
    usedBy: "all services",
  },
  images: { provider: "Cloudinary", envKey: "VITE_CLOUDINARY_CLOUD_NAME", usedBy: "avatars, shop" },
  audio: { provider: "Cloudflare R2", envKey: "VITE_AUDIO_CDN_URL", usedBy: "Exercise.audioUrl" },
  realtime: {
    provider: "Socket.IO (+ Upstash Redis on backend)",
    envKey: "VITE_SOCKET_URL",
    usedBy: "gameService",
  },
  subscriptionsMobile: {
    provider: "RevenueCat + Google Play Billing",
    envKey: "VITE_REVENUECAT_KEY",
    usedBy: "subscriptionService",
  },
  paymentsWeb: {
    provider: "Stripe",
    envKey: "VITE_STRIPE_PUBLISHABLE_KEY",
    usedBy: "subscriptionService (schools)",
  },
  ads: { provider: "Google AdMob", envKey: "VITE_ADMOB_APP_ID", usedBy: "adsService" },
  email: { provider: "Resend", envKey: null, usedBy: "backend only" },
  analytics: { provider: "PostHog", envKey: "VITE_POSTHOG_KEY", usedBy: "analytics.track" },
  errors: { provider: "Sentry", envKey: "VITE_SENTRY_DSN", usedBy: "error reporting" },
} as const;

/** Analytics facade — swap the body for posthog.capture later. */
export const analytics = {
  track: (_event: string, _props?: Record<string, unknown>) => {},
};
