import { Volume2 } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

export function ProgressBar({ value, className, tone = "primary" }: { value: number; className?: string; tone?: "primary" | "sun" | "light" }) {
  const fill = { primary: "bg-primary", sun: "bg-accent", light: "bg-primary-foreground" }[tone];
  return (
    <div className={cn("h-2.5 w-full overflow-hidden rounded-full bg-muted", tone === "light" && "bg-primary-foreground/25", className)} role="progressbar" aria-valuenow={value} aria-valuemin={0} aria-valuemax={100}>
      <div className={cn("relative h-full rounded-full transition-[width] duration-700 ease-[cubic-bezier(0.22,1,0.36,1)]", fill)} style={{ width: `${Math.max(4, value)}%` }}>
        <span className="absolute inset-x-1.5 top-[2px] h-[3px] rounded-full bg-primary-foreground/30" />
      </div>
    </div>
  );
}

export function StatCard({ icon, label, value, className }: { icon: ReactNode; label: string; value: ReactNode; className?: string }) {
  return (
    <div className={cn("card rounded-2xl p-3.5", className)}>
      <div className="flex items-center gap-2 text-muted-foreground text-[11px] font-semibold uppercase tracking-wider">{icon}{label}</div>
      <div className="mt-1 font-display text-2xl font-bold">{value}</div>
    </div>
  );
}

export function AudioButton({ label = "Ouvir", size = "lg" }: { label?: string; size?: "lg" | "sm" }) {
  const [playing, setPlaying] = useState(false);
  useEffect(() => { if (!playing) return; const t = setTimeout(() => setPlaying(false), 900); return () => clearTimeout(t); }, [playing]);
  return (
    <button
      type="button"
      onClick={() => setPlaying(true)}
      aria-label={label}
      className={cn("pressable grid place-items-center rounded-2xl sheen bg-ocean text-ocean-foreground shadow-[0_2px_4px_oklch(0.4_0.09_225/25%),0_12px_24px_-10px_oklch(0.5_0.1_215/60%)]", size === "lg" ? "size-16" : "size-11", playing && "animate-pulse")}
    >
      <Volume2 className={size === "lg" ? "size-7" : "size-5"} />
    </button>
  );
}

export function Modal({ open, onClose, children }: { open: boolean; onClose: () => void; children: ReactNode }) {
  if (!open) return null;
  return (
    <div className="absolute inset-0 z-50 grid place-items-center bg-foreground/35 p-6 backdrop-blur-[3px] animate-in fade-in duration-200" onClick={onClose}>
      <div className="animate-pop w-full rounded-[28px] bg-surface p-6 shadow-float" onClick={(e) => e.stopPropagation()}>{children}</div>
    </div>
  );
}

export function BottomSheet({ open, tone = "neutral", children }: { open: boolean; tone?: "success" | "error" | "neutral"; children: ReactNode }) {
  if (!open) return null;
  const toneCls = { success: "bg-success-soft", error: "bg-destructive-soft", neutral: "bg-surface" }[tone];
  return (
    <div className={cn("animate-sheet absolute inset-x-0 bottom-0 z-40 rounded-t-[28px] px-5 pt-5 safe-bottom pb-5 shadow-[0_-12px_40px_-16px_oklch(0.3_0.04_70/30%)]", toneCls)} role="dialog">
      {children}
    </div>
  );
}

// Screen states live in ./States — re-exported here so existing imports keep working.
export { EmptyState, ErrorState, OfflineState, LockedState, LoadingState, SuccessState, DisabledState } from "./States";

export function SectionTitle({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-3 mt-6 flex items-center justify-between">
      <h2 className="font-display text-[17px] font-bold tracking-[-0.01em]">{children}</h2>
      {action}
    </div>
  );
}

export function Tabs<T extends string>({ value, onChange, items }: { value: T; onChange: (v: T) => void; items: { value: T; label: string }[] }) {
  return (
    <div className="flex rounded-2xl bg-muted/80 p-1" role="tablist">
      {items.map((it) => (
        <button key={it.value} role="tab" aria-selected={value === it.value} onClick={() => onChange(it.value)}
          className={cn("flex-1 rounded-xl py-2 text-[13px] font-semibold transition-all duration-200", value === it.value ? "bg-surface text-primary shadow-card" : "text-muted-foreground")}>
          {it.label}
        </button>
      ))}
    </div>
  );
}
