import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { BackButton } from "@/components/app/BackButton";
import { AppButton } from "@/components/app/Buttons";
import { AppHeader, PhoneFrame } from "@/layouts/AppShell";
import { cn } from "@/lib/utils";
import { multiplayerService } from "@/services/game.service";

export const Route = createFileRoute("/play/join")({
  head: () => ({
    meta: [
      { title: "Entrar com código — Língua STP" },
      { name: "description", content: "Introduz o código da sala para jogar com amigos." },
      { property: "og:title", content: "Entrar com código — Língua STP" },
      { property: "og:description", content: "Junta-te a uma sala privada." },
    ],
  }),
  component: Join,
});

const ERRORS = { invalid: "Código inválido", full: "Sala cheia", started: "A partida já começou" } as const;

function Join() {
  const navigate = useNavigate();
  const [digits, setDigits] = useState("");
  const [state, setState] = useState<"idle" | "loading" | keyof typeof ERRORS>("idle");
  const submit = async () => {
    setState("loading");
    const code = `STP${digits}`;
    const r = await multiplayerService.joinPrivateRoom(code);
    if (r.ok) navigate({ to: "/play/private", search: { code } });
    else setState(r.reason);
  };
  const error = state !== "idle" && state !== "loading" ? ERRORS[state] : null;
  return (
    <PhoneFrame>
      <AppHeader left={<BackButton />} title="Entrar com código" />
      <main className="flex flex-1 flex-col gap-4 px-5 pb-6">
        <label htmlFor="room-code" className="mt-6 text-center font-display text-xl font-extrabold">Código da sala</label>
        <div className={cn("mx-auto flex items-center rounded-2xl border-2 bg-surface px-4 font-display text-4xl font-extrabold tracking-[0.2em]", error ? "border-destructive animate-shake" : "border-border")}>
          <span className="text-muted-foreground">STP</span>
          <input id="room-code" inputMode="numeric" autoFocus maxLength={3} value={digits} placeholder="___"
            onChange={(e) => { setDigits(e.target.value.replace(/\D/g, "").slice(0, 3)); setState("idle"); }}
            className="h-16 w-28 bg-transparent outline-none placeholder:text-muted-foreground/40" />
        </div>
        <p className={cn("min-h-6 text-center font-bold", error ? "text-destructive" : "text-muted-foreground")} role="status">
          {state === "loading" ? "A entrar…" : error ?? "Pede o código ao host da sala."}
        </p>
        <p className="text-center text-xs font-semibold text-muted-foreground">Demo: STP999 = sala cheia · STP111 = já começou</p>
        <div className="mt-auto"><AppButton onClick={submit} disabled={digits.length !== 3 || state === "loading"}>{state === "loading" ? "A entrar…" : "Entrar"}</AppButton></div>
      </main>
    </PhoneFrame>
  );
}
