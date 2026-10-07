/**
 * Reusable screen states: loading, error, empty, offline, success, disabled, locked.
 * Pure presentation — they receive text/handlers via props and never import mocks or services.
 * O Neto (mascote) dá cara aos estados: contente no vazio, triste no erro, preocupado sem
 * internet, a celebrar no sucesso. Bloqueado/indisponível mantêm um ícone (não são emoções).
 */
import { Ban, Lock, WifiOff } from "lucide-react";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import type { AsyncState, Availability } from "@stp/types/async";
import { useOnline } from "@/hooks/use-online";
import { AppButton } from "./Buttons";
import { Neto, type NetoMood } from "./Neto";

type Base = {
  title: string;
  text?: string | undefined;
  icon?: ReactNode | undefined;
  action?: ReactNode | undefined;
  tone?: "muted" | "error" | "success" | "locked";
  neto?: NetoMood | undefined;
};

function StateShell({ title, text, icon, action, tone = "muted", neto }: Base) {
  const toneCls = {
    muted: "bg-muted text-muted-foreground",
    error: "bg-destructive-soft text-destructive",
    success: "bg-success-soft text-primary",
    locked: "bg-muted text-foreground",
  }[tone];
  return (
    <div
      className="flex flex-col items-center px-6 py-12 text-center"
      role={tone === "error" ? "alert" : "status"}
    >
      {neto && !icon ? (
        <Neto mood={neto} size={112} className="animate-pop" />
      ) : (
        <div className={cn("grid size-16 place-items-center rounded-[22px]", toneCls)}>{icon}</div>
      )}
      <p className="mt-4 font-display text-[17px] font-bold">{title}</p>
      {text && <p className="mt-1 max-w-xs text-sm text-muted-foreground">{text}</p>}
      {action && <div className="mt-5 w-full max-w-xs">{action}</div>}
    </div>
  );
}

function RetryButton({ onRetry }: { onRetry?: (() => void) | undefined }) {
  const { t } = useTranslation();
  return onRetry ? (
    <AppButton variant="secondary" onClick={onRetry}>
      {t("neto.retry")}
    </AppButton>
  ) : null;
}

export function LoadingState({
  rows = 3,
  label = "A carregar",
}: {
  rows?: number;
  label?: string;
}) {
  return (
    <div className="space-y-3 p-4" aria-busy="true" aria-label={label}>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="skeleton h-20 rounded-3xl" />
      ))}
    </div>
  );
}

/** Sem `icon`, mostra o Neto contente. */
export function EmptyState({ title, text, icon, action }: Omit<Base, "tone" | "neto">) {
  return <StateShell title={title} text={text} icon={icon} action={action} neto="happy" />;
}

export function ErrorState({
  title,
  text,
  onRetry,
}: {
  title?: string | undefined;
  text?: string | undefined;
  onRetry?: (() => void) | undefined;
}) {
  const { t } = useTranslation();
  return (
    <StateShell
      tone="error"
      title={title ?? t("neto.errorTitle")}
      text={text ?? t("neto.errorText")}
      neto="sad"
      action={<RetryButton onRetry={onRetry} />}
    />
  );
}

export function OfflineState({ onRetry }: { onRetry?: (() => void) | undefined }) {
  const { t } = useTranslation();
  return (
    <StateShell
      title={t("neto.offlineTitle")}
      text={t("neto.offlineText")}
      neto="worried"
      action={<RetryButton onRetry={onRetry} />}
    />
  );
}

export function SuccessState({
  title,
  text,
  action,
}: {
  title?: string | undefined;
  text?: string | undefined;
  action?: ReactNode | undefined;
}) {
  const { t } = useTranslation();
  return (
    <StateShell
      tone="success"
      title={title ?? t("neto.successTitle")}
      text={text}
      neto="celebrate"
      action={action}
    />
  );
}

export function DisabledState({ title, text }: { title?: string | undefined; text: string }) {
  const { t } = useTranslation();
  return <StateShell title={title ?? t("neto.unavailableTitle")} text={text} icon={<Ban />} />;
}

export function LockedState({
  title,
  text,
  action,
}: {
  title?: string | undefined;
  text: string;
  action?: ReactNode | undefined;
}) {
  const { t } = useTranslation();
  return (
    <StateShell
      tone="locked"
      title={title ?? t("neto.lockedTitle")}
      text={text}
      icon={<Lock />}
      action={action}
    />
  );
}

/** Thin banner shown at the top of the app while the device is offline. */
export function OfflineBanner() {
  const online = useOnline();
  const { t } = useTranslation();
  if (online) return null;
  return (
    <div
      className="flex items-center justify-center gap-2 bg-foreground px-4 py-1.5 text-xs font-bold text-background"
      role="status"
    >
      <WifiOff className="size-3.5" /> {t("neto.offlineBanner")}
    </div>
  );
}

/** Renders the right state for an AsyncState; `children` only runs on success. */
export function AsyncView<T>({
  state,
  onRetry,
  isEmpty,
  empty,
  loading,
  children,
}: {
  state: AsyncState<T>;
  onRetry?: (() => void) | undefined;
  isEmpty?: ((data: T) => boolean) | undefined;
  empty?: ReactNode | undefined;
  loading?: ReactNode | undefined;
  children: (data: T) => ReactNode;
}) {
  const { t } = useTranslation();
  switch (state.status) {
    case "loading":
      return <>{loading ?? <LoadingState />}</>;
    case "offline":
      return <OfflineState onRetry={onRetry} />;
    case "error":
      return <ErrorState text={state.error} onRetry={onRetry} />;
    case "success":
      if (isEmpty?.(state.data)) return <>{empty ?? <EmptyState title={t("neto.emptyTitle")} />}</>;
      return <>{children(state.data)}</>;
  }
}

/** Wraps content that may be disabled or locked (e.g. Premium, unit not reached, feature off). */
export function AvailabilityGate({
  availability,
  children,
  lockedAction,
}: {
  availability: Availability;
  children: ReactNode;
  lockedAction?: ReactNode | undefined;
}) {
  if (availability.kind === "disabled") return <DisabledState text={availability.reason} />;
  if (availability.kind === "locked")
    return (
      <LockedState
        text={
          availability.unlockHint
            ? `${availability.reason} ${availability.unlockHint}`
            : availability.reason
        }
        action={lockedAction}
      />
    );
  return <>{children}</>;
}
