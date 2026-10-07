import type { ReactNode } from "react";
import { isFeatureOn, type Feature } from "@stp/config";

/** Hides children when a feature switch is off — use this instead of deleting code. */
export function FeatureGate({
  feature,
  children,
  fallback = null,
}: {
  feature: Feature;
  children: ReactNode;
  fallback?: ReactNode;
}) {
  return <>{isFeatureOn(feature) ? children : fallback}</>;
}
