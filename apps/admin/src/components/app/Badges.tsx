import { Coins, Flame, Star } from "lucide-react";
import { cn } from "@/lib/utils";
import type { AvatarColor } from "@/types";

const pill =
  "inline-flex items-center gap-1.5 rounded-full px-3 h-8 text-sm font-semibold font-display tabular-nums ring-1 ring-inset ring-black/[0.04]";

export const StreakBadge = ({ value, className }: { value: number; className?: string }) => (
  <span
    className={cn(pill, "bg-destructive-soft text-destructive", className)}
    aria-label={`Sequência de ${value} dias`}
  >
    <Flame className="size-4 fill-current" /> {value}
  </span>
);
export const XPBadge = ({ value, className }: { value: number; className?: string }) => (
  <span
    className={cn(pill, "bg-accent/30 text-accent-foreground", className)}
    aria-label={`${value} XP`}
  >
    <Star className="size-4 fill-accent-deep text-accent-deep" /> {value.toLocaleString("pt-PT")}
  </span>
);
export const CoinBadge = ({ value, className }: { value: number; className?: string }) => (
  <span
    className={cn(pill, "bg-secondary/10 text-secondary", className)}
    aria-label={`${value} moedas`}
  >
    <Coins className="size-4" /> {value}
  </span>
);

const avatarBg: Record<AvatarColor, string> = {
  forest: "bg-forest text-primary-foreground",
  sun: "bg-sun text-accent-foreground",
  ocean: "bg-ocean-grad text-ocean-foreground",
  cocoa: "bg-cocoa text-secondary-foreground",
  coral: "bg-coral text-destructive-foreground",
};

export function Avatar({
  name,
  color,
  size = 44,
  className,
  dim,
}: {
  name: string;
  color: AvatarColor;
  size?: number;
  className?: string;
  dim?: boolean;
}) {
  return (
    <div
      className={cn(
        "grid place-items-center rounded-full font-display font-bold ring-2 ring-surface shrink-0",
        avatarBg[color],
        dim && "grayscale opacity-40",
        className,
      )}
      style={{ width: size, height: size, fontSize: size * 0.42 }}
      aria-label={name}
    >
      {name.charAt(0)}
    </div>
  );
}

export const SoonBadge = () => (
  <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-semibold text-muted-foreground ring-1 ring-border/70">
    Em breve
  </span>
);
