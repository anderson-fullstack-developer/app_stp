import { cva, type VariantProps } from "class-variance-authority";
import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

const appButton = cva(
  "pressable inline-flex items-center justify-center gap-2 rounded-2xl font-display font-bold uppercase tracking-wide text-[15px] select-none focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring/30 disabled:pointer-events-none disabled:opacity-45 disabled:saturate-50",
  {
    variants: {
      variant: {
        primary: "bg-primary text-primary-foreground shadow-[0_4px_0_0_var(--primary-deep)] active:shadow-none",
        secondary: "bg-surface text-foreground border-2 border-border shadow-[0_3px_0_0_var(--border)] active:shadow-none",
        sun: "bg-accent text-accent-foreground shadow-[0_4px_0_0_var(--accent-deep)] active:shadow-none",
        danger: "bg-destructive text-destructive-foreground shadow-[0_4px_0_0_oklch(0.45_0.17_25)] active:shadow-none",
        ghost: "text-primary hover:bg-primary/10",
        light: "bg-primary-foreground text-primary-deep shadow-[0_4px_0_0_oklch(0_0_0/18%)] active:shadow-none",
      },
      size: { lg: "h-14 px-6 w-full", md: "h-11 px-5", sm: "h-9 px-3 text-xs rounded-xl" },
    },
    defaultVariants: { variant: "primary", size: "lg" },
  },
);

type Props = ButtonHTMLAttributes<HTMLButtonElement> & VariantProps<typeof appButton> & { loading?: boolean };

export function AppButton({ className, variant, size, loading, disabled, children, ...p }: Props) {
  return (
    <button className={cn(appButton({ variant, size }), className)} disabled={disabled || loading} aria-busy={loading || undefined} {...p}>
      {loading && <span className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent" aria-hidden />}
      {children}
    </button>
  );
}
export const PrimaryButton = (p: Omit<Props, "variant">) => <AppButton variant="primary" {...p} />;
export const SecondaryButton = (p: Omit<Props, "variant">) => <AppButton variant="secondary" {...p} />;
export { appButton };
