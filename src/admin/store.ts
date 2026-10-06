/** In-memory admin data + mock session. Replaced later by NestJS API + Clerk. */
import { useSyncExternalStore } from "react";
import { ROLE_LABEL } from "./permissions";
import { createSeed, type AdminDB } from "@/mocks/admin";
import type { AdminRole, AdminSession } from "./types";

let db: AdminDB | null = null;
let session: AdminSession | null = null;
let sessionLoaded = false;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());
const SESSION_KEY = "lstp-admin-session";

export const getDB = () => (db ??= createSeed());

export function mutate(fn: (d: AdminDB) => Partial<AdminDB>, audit?: { action: string; object: string }) {
  const cur = getDB();
  const patch = fn(cur);
  db = { ...cur, ...patch };
  if (audit && session) {
    db.audit = [{ id: `a${Date.now()}`, admin: session.name, role: session.role, action: audit.action, object: audit.object, at: new Date().toISOString() }, ...db.audit];
  }
  emit();
}

export const resetDB = () => { db = createSeed(); emit(); };

const subscribe = (l: () => void) => { listeners.add(l); return () => listeners.delete(l); };
export const useAdminDB = () => useSyncExternalStore(subscribe, getDB, getDB);

/* ---------- session ---------- */
function loadSession() {
  if (sessionLoaded || typeof window === "undefined") return;
  sessionLoaded = true;
  try { const raw = localStorage.getItem(SESSION_KEY); if (raw) session = JSON.parse(raw); } catch { /* ignore */ }
}

export const adminAuth = {
  login(email: string, role: AdminRole) {
    const name = `${email.split("@")[0] || "admin"} (${ROLE_LABEL[role]})`;
    session = { id: "adm-1", name, email, role, expiresAt: Date.now() + 8 * 3600_000 };
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    emit();
  },
  switchRole(role: AdminRole) { if (!session) return; session = { ...session, role, name: `${session.email.split("@")[0]} (${ROLE_LABEL[role]})` }; localStorage.setItem(SESSION_KEY, JSON.stringify(session)); emit(); },
  expire() { if (!session) return; session = { ...session, expiresAt: 0 }; localStorage.setItem(SESSION_KEY, JSON.stringify(session)); emit(); },
  logout() { session = null; localStorage.removeItem(SESSION_KEY); emit(); },
  get() { loadSession(); return session; },
};

const getSession = () => adminAuth.get();
export const useAdminSession = () => useSyncExternalStore(subscribe, getSession, () => null);
