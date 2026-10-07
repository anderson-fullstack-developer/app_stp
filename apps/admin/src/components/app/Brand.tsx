import { APP_CONFIG } from "@stp/config";
import { cn } from "@/lib/utils";

/** Ícone da app (o Neto). Fonte única: public/icon.svg, gerado por scripts/build-app-icons.mjs. */
export function LogoMark({ size = 56, className }: { size?: number; className?: string }) {
  return (
    <img
      src="/icon.svg"
      width={size}
      height={size}
      alt=""
      aria-hidden
      draggable={false}
      className={cn("shrink-0 select-none", className)}
    />
  );
}

export function Logo({ light, className }: { light?: boolean; className?: string }) {
  return (
    <div className={cn("flex flex-col items-center", className)}>
      <LogoMark size={88} />
      <h1
        className={cn(
          "mt-4 font-display text-4xl font-bold",
          light ? "text-primary-foreground" : "text-foreground",
        )}
      >
        {APP_CONFIG.name}
      </h1>
      <p
        className={cn(
          "mt-1 text-sm font-semibold",
          light ? "text-primary-foreground/80" : "text-muted-foreground",
        )}
      >
        {APP_CONFIG.tagline}
      </p>
    </div>
  );
}
