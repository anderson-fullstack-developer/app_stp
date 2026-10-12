/**
 * Arena na web: liga o cliente partilhado (@stp/arena-client) ao Clerk e ao React.
 * O cliente só mostra o que o servidor envia e manda intenções.
 */
import { useAuth } from "@clerk/tanstack-react-start";
import {
  type ArenaMatchState,
  type ArenaState,
  createArenaClient,
  INITIAL_ARENA_STATE,
} from "@stp/arena-client";
import { useEffect, useSyncExternalStore } from "react";
import { API_BASE_URL, SOCKET_URL } from "@/config/api";

export type { ArenaMatchState, ArenaState };

/** Um cliente por separador (a ligação é criada só quando um ecrã da Arena a pede). */
export const arena = createArenaClient({
  baseUrl: SOCKET_URL || API_BASE_URL,
  getToken: async () => null,
});

/** Liga à Arena enquanto houver sessão; devolve o estado ao vivo. */
export function useArena(enabled: boolean): ArenaState {
  const { getToken, isSignedIn } = useAuth();
  useEffect(() => {
    arena.setTokenGetter(() => getToken());
  }, [getToken]);
  useEffect(() => {
    if (enabled && isSignedIn) arena.connect();
  }, [enabled, isSignedIn]);
  return useSyncExternalStore(arena.subscribe, arena.getState, () => INITIAL_ARENA_STATE);
}
