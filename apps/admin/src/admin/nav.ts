import {
  Award,
  BarChart3,
  BookOpen,
  ClipboardCheck,
  Crown,
  FileAudio,
  FileText,
  Flag,
  Gamepad2,
  Globe2,
  History,
  LayoutDashboard,
  Layers,
  ListChecks,
  Megaphone,
  MessageSquareText,
  Settings,
  Target,
  Trophy,
  Users,
  Library,
  CheckCircle2,
  XCircle,
  Clock,
} from "lucide-react";
import type { Permission } from "./permissions";

export interface NavItem {
  to: string;
  label: string;
  icon: typeof LayoutDashboard;
  perm: Permission;
  search?: Record<string, string>;
}
export interface NavGroup {
  label?: string;
  items: NavItem[];
}

export const ADMIN_NAV: NavGroup[] = [
  { items: [{ to: "/admin", label: "Dashboard", icon: LayoutDashboard, perm: "dashboard" }] },
  {
    label: "Conteúdo",
    items: [
      { to: "/admin/languages", label: "Línguas", icon: Globe2, perm: "languages.manage" },
      { to: "/admin/courses", label: "Cursos e Unidades", icon: Layers, perm: "content.edit" },
      { to: "/admin/lessons", label: "Lições", icon: BookOpen, perm: "content.edit" },
      { to: "/admin/vocabulary", label: "Vocabulário", icon: Library, perm: "content.edit" },
      { to: "/admin/phrases", label: "Frases", icon: MessageSquareText, perm: "content.edit" },
      { to: "/admin/exercises", label: "Exercícios", icon: ListChecks, perm: "content.edit" },
      { to: "/admin/audios", label: "Áudios", icon: FileAudio, perm: "content.edit" },
    ],
  },
  {
    label: "Revisão",
    items: [
      {
        to: "/admin/review",
        label: "Pendentes",
        icon: Clock,
        perm: "content.review",
        search: { status: "UNDER_REVIEW" },
      },
      {
        to: "/admin/review",
        label: "Aprovados",
        icon: CheckCircle2,
        perm: "content.review",
        search: { status: "APPROVED" },
      },
      {
        to: "/admin/review",
        label: "Rejeitados",
        icon: XCircle,
        perm: "content.review",
        search: { status: "REJECTED" },
      },
    ],
  },
  {
    label: "Produto",
    items: [
      { to: "/admin/users", label: "Utilizadores", icon: Users, perm: "users.view" },
      { to: "/admin/multiplayer", label: "Multiplayer", icon: Gamepad2, perm: "multiplayer.view" },
      { to: "/admin/daily", label: "Desafios", icon: Target, perm: "rewards.manage" },
      { to: "/admin/rankings", label: "Rankings", icon: Trophy, perm: "multiplayer.view" },
      { to: "/admin/achievements", label: "Achievements", icon: Award, perm: "rewards.manage" },
      { to: "/admin/premium", label: "Premium", icon: Crown, perm: "premium.manage" },
      { to: "/admin/ads", label: "Anúncios", icon: Megaphone, perm: "ads.manage" },
      { to: "/admin/reports", label: "Denúncias", icon: Flag, perm: "reports.manage" },
    ],
  },
  {
    label: "Sistema",
    items: [
      { to: "/admin/analytics", label: "Analytics", icon: BarChart3, perm: "analytics.view" },
      { to: "/admin/audit", label: "Audit Log", icon: History, perm: "audit.view" },
      {
        to: "/admin/settings",
        label: "Regras e Configurações",
        icon: Settings,
        perm: "rewards.manage",
      },
    ],
  },
];

/** Permission required for a pathname (longest matching nav prefix). */
export function permissionFor(pathname: string): Permission {
  const items = ADMIN_NAV.flatMap((g) => g.items)
    .filter((i) => i.to !== "/admin" && pathname.startsWith(i.to))
    .sort((a, b) => b.to.length - a.to.length);
  return items[0]?.perm ?? "dashboard";
}

export const unusedIcons = { ClipboardCheck, FileText };
