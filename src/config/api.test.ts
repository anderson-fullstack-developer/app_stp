import { describe, expect, it } from "vitest";
import { API_ENDPOINTS, apiUrl } from "./api";

describe("API config", () => {
  it("uses /api/v1 for every resource", () => {
    expect(API_ENDPOINTS.rooms).toBe("/api/v1/rooms");
    expect(Object.values(API_ENDPOINTS).every((p) => p.startsWith("/api/v1/"))).toBe(true);
  });
  it("builds resource URLs with encoded segments", () => {
    expect(apiUrl("lessons", "l 1").endsWith("/api/v1/lessons/l%201")).toBe(true);
  });
});
