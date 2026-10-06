import type { GameRoom } from "@/types";
import { currentUser, personById } from "./users";

const seat = (id: string, score: number) => {
  const p = personById(id)!;
  return { id: p.id, name: p.name, avatarColor: p.color, ready: true, score };
};

export const sampleRoom: GameRoom = {
  id: "r1", code: "STP847", maxPlayers: 10, questions: 10, secondsPerQuestion: 10, mode: "normal",
  players: [
    { id: currentUser.id, name: currentUser.name, avatarColor: currentUser.avatarColor, isHost: true, ready: true, score: 420 },
    seat("f1", 450), seat("f2", 390), seat("f4", 360),
  ],
};
