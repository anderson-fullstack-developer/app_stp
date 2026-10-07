import { visibleContentStatuses } from "./visibility.js";

describe("visibilidade de conteúdo", () => {
  it("língua ativa: só conteúdo aprovado", () => {
    expect(visibleContentStatuses("ACTIVE")).toEqual(["APPROVED"]);
  });
  it("língua Beta: aprovado e rascunhos, nunca rejeitado nem arquivado", () => {
    const s = visibleContentStatuses("BETA");
    expect(s).toContain("DRAFT");
    expect(s).not.toContain("REJECTED");
    expect(s).not.toContain("ARCHIVED");
  });
  it("línguas em breve ou inativas: nada", () => {
    expect(visibleContentStatuses("COMING_SOON")).toEqual([]);
    expect(visibleContentStatuses("INACTIVE")).toEqual([]);
  });
});
