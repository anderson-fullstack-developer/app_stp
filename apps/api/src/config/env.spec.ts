import { InvalidEnvError, loadEnv } from "./env.js";

describe("loadEnv", () => {
  it("usa valores por omissão seguros", () => {
    const env = loadEnv({});
    expect(env.NODE_ENV).toBe("development");
    expect(env.PORT).toBe(3000);
    expect(env.CORS_ORIGINS).toEqual(["http://localhost:8080"]);
    expect(env.RATE_LIMIT_PER_MINUTE).toBe(120);
    expect(env.SENTRY_DSN).toBeUndefined();
  });

  it("aceita várias origens CORS separadas por vírgula", () => {
    const env = loadEnv({ CORS_ORIGINS: "https://admin.exemplo.st, http://localhost:8080" });
    expect(env.CORS_ORIGINS).toEqual(["https://admin.exemplo.st", "http://localhost:8080"]);
  });

  it("trata SENTRY_DSN vazio como não definido", () => {
    expect(loadEnv({ SENTRY_DSN: "" }).SENTRY_DSN).toBeUndefined();
  });

  it("recusa configuração inválida e diz exatamente o que está mal", () => {
    expect(() => loadEnv({ PORT: "abc", NODE_ENV: "prod", CORS_ORIGINS: "não-é-url" })).toThrow(
      InvalidEnvError,
    );
    try {
      loadEnv({ PORT: "abc" });
    } catch (e) {
      expect((e as InvalidEnvError).issues.some((i) => i.startsWith("PORT"))).toBe(true);
    }
  });
});
