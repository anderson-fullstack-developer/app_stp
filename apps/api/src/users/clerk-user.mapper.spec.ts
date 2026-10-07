import { displayName, fromWebhook, parseOnboarding, usernameBase } from "./clerk-user.mapper.js";

describe("conversão de utilizadores do Clerk", () => {
  it("lê as escolhas do onboarding e ignora valores inválidos", () => {
    expect(
      parseOnboarding({
        countryCode: "cv",
        spokenLanguages: ["pt", "kea"],
        uiLocale: "en",
        learningLanguageId: "kabuverdianu",
      }),
    ).toEqual({
      countryCode: "cv",
      spokenLanguages: ["pt", "kea"],
      uiLocale: "en",
      learningLanguageId: "kabuverdianu",
    });
    const bad = parseOnboarding({ countryCode: "<script>", uiLocale: "xx", spokenLanguages: "pt" });
    expect(bad.countryCode).toBeUndefined();
    expect(bad.uiLocale).toBeUndefined();
    expect(bad.spokenLanguages).toBeUndefined();
    expect(parseOnboarding(null)).toEqual({});
    expect(parseOnboarding("lixo")).toEqual({});
  });

  it("gera um username seguro", () => {
    expect(usernameBase({ username: null, email: "João.Silva+x@mail.com" })).toBe("joao.silvax");
    expect(usernameBase({ username: "Ana_CV", email: null })).toBe("ana_cv");
    expect(usernameBase({ username: null, email: "a@b.c" }).length).toBeGreaterThanOrEqual(4);
  });

  it("nome a mostrar: nome completo ou parte local do email", () => {
    expect(displayName({ firstName: "Maria", lastName: "Lopes", email: null })).toBe("Maria Lopes");
    expect(displayName({ firstName: null, lastName: null, email: "rosa@x.cv" })).toBe("rosa");
  });

  it("usa o email principal do webhook", () => {
    const u = fromWebhook({
      id: "user_1",
      email_addresses: [
        { id: "e1", email_address: "outro@x.com" },
        { id: "e2", email_address: "Principal@X.com" },
      ],
      primary_email_address_id: "e2",
    });
    expect(u.email).toBe("principal@x.com");
  });
});
