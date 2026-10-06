/**
 * Generic UI state for any data request. Independent of mocks: services return data,
 * screens wrap it in this shape. When the real API arrives nothing here changes.
 */
export type AsyncState<T> =
  | { status: "loading" }
  | { status: "error"; error: string }
  | { status: "offline" }
  | { status: "success"; data: T };

/** Why an action/content is unavailable. */
export type Availability =
  | { kind: "available" }
  | { kind: "disabled"; reason: string }
  | { kind: "locked"; reason: string; unlockHint?: string  | undefined};
