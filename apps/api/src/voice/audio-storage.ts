import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve, sep } from "node:path";
import { Inject, Injectable } from "@nestjs/common";
import { ENV, type Env } from "../config/env.js";

/**
 * Onde ficam os ficheiros de áudio das gravações. Hoje: uma pasta local (desenvolvimento).
 * Mais tarde: Cloudflare R2 — basta outra implementação destes três métodos.
 */
@Injectable()
export class AudioStorage {
  private readonly root: string;
  readonly mode: "local" | "none";

  constructor(@Inject(ENV) env: Env) {
    this.mode = env.AUDIO_STORAGE ?? (env.NODE_ENV === "production" ? "none" : "local");
    this.root = resolve(env.AUDIO_STORAGE_DIR);
  }

  get enabled() {
    return this.mode !== "none";
  }

  async put(key: string, data: Buffer): Promise<void> {
    const file = this.path(key);
    await mkdir(dirname(file), { recursive: true });
    await writeFile(file, data);
  }

  async get(key: string): Promise<Buffer | null> {
    try {
      return await readFile(this.path(key));
    } catch {
      return null;
    }
  }

  /** Caminho dentro da pasta (nunca fora dela, mesmo com chaves estranhas). */
  private path(key: string): string {
    if (!/^[a-z0-9/_.-]+$/i.test(key) || key.includes("..")) throw new Error("Chave inválida");
    const file = resolve(this.root, key);
    if (!file.startsWith(this.root + sep)) throw new Error("Chave inválida");
    return file;
  }
}
