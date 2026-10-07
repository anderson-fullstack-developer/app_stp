import { cva, type VariantProps } from "class-variance-authority";
import type { ButtonHTMLAttributes } from "react";
import { sound } from "@/lib/sound";
import { cn } from "@/lib/utils";

const appButton = cva(
  "pressable inline-flex items-center justify-center gap-2 rounded-2xl font-display font-semibold text-[15px] tracking-[-0.01em] select-none focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring/25 disabled:pointer-events-none disabled:opacity-45 disabled:saturate-50 disabled:shadow-none",
  {
    variants: {
      variant: {
        primary:
          "sheen bg-primary text-primary-foreground shadow-[0_1px_2px_oklch(0.3_0.08_160/25%),0_10px_22px_-10px_oklch(0.45_0.12_158/60%)] hover:brightness-[1.04]",
        secondary: "bg-surface text-foreground border border-border shadow-card hover:bg-muted/40",
        sun: "sheen bg-accent text-accent-foreground shadow-[0_1px_2px_oklch(0.5_0.12_75/25%),0_10px_22px_-10px_oklch(0.7_0.15_75/70%)] hover:brightness-[1.03]",
        danger:
          "sheen bg-destructive text-destructive-foreground shadow-[0_1px_2px_oklch(0.4_0.15_25/25%),0_10px_22px_-10px_oklch(0.55_0.18_28/60%)] hover:brightness-[1.04]",
        ghost: "text-primary hover:bg-primary/8",
        light:
          "bg-primary-foreground text-primary-deep shadow-[0_1px_2px_oklch(0_0_0/12%),0_12px_26px_-12px_oklch(0_0_0/35%)]",
      },
      size: {
        lg: "h-[54px] px-6 w-full text-base",
        md: "h-11 px-5",
        sm: "h-9 px-3.5 text-[13px] rounded-xl",
      },
    },
    defaultVariants: { variant: "primary", size: "lg" },
  },
);

type Props = ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof appButton> & { loading?: boolean };

export function AppButton({
  className,
  variant,
  size,
  loading,
  disabled,
  children,
  onClick,
  ...p
}: Props) {
  return (
    <button
      className={cn(appButton({ variant, size }), className)}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      onClick={(e) => {
        sound.play("tap");
        onClick?.(e);
      }}
      {...p}
    >
      {loading && (
        <span
          className="size-4 animate-spin rounded-full border-[2.5px] border-current border-t-transparent"
          aria-hidden
        />
      )}
      {children}
    </button>
  );
}
export const PrimaryButton = (p: Omit<Props, "variant">) => <AppButton variant="primary" {...p} />;
export const SecondaryButton = (p: Omit<Props, "variant">) => (
  <AppButton variant="secondary" {...p} />
);
