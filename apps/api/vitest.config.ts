import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    root: "./",
    include: ["src/**/*.spec.ts", "test/**/*.e2e-spec.ts"],
    // Os testes e2e partilham a mesma base de dados real (Neon): um ficheiro de cada vez
    // evita disputas artificiais por ligações e tempos que não existem em produção.
    fileParallelism: false,
  },
});
