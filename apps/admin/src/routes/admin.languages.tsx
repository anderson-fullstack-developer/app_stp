import { createFileRoute } from "@tanstack/react-router";
import { Plus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useAdminDB } from "@/services/admin";
import type { AdminLanguage, LanguageStatus } from "@/admin/types";
import {
  Btn,
  Drawer,
  Field,
  PageHeader,
  Select,
  StatusBadge,
  TextArea,
  TextInput,
} from "@/admin/ui";
import { adminLanguageService } from "@/services/admin";

export const Route = createFileRoute("/admin/languages")({
  head: () => ({
    meta: [
      { title: "Línguas — Admin Língua STP" },
      { name: "description", content: "Gestão das línguas ensinadas na app." },
    ],
  }),
  component: Languages,
});

function Languages() {
  const db = useAdminDB();
  const [edit, setEdit] = useState<AdminLanguage | null>(null);
  return (
    <>
      <PageHeader
        title="Línguas"
        actions={
          <Btn
            onClick={() =>
              setEdit({
                id: `lang${Date.now()}`,
                name: "",
                altName: "",
                code: "",
                description: "",
                image: "",
                status: "EM PREPARAÇÃO",
              })
            }
          >
            <Plus className="size-4" />
            Nova língua
          </Btn>
        }
      />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {db.languages.map((l) => (
          <button
            key={l.id}
            type="button"
            onClick={() => setEdit(l)}
            className="rounded-xl border bg-surface p-5 text-left transition-colors hover:border-primary"
          >
            <div className="flex items-start justify-between">
              <span className="rounded-md bg-muted px-2 py-0.5 font-mono text-xs">{l.code}</span>
              <StatusBadge status={l.status} />
            </div>
            <p className="mt-3 text-lg font-bold">{l.name}</p>
            <p className="text-sm text-muted-foreground">{l.altName}</p>
            <p className="mt-2 text-sm">{l.description}</p>
            <p className="mt-3 text-xs text-muted-foreground">
              {db.vocabulary.filter((w) => w.languageId === l.id).length} palavras ·{" "}
              {db.courses.filter((c) => c.languageId === l.id).length} cursos
            </p>
          </button>
        ))}
      </div>
      {edit && <LangDrawer key={edit.id} l={edit} onClose={() => setEdit(null)} />}
    </>
  );
}

function LangDrawer({ l, onClose }: { l: AdminLanguage; onClose: () => void }) {
  const [f, setF] = useState(l);
  const set = <K extends keyof AdminLanguage>(k: K, v: AdminLanguage[K]) => setF({ ...f, [k]: v });
  return (
    <Drawer
      open
      onClose={onClose}
      title={l.name || "Nova língua"}
      footer={
        <Btn
          disabled={!f.name || !f.code}
          onClick={async () => {
            await adminLanguageService.save(f);
            toast.success("Língua guardada");
            onClose();
          }}
        >
          Guardar
        </Btn>
      }
    >
      <Field label="Nome">
        <TextInput value={f.name} onChange={(e) => set("name", e.target.value)} />
      </Field>
      <Field label="Nome alternativo">
        <TextInput value={f.altName} onChange={(e) => set("altName", e.target.value)} />
      </Field>
      <Field label="Código">
        <TextInput
          value={f.code}
          maxLength={5}
          onChange={(e) => set("code", e.target.value.toUpperCase())}
        />
      </Field>
      <Field label="Descrição">
        <TextArea value={f.description} onChange={(e) => set("description", e.target.value)} />
      </Field>
      <Field label="Imagem (URL)" hint="Futuramente carregada para Cloudinary.">
        <TextInput
          value={f.image}
          onChange={(e) => set("image", e.target.value)}
          placeholder="https://…"
        />
      </Field>
      <Field label="Status">
        <Select<LanguageStatus>
          value={f.status}
          onChange={(v) => set("status", v)}
          options={["ATIVO", "EM PREPARAÇÃO", "INATIVO"]}
        />
      </Field>
    </Drawer>
  );
}
