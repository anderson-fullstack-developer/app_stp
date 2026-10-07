import type { AppNotification } from "@/types";
import { personById } from "./users";

const name = (id: string) => personById(id)?.name ?? "Alguém";

export const notifications: AppNotification[] = [
  { id: "n1", icon: "🔥", title: "Não percas a tua sequência.", time: "Agora", read: false },
  { id: "n2", icon: "⚔️", title: `${name("f1")} desafiou-te.`, time: "há 12 min", read: false },
  {
    id: "n3",
    icon: "🏆",
    title: "Subiste no ranking — estás no Top 10.",
    time: "há 2 h",
    read: true,
  },
  {
    id: "n4",
    icon: "🎯",
    title: "O desafio diário está disponível.",
    time: "Hoje, 08:00",
    read: true,
  },
  { id: "n5", icon: "👥", title: `${name("f3")} entrou na app.`, time: "Ontem", read: true },
];
