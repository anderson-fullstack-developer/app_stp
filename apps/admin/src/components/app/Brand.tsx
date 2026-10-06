import { APP_CONFIG } from "@stp/config";
import { cn } from "@/lib/utils";

export function LogoMark({ size = 56, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" className={className} aria-hidden>
      <rect width="64" height="64" rx="20" fill="var(--accent)" />
      <path d="M14 46 L30 14 L36 26 L42 20 L52 46 Z" fill="var(--primary-deep)" />
      <path d="M8 46 Q20 40 32 46 T56 46 V56 H8Z" fill="var(--ocean)" />
      <circle cx="46" cy="16" r="5" fill="var(--destructive)" />
    </svg>
  );
}

export function Logo({ light, className }: { light?: boolean; className?: string }) {
  return (
    <div className={cn("flex flex-col items-center", className)}>
      <LogoMark size={88} />
      <h1 className={cn("mt-4 font-display text-4xl font-extrabold", light ? "text-primary-foreground" : "text-foreground")}>{APP_CONFIG.name}</h1>
      <p className={cn("mt-1 text-sm font-semibold", light ? "text-primary-foreground/80" : "text-muted-foreground")}>{APP_CONFIG.tagline}</p>
    </div>
  );
}
