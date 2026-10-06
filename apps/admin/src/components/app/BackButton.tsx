import { useRouter } from "@tanstack/react-router";
import { ArrowLeft, X } from "lucide-react";

export function BackButton({ close }: { close?: boolean }) {
  const router = useRouter();
  const Icon = close ? X : ArrowLeft;
  return (
    <button onClick={() => router.history.back()} aria-label={close ? "Fechar" : "Voltar"} className="pressable grid size-10 place-items-center rounded-full text-muted-foreground hover:bg-muted">
      <Icon className="size-6" strokeWidth={2.5} />
    </button>
  );
}
