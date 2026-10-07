import { type Actor, decideReview, hasRole, type ReviewTarget } from "./review-rules.js";

const author: Actor = {
  id: "autor",
  roles: [{ role: "CONTENT_EDITOR", languageId: "kabuverdianu" }],
};
const linguist: Actor = { id: "ling", roles: [{ role: "LINGUIST", languageId: "kabuverdianu" }] };
const otherLinguist: Actor = {
  id: "ling-forro",
  roles: [{ role: "LINGUIST", languageId: "forro" }],
};
const superAdmin: Actor = { id: "sa", roles: [{ role: "SUPER_ADMIN", languageId: null }] };
const user: Actor = { id: "u", roles: [{ role: "USER", languageId: null }] };

const target = (o: Partial<ReviewTarget> = {}): ReviewTarget => ({
  status: "DRAFT",
  createdById: "autor",
  languageId: "kabuverdianu",
  ...o,
});

describe("regras de revisão", () => {
  it("o autor submete; utilizadores comuns não", () => {
    expect(decideReview("submit", target(), author)).toMatchObject({
      ok: true,
      to: "UNDER_REVIEW",
    });
    expect(decideReview("submit", target({ createdById: "x" }), user)).toMatchObject({
      ok: false,
      code: "FORBIDDEN_ROLE",
    });
  });

  it("quem cria nunca aprova — nem sendo super administrador", () => {
    const review = target({ status: "UNDER_REVIEW" });
    expect(decideReview("approve", review, author)).toMatchObject({
      ok: false,
      code: "AUTHOR_CANNOT_REVIEW",
    });
    const ownBySuperAdmin = target({ status: "UNDER_REVIEW", createdById: "sa" });
    expect(decideReview("approve", ownBySuperAdmin, superAdmin)).toMatchObject({
      ok: false,
      code: "AUTHOR_CANNOT_REVIEW",
    });
    expect(decideReview("approve", review, linguist)).toMatchObject({
      ok: true,
      to: "APPROVED",
      log: "APPROVED",
    });
    expect(decideReview("approve", review, superAdmin)).toMatchObject({ ok: true });
  });

  it("linguistas só reveem a sua língua", () => {
    expect(hasRole(otherLinguist, "LINGUIST", "kabuverdianu")).toBe(false);
    expect(
      decideReview("approve", target({ status: "UNDER_REVIEW" }), otherLinguist),
    ).toMatchObject({
      ok: false,
      code: "FORBIDDEN_ROLE",
    });
  });

  it("transições inválidas e pedidos de alteração", () => {
    expect(decideReview("approve", target({ status: "DRAFT" }), linguist)).toMatchObject({
      ok: false,
      code: "INVALID_TRANSITION",
    });
    expect(
      decideReview("request_changes", target({ status: "UNDER_REVIEW" }), linguist),
    ).toMatchObject({
      ok: true,
      to: "DRAFT",
      log: "CHANGES_REQUESTED",
    });
    expect(decideReview("submit", target({ status: "REJECTED" }), author)).toMatchObject({
      ok: true,
    });
  });

  it("só administradores arquivam conteúdo aprovado", () => {
    expect(decideReview("archive", target({ status: "APPROVED" }), linguist)).toMatchObject({
      ok: false,
    });
    expect(decideReview("archive", target({ status: "APPROVED" }), superAdmin)).toMatchObject({
      ok: true,
      to: "ARCHIVED",
    });
  });
});
