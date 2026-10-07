export const formatDuration = (seconds: number) =>
  `${Math.floor(seconds / 60)}m ${String(seconds % 60).padStart(2, "0")}s`;
