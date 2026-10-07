import { ChevronLeft, ChevronRight, Sparkles } from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function Panel({
  title,
  actions,
  children,
  className,
}: {
  title?: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("rounded-xl border bg-surface", className)}>
      {title && (
        <div className="flex items-center justify-between border-b px-4 py-3">
          <h2 className="text-sm font-semibold">{title}</h2>
          {actions}
        </div>
      )}
      <div className="p-4">{children}</div>
    </section>
  );
}

export function Kpi({
  label,
  value,
  hint,
  tone,
}: {
  label: string;
  value: ReactNode;
  hint?: string;
  tone?: "up" | "down";
}) {
  return (
    <div className="rounded-xl border bg-surface p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 font-display text-2xl font-bold tabular-nums">{value}</p>
      {hint && (
        <p
          className={cn(
            "mt-0.5 text-xs font-medium",
            tone === "down" ? "text-destructive" : "text-success",
          )}
        >
          {hint}
        </p>
      )}
    </div>
  );
}

const TONES: Record<string, string> = {
  APPROVED: "bg-success-soft text-success",
  ATIVO: "bg-success-soft text-success",
  RESOLVED: "bg-success-soft text-success",
  TERMINADA: "bg-success-soft text-success",
  UNDER_REVIEW: "bg-accent/25 text-accent-foreground",
  IN_REVIEW: "bg-accent/25 text-accent-foreground",
  "EM PREPARAÇÃO": "bg-accent/25 text-accent-foreground",
  AGENDADO: "bg-accent/25 text-accent-foreground",
  "A DECORRER": "bg-ocean/15 text-ocean",
  DRAFT: "bg-muted text-muted-foreground",
  RASCUNHO: "bg-muted text-muted-foreground",
  OPEN: "bg-ocean/15 text-ocean",
  INATIVO: "bg-muted text-muted-foreground",
  TERMINADO: "bg-muted text-muted-foreground",
  REJECTED: "bg-destructive-soft text-destructive",
  BLOQUEADO: "bg-destructive-soft text-destructive",
  SUSPENSO: "bg-destructive-soft text-destructive",
  ABANDONADA: "bg-destructive-soft text-destructive",
  ARCHIVED: "bg-muted text-muted-foreground line-through",
  DISMISSED: "bg-muted text-muted-foreground",
};
export const StatusBadge = ({ status }: { status: string }) => (
  <span
    className={cn(
      "inline-flex items-center whitespace-nowrap rounded-md px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide",
      TONES[status] ?? "bg-muted text-muted-foreground",
    )}
  >
    {status.replace("_", " ")}
  </span>
);

export function Btn({
  variant = "primary",
  size = "md",
  className,
  ...p
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "outline" | "ghost" | "danger" | "success";
  size?: "sm" | "md";
}) {
  const v = {
    primary: "bg-primary text-primary-foreground hover:bg-primary-deep",
    outline: "border bg-surface hover:bg-muted",
    ghost: "hover:bg-muted",
    danger: "bg-destructive text-destructive-foreground hover:opacity-90",
    success: "bg-success text-primary-foreground hover:opacity-90",
  }[variant];
  return (
    <button
      type="button"
      className={cn(
        "inline-flex items-center justify-center gap-1.5 rounded-lg font-medium transition-colors disabled:pointer-events-none disabled:opacity-45",
        size === "sm" ? "h-8 px-2.5 text-xs" : "h-9 px-3.5 text-sm",
        v,
        className,
      )}
      {...p}
    />
  );
}

export function Field({
  label,
  children,
  hint,
  className,
}: {
  label: string;
  children: ReactNode;
  hint?: string;
  className?: string;
}) {
  return (
    <label className={cn("block space-y-1.5", className)}>
      <span className="text-xs font-semibold text-muted-foreground">{label}</span>
      {children}
      {hint && <span className="block text-xs text-muted-foreground">{hint}</span>}
    </label>
  );
}
const inputCls =
  "h-9 w-full rounded-lg border bg-surface px-3 text-sm outline-none focus:ring-2 focus:ring-ring/30";
export const TextInput = (p: React.InputHTMLAttributes<HTMLInputElement>) => (
  <input {...p} className={cn(inputCls, p.className)} />
);
export const TextArea = (p: React.TextareaHTMLAttributes<HTMLTextAreaElement>) => (
  <textarea rows={3} {...p} className={cn(inputCls, "h-auto py-2", p.className)} />
);
export function Select<T extends string>({
  value,
  onChange,
  options,
  className,
}: {
  value: T;
  onChange: (v: T) => void;
  options: readonly (T | { value: T; label: string })[];
  className?: string;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as T)}
      className={cn(inputCls, className)}
    >
      {options.map((o) => {
        const v = typeof o === "string" ? o : o.value;
        const l = typeof o === "string" ? o : o.label;
        return (
          <option key={v} value={v}>
            {l}
          </option>
        );
      })}
    </select>
  );
}

export interface Column<T> {
  key: string;
  header: string;
  cell: (row: T) => ReactNode;
  className?: string;
}

export function DataTable<T extends { id: string }>({
  rows,
  columns,
  onRowClick,
  pageSize = 10,
  empty = "Sem resultados.",
}: {
  rows: T[];
  columns: Column<T>[];
  onRowClick?: (r: T) => void;
  pageSize?: number;
  empty?: string;
}) {
  const [page, setPage] = useState(0);
  const pages = Math.max(1, Math.ceil(rows.length / pageSize));
  const p = Math.min(page, pages - 1);
  const slice = useMemo(
    () => rows.slice(p * pageSize, p * pageSize + pageSize),
    [rows, p, pageSize],
  );
  return (
    <div className="overflow-hidden rounded-xl border bg-surface">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/60 text-left text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              {columns.map((c) => (
                <th
                  key={c.key}
                  className={cn("whitespace-nowrap px-3 py-2.5 font-semibold", c.className)}
                >
                  {c.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {slice.map((r) => (
              <tr
                key={r.id}
                onClick={onRowClick ? () => onRowClick(r) : undefined}
                className={cn("border-t", onRowClick && "cursor-pointer hover:bg-muted/40")}
              >
                {columns.map((c) => (
                  <td key={c.key} className={cn("px-3 py-2.5 align-middle", c.className)}>
                    {c.cell(r)}
                  </td>
                ))}
              </tr>
            ))}
            {slice.length === 0 && (
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-3 py-10 text-center text-muted-foreground"
                >
                  {empty}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="flex items-center justify-between border-t px-3 py-2 text-xs text-muted-foreground">
        <span>{rows.length} registos</span>
        <div className="flex items-center gap-1">
          <Btn
            variant="ghost"
            size="sm"
            disabled={p === 0}
            onClick={() => setPage(p - 1)}
            aria-label="Página anterior"
          >
            <ChevronLeft className="size-4" />
          </Btn>
          <span>
            {p + 1} / {pages}
          </span>
          <Btn
            variant="ghost"
            size="sm"
            disabled={p >= pages - 1}
            onClick={() => setPage(p + 1)}
            aria-label="Página seguinte"
          >
            <ChevronRight className="size-4" />
          </Btn>
        </div>
      </div>
    </div>
  );
}

export function FilterBar({ children }: { children: ReactNode }) {
  return (
    <div className="mb-3 flex flex-wrap items-center gap-2 [&>*]:w-auto [&_select]:w-40">
      {children}
    </div>
  );
}

export function Drawer({
  open,
  onClose,
  title,
  children,
  footer,
  wide,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  wide?: boolean;
}) {
  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent
        className={cn("flex w-full flex-col gap-0 p-0", wide ? "sm:max-w-2xl" : "sm:max-w-lg")}
      >
        <SheetHeader className="border-b px-5 py-4">
          <SheetTitle>{title}</SheetTitle>
        </SheetHeader>
        <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">{children}</div>
        {footer && (
          <div className="flex flex-wrap justify-end gap-2 border-t px-5 py-3">{footer}</div>
        )}
      </SheetContent>
    </Sheet>
  );
}

export function Confirm({
  open,
  title,
  text,
  confirmLabel = "Confirmar",
  danger,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  text: string;
  confirmLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <AlertDialog open={open} onOpenChange={(o) => !o && onCancel()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{text}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onCancel}>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className={
              danger ? "bg-destructive text-destructive-foreground hover:bg-destructive/90" : ""
            }
          >
            {confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

/* ---------- charts (dependency-free SVG) ---------- */
export function LineChart({
  data,
  height = 120,
  tone = "primary",
}: {
  data: number[];
  height?: number;
  tone?: "primary" | "ocean" | "accent";
}) {
  const max = Math.max(...data),
    min = Math.min(...data) * 0.9;
  const pts = data
    .map((v, i) => `${(i / (data.length - 1)) * 100},${100 - ((v - min) / (max - min || 1)) * 90}`)
    .join(" ");
  const color = { primary: "var(--primary)", ocean: "var(--ocean)", accent: "var(--accent-deep)" }[
    tone
  ];
  return (
    <svg
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      className="w-full"
      style={{ height }}
      role="img"
      aria-label="Gráfico"
    >
      <polygon points={`0,100 ${pts} 100,100`} fill={color} opacity={0.12} />
      <polyline
        points={pts}
        fill="none"
        stroke={color}
        strokeWidth={2}
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

export function BarChart({
  data,
  height = 140,
  suffix = "",
}: {
  data: { label: string; value: number }[];
  height?: number;
  suffix?: string;
}) {
  const max = Math.max(...data.map((d) => d.value)) || 1;
  return (
    <div className="flex items-end gap-3" style={{ height }}>
      {data.map((d) => (
        <div key={d.label} className="flex flex-1 flex-col items-center justify-end gap-1 h-full">
          <span className="text-xs font-semibold tabular-nums">
            {d.value}
            {suffix}
          </span>
          <div
            className="w-full rounded-t-md bg-primary/80"
            style={{ height: `${(d.value / max) * 75}%` }}
          />
          <span className="truncate text-[11px] text-muted-foreground">{d.label}</span>
        </div>
      ))}
    </div>
  );
}

export const AiNotice = () => (
  <div className="flex items-center gap-2 rounded-lg border border-accent bg-accent/15 px-3 py-2 text-sm font-medium">
    <Sparkles className="size-4 text-accent-deep" />
    Conteúdo gerado por IA — requer revisão humana
  </div>
);

export const PlaceholderNote = () => (
  <p className="rounded-lg border border-dashed bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
    Todo o conteúdo linguístico mostrado é placeholder. O conteúdo real em Forro será introduzido e
    validado aqui pela equipa.
  </p>
);

export const fmtDate = (iso: string) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? iso
    : d.toLocaleDateString("pt-PT", { day: "2-digit", month: "short", year: "numeric" });
};
export const fmtDateTime = (iso: string) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? iso
    : d.toLocaleString("pt-PT", {
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      });
};
