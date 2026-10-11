import type { INestApplicationContext } from "@nestjs/common";
import { IoAdapter } from "@nestjs/platform-socket.io";
import type { ServerOptions } from "socket.io";

/** Socket.IO com as mesmas origens permitidas (CORS) que a API REST. */
export class ArenaIoAdapter extends IoAdapter {
  constructor(
    app: INestApplicationContext,
    private readonly origins: string[],
  ) {
    super(app);
  }

  override createIOServer(port: number, options?: ServerOptions) {
    return super.createIOServer(port, {
      ...options,
      cors: { origin: this.origins, credentials: true },
      // Mensagens pequenas: limita o tamanho para não aceitar lixo.
      maxHttpBufferSize: 16_000,
    } as ServerOptions);
  }
}
