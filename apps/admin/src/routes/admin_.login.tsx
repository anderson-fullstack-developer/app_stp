import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { AuthScreen } from "@/admin/AuthScreen";
import { ROLE_LABEL } from "@/admin/permissions";
import { adminAuth } from "@/services/admin";
import type { AdminRole } from "@/admin/types";
import { Field, Select, TextInput } from "@/admin/ui";
import { APP_NAME } from "@stp/config";

export const Route = createFileRoute("/admin_/login")({
  head: () => ({
    meta: [
      { title: `Entrar no Admin — ${APP_NAME}` },
      { name: "description", content: `Acesso reservado à equipa da ${APP_NAME}.` },
      { property: "og:title", content: `Entrar no Admin — ${APP_NAME}` },
      { property: "og:description", content: "Acesso reservado à equipa." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminLogin,
});

function AdminLogin() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("admin@linguastp.st");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<AdminRole>("SUPER_ADMIN");
  const [loading, setLoading] = useState(false);
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    await new Promise((r) => setTimeout(r, 400));
    adminAuth.login(email, role);
    navigate({ to: "/admin" });
  };
  return (
    <AuthScreen
      title="Entrar no painel"
      text="Autenticação de demonstração. O login real será feito com Clerk."
    >
      <form onSubmit={submit} className="space-y-4">
        <Field label="Email">
          <TextInput
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </Field>
        <Field label="Palavra-passe">
          <TextInput
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Qualquer valor (demo)"
          />
        </Field>
        <Field label="Perfil (demo)">
          <Select<AdminRole>
            value={role}
            onChange={setRole}
            options={(Object.keys(ROLE_LABEL) as AdminRole[]).map((r) => ({
              value: r,
              label: `${ROLE_LABEL[r]} · ${r}`,
            }))}
          />
        </Field>
        <button
          type="submit"
          disabled={loading}
          className="h-10 w-full rounded-lg bg-primary text-sm font-semibold text-primary-foreground hover:bg-primary-deep disabled:opacity-60"
        >
          {loading ? "A entrar…" : "Entrar"}
        </button>
      </form>
    </AuthScreen>
  );
}
