import { describe, expect, it } from "vitest";
import { can } from "@/admin/permissions";
import { createSeed } from "@/mocks/admin";
import { applyReview, canPerform, isLiveInApp, suggestQuizzes } from "@/admin/workflow";

const draft = () => ({ ...createSeed().vocabulary.find((w) => w.status === "DRAFT")! });

describe("admin roles", () => {
  it("content editor can create but not publish", () => {
    expect(can("CONTENT_EDITOR", "content.edit")).toBe(true);
    expect(canPerform("CONTENT_EDITOR", "APPROVE", "UNDER_REVIEW")).toBe(false);
  });
  it("linguist can approve content under review", () => {
    expect(canPerform("LINGUIST", "APPROVE", "UNDER_REVIEW")).toBe(true);
  });
  it("moderator manages users/reports/multiplayer but not content", () => {
    expect(can("MODERATOR", "users.moderate")).toBe(true);
    expect(can("MODERATOR", "reports.manage")).toBe(true);
    expect(can("MODERATOR", "content.edit")).toBe(false);
  });
});

describe("review workflow", () => {
  it("draft → under review → approved; only approved is live", () => {
    const sub = applyReview(draft(), "SUBMIT", { name: "Editor", role: "CONTENT_EDITOR" });
    expect(sub.status).toBe("UNDER_REVIEW");
    expect(isLiveInApp(sub)).toBe(false);
    const ok = applyReview(sub, "APPROVE", { name: "Rui", role: "LINGUIST" });
    expect(ok.status).toBe("APPROVED");
    expect(ok.reviewer).toBe("Rui");
    expect(isLiveInApp(ok)).toBe(true);
  });
  it("AI suggestions are always DRAFT and flagged", () => {
    const s = suggestQuizzes(createSeed().vocabulary);
    expect(s.length).toBeGreaterThan(0);
    expect(s.every((x) => x.status === "DRAFT" && x.aiGenerated)).toBe(true);
  });
});
