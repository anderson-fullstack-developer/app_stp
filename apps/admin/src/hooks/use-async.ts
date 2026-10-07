import { useCallback, useEffect, useRef, useState } from "react";
import type { AsyncState } from "@stp/types/async";
import { useOnline } from "./use-online";

/**
 * Runs a service call and exposes loading / error / offline / success.
 * Pass any service function — the hook knows nothing about mocks.
 */
export function useAsync<T>(fn: () => Promise<T>, deps: unknown[] = []) {
  const online = useOnline();
  const [state, setState] = useState<AsyncState<T>>({ status: "loading" });
  const fnRef = useRef(fn);
  fnRef.current = fn;

  const run = useCallback(async () => {
    if (typeof navigator !== "undefined" && !navigator.onLine)
      return setState({ status: "offline" });
    setState({ status: "loading" });
    try {
      setState({ status: "success", data: await fnRef.current() });
    } catch (e) {
      setState({ status: "error", error: e instanceof Error ? e.message : "Algo correu mal." });
    }
  }, []);

  useEffect(() => {
    void run();
  }, [run, online, ...deps]);

  return { state, retry: run };
}
