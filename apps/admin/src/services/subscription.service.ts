/**
 * Subscription service — mock-backed, no real purchases.
 *
 * Future providers:
 *  - RevenueCat (cross-platform entitlements, source of truth for "isPremium")
 *  - Google Play Billing (Android store payments, via RevenueCat)
 *  - Stripe stays for web/B2B only (see services/integrations.ts)
 *
 * Swap plan: replace each function body with RevenueCat SDK calls
 * (Purchases.getOfferings / purchasePackage / restorePurchases / getCustomerInfo).
 * Keep signatures — screens never touch store SDKs directly.
 *
 * Rules:
 *  - Prices are DISPLAY-ONLY, from @stp/config (packages/config) (provisional).
 *    The backend/store is the source of truth for real prices.
 *  - No real purchase flow exists here; purchasePackage() simulates success.
 *  - Entitlement ("premium") will be verified server-side, never trusted from the client.
 */
import { PREMIUM_MONTHLY_DISPLAY_PRICE, PREMIUM_YEARLY_DISPLAY_PRICE } from "@stp/config";
import * as mock from "@/mocks";

const delay = <T,>(value: T, ms = 400) => new Promise<T>((r) => setTimeout(() => r(value), ms));

/** Matches RevenueCat's Package model (identifier, offering, product). */
export interface SubscriptionPackage {
  /** Store-agnostic identifier, e.g. "premium_monthly" (RevenueCat package id). */
  id: string;
  /** RevenueCat offering identifier, e.g. "default". */
  offeringId: string;
  /** Store product id, e.g. "com.linguastp.premium.monthly" (Google Play). */
  storeProductId: string;
  period: "monthly" | "yearly";
  /** Display-only price string (provisional; store price comes from RevenueCat). */
  displayPrice: string;
  currency: "EUR";
}

/** Matches RevenueCat's CustomerInfo → active entitlement snapshot. */
export interface SubscriptionStatus {
  isPremium: boolean;
  /** Entitlement identifier as it will exist in RevenueCat ("premium"). */
  entitlementId: string;
  expiresAt: string | null;
  /** Store that owns the subscription. */
  store: "play_store" | "app_store" | "stripe" | null;
}

export const PREMIUM_ENTITLEMENT_ID = "premium";

const PACKAGES: SubscriptionPackage[] = [
  {
    id: "premium_monthly",
    offeringId: "default",
    storeProductId: "com.linguastp.premium.monthly",
    period: "monthly",
    displayPrice: PREMIUM_MONTHLY_DISPLAY_PRICE,
    currency: "EUR",
  },
  {
    id: "premium_yearly",
    offeringId: "default",
    storeProductId: "com.linguastp.premium.yearly",
    period: "yearly",
    displayPrice: PREMIUM_YEARLY_DISPLAY_PRICE,
    currency: "EUR",
  },
];

export const subscriptionService = {
  /** Future: Purchases.getOfferings() → current offering packages. */
  getOfferings: (): Promise<SubscriptionPackage[]> => delay(PACKAGES),

  /** Legacy plan list used by the Premium screen (marketing copy + prices). */
  getPlans: () => delay(mock.subscriptions),

  /** Future: Purchases.getCustomerInfo() → active "premium" entitlement. */
  getCurrentSubscription: (): Promise<SubscriptionStatus> =>
    delay({
      isPremium: mock.currentUser.isPremium,
      entitlementId: PREMIUM_ENTITLEMENT_ID,
      expiresAt: null,
      store: null,
    }),

  /** Convenience check; ads/paywall gates should call this, not user.isPremium. */
  isPremium: (): Promise<boolean> => delay(mock.currentUser.isPremium),

  /**
   * Future: Purchases.purchasePackage(pkg) → Google Play Billing sheet.
   * Mock: simulates a successful purchase; no money, no store dialog.
   */
  purchasePackage: (_pkg: SubscriptionPackage): Promise<SubscriptionStatus> =>
    delay(
      {
        isPremium: true,
        entitlementId: PREMIUM_ENTITLEMENT_ID,
        expiresAt: null,
        store: "play_store",
      },
      1200,
    ),

  /** Future: Purchases.restorePurchases() (required by Google Play policy). */
  restorePurchases: (): Promise<SubscriptionStatus> =>
    delay({
      isPremium: mock.currentUser.isPremium,
      entitlementId: PREMIUM_ENTITLEMENT_ID,
      expiresAt: null,
      store: null,
    }),
};
