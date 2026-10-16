import { Inject, Injectable } from "@nestjs/common";
import { ENV, type Env } from "../config/env.js";

/**
 * Os áudios gravados na app guardam um caminho relativo (/api/v1/media/audio/…); aqui
 * passam a endereço completo antes de irem para os clientes. Assim, mudar o domínio da
 * API não estraga os links já guardados. Links externos (Lingua Libre) passam tal e qual.
 */
@Injectable()
export class MediaUrls {
  private readonly base: string;

  constructor(@Inject(ENV) env: Env) {
    this.base = (env.PUBLIC_API_URL ?? `http://localhost:${env.PORT}`).replace(/\/+$/, "");
  }

  abs(url: string): string {
    return url.startsWith("/") ? `${this.base}${url}` : url;
  }

  /** Caminho público de um áudio aprovado. */
  static audioPath(storageKey: string): string {
    return `/api/v1/media/audio/${storageKey}`;
  }
}
