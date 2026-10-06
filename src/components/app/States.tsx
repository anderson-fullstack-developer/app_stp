/**
 * Reusable screen states: loading, error, empty, offline, success, disabled, locked.
 * Pure presentation — they receive text/handlers via props and never import mocks or services.
 */
import { AlertTriangle, CheckCircle2, Inbox, Lock, Ban, WifiOff } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import type { AsyncState, Availability } from "@/types/async";
import { useOnline } from "@/hooks/use-online";
import { AppButton } from "./Buttons";

type Base = { title: string; text?: string | undefined; icon?: ReactNode | undefined; action?: ReactNode | undefined; tone?: "muted" | "error" | "success" | "locked" };

function StateShell({ title, text, icon, action, tone = "muted" }: Base) {
  const toneCls = { muted: "bg-muted text-muted-foreground", error: "bg-destructive-soft text-destructive", success: "bg-success-soft text-primary", locked: "bg-muted text-foreground" }[tone];
  return (
    <div className="flex flex-col items-center px-6 py-12 text-center" role={tone === "error" ? "alert" : "status"}>
      <div className={cn("grid size-16 place-items-center rounded-full", toneCls)}>{icon}</div>
      <p className="mt-3 font-display font-bold">{title}</p>
      {text && <p className="mt-1 max-w-xs text-sm text-muted-foreground">{text}</p>}
      {action && <div className="mt-5 w-full max-w-xs">{action}</div>}
    </div>
  );
}

const RetryButton = ({ onRetry }: { onRetry?: (() => void) | undefined }) =>
  onRetry ? <AppButton variant="secondary" onClick={onRetry}>Tentar de novo</AppButton> : null;

export function LoadingState({ rows = 3, label = "A carregar" }: { rows?: number; label?: string }) {
  return (
    <div className="space-y-3 p-4" aria-busy="true" aria-label={label}>
      {Array.from({ length: rows }).map((_, i) => <div key={i} className="skeleton h-20 rounded-2xl" />)}
    </div>
  );
}

export const EmptyState = ({ title, text, icon, action }: Omit<Base, "tone">) =>
  <StateShell title={title} text={text} icon={icon ?? <Inbox />} action={action} />;

export const ErrorState = ({ title = "Ups!", text = "Algo correu mal. Tenta novamente.", onRetry }: { title?: string | undefined; text?: string | undefined; onRetry?: (() => void) | undefined }) =>
  <StateShell tone="error" title={title} text={text} icon={<AlertTriangle />} action={<RetryButton onRetry={onRetry} />} />;

export const OfflineState = ({ onRetry }: { onRetry?: (() => void) | undefined }) =>
  <StateShell title="Sem ligação" text="Verifica a tua internet e tenta outra vez." icon={<WifiOff />} action={<RetryButton onRetry={onRetry} />} />;

export const SuccessState = ({ title = "Feito!", text, action }: { title?: string | undefined; text?: string | undefined; action?: ReactNode  | undefined}) =>
  <StateShell tone="success" title={title} text={text} icon={<CheckCircle2 />} action={action} />;

export const DisabledState = ({ title = "Indisponível", text }: { title?: string | undefined; text: string }) =>
  <StateShell title={title} text={text} icon={<Ban />} />;

export const LockedState = ({ title = "Bloqueado", text, action }: { title?: string | undefined; text: string; action?: ReactNode  | undefined}) =>
  <StateShell tone="locked" title={title} text={text} icon={<Lock />} action={action} />;

/** Thin banner shown at the top of the app while the device is offline. */
export function OfflineBanner() {
  const online = useOnline();
  if (online) return null;
  return (
    <div className="flex items-center justify-center gap-2 bg-foreground px-4 py-1.5 text-xs font-bold text-background" role="status">
      <WifiOff className="size-3.5" /> Sem ligação — algumas funções estão indisponíveis
    </div>
  );
}

/** Renders the right state for an AsyncState; `children` only runs on success. */
export function AsyncView<T>({ state, onRetry, isEmpty, empty, loading, children }: {
  state: AsyncState<T>;
  onRetry?: (() => void) | undefined;
  isEmpty?: ((data: T) => boolean) | undefined;
  empty?: ReactNode | undefined;
  loading?: ReactNode | undefined;
  children: (data: T) => ReactNode;
}) {
  switch (state.status) {
    case "loading": return <>{loading ?? <LoadingState />}</>;
    case "offline": return <OfflineState onRetry={onRetry} />;
    case "error": return <ErrorState text={state.error} onRetry={onRetry} />;
    case "success":
      if (isEmpty?.(state.data)) return <>{empty ?? <EmptyState title="Ainda não há nada aqui" />}</>;
      return <>{children(state.data)}</>;
  }
}

/** Wraps content that may be disabled or locked (e.g. Premium, unit not reached, feature off). */
export function AvailabilityGate({ availability, children, lockedAction }: { availability: Availability; children: ReactNode; lockedAction?: ReactNode  | undefined}) {
  if (availability.kind === "disabled") return <DisabledState text={availability.reason} />;
  if (availability.kind === "locked") return <LockedState text={availability.unlockHint ? `${availability.reason} ${availability.unlockHint}` : availability.reason} action={lockedAction} />;
  return <>{children}</>;
}
