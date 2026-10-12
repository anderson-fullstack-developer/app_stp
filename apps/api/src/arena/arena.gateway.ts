import { Logger } from "@nestjs/common";
import {
  ConnectedSocket,
  MessageBody,
  type OnGatewayConnection,
  type OnGatewayDisconnect,
  type OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
} from "@nestjs/websockets";
import type { Namespace, Socket } from "socket.io";
import { z } from "zod";
import { ArenaAuthService } from "./arena-auth.service.js";
import { ArenaError, type ArenaIdentity, ArenaService } from "./arena.service.js";
import type { Ack, AnswerAck } from "./arena.types.js";

const CreateBody = z.object({
  mode: z.enum(["survival", "teams"]).optional(),
  languageId: z
    .string()
    .regex(/^[a-z][a-z0-9_-]{1,40}$/)
    .optional(),
  config: z
    .object({ players: z.number().int(), lives: z.number().int(), seconds: z.number().int() })
    .partial()
    .optional(),
});
const JoinBody = z.object({ code: z.string().trim().min(4).max(12) });
const ReadyBody = z.object({ ready: z.boolean() });
const TeamBody = z.object({ team: z.enum(["A", "B"]) });
const InviteBody = z.object({ userId: z.uuid() });
const ChallengeBody = z.object({
  userId: z.uuid(),
  languageId: z
    .string()
    .regex(/^[a-z][a-z0-9_-]{1,40}$/)
    .optional(),
});
const AnswerBody = z.object({ questionId: z.string().max(80), optionId: z.string().max(80) });

type ArenaSocket = Socket & { data: { identity?: ArenaIdentity } };

/**
 * Arena em tempo real (namespace /arena). O cliente só envia intenções (criar/entrar,
 * pronto, começar, opção escolhida); tudo o resto é decidido e enviado pelo servidor.
 */
@WebSocketGateway({ namespace: "/arena" })
export class ArenaGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(ArenaGateway.name);
  private server!: Namespace;

  constructor(
    private readonly arena: ArenaService,
    private readonly auth: ArenaAuthService,
  ) {}

  afterInit(server: Namespace) {
    this.server = server;
    this.arena.setEmitter((target, event, payload) => {
      const room = "room" in target ? target.room : `user:${target.user}`;
      this.server.to(room).emit(event, payload);
    });
  }

  async handleConnection(socket: ArenaSocket) {
    try {
      const token = (socket.handshake.auth as { token?: unknown } | undefined)?.token;
      const identity = await this.auth.authenticate(typeof token === "string" ? token : undefined);
      if (!identity) {
        socket.emit("arena:error", { code: "UNAUTHORIZED", message: "Sessão inválida." });
        socket.disconnect(true);
        return;
      }
      socket.data.identity = identity;
      await socket.join(`user:${identity.userId}`);
      // Se já estava numa sala (reconexão), volta a ouvir os eventos dela.
      const room = this.arena.socketRoomOf(identity.userId);
      if (room) await socket.join(room);
      // Só agora o cliente pode enviar pedidos (a sessão já foi validada).
      socket.emit("arena:ready", { userId: identity.userId, inRoom: Boolean(room) });
    } catch (e) {
      this.logger.warn({ err: e }, "Ligação à Arena recusada");
      socket.disconnect(true);
    }
  }

  async handleDisconnect(socket: ArenaSocket) {
    const id = socket.data.identity?.userId;
    if (!id) return;
    // Só conta como desligado se não houver outro separador ligado.
    const others = await this.server.in(`user:${id}`).fetchSockets();
    if (others.length === 0) this.arena.disconnected(id);
  }

  @SubscribeMessage("room:create")
  create(@ConnectedSocket() socket: ArenaSocket, @MessageBody() body: unknown) {
    return this.run(socket, async (who) => {
      const input = CreateBody.parse(body ?? {});
      const room = await this.arena.createRoom(who, {
        ...(input.languageId ? { languageId: input.languageId } : {}),
        ...(input.config ? { config: input.config } : {}),
        ...(input.mode ? { mode: input.mode } : {}),
      });
      await this.joinSocketRoom(socket, who.userId);
      return { room };
    });
  }

  @SubscribeMessage("room:join")
  join(@ConnectedSocket() socket: ArenaSocket, @MessageBody() body: unknown) {
    return this.run(socket, async (who) => {
      const room = this.arena.joinRoom(who, JoinBody.parse(body).code);
      await this.joinSocketRoom(socket, who.userId);
      return { room };
    });
  }

  @SubscribeMessage("room:leave")
  leave(@ConnectedSocket() socket: ArenaSocket) {
    return this.run(socket, async (who) => {
      const room = this.arena.socketRoomOf(who.userId);
      this.arena.leave(who.userId);
      if (room) await this.server.in(`user:${who.userId}`).socketsLeave(room);
      return {};
    });
  }

  @SubscribeMessage("room:ready")
  ready(@ConnectedSocket() socket: ArenaSocket, @MessageBody() body: unknown) {
    return this.run(socket, async (who) => ({
      room: this.arena.setReady(who.userId, ReadyBody.parse(body).ready),
    }));
  }

  @SubscribeMessage("room:invite")
  invite(@ConnectedSocket() socket: ArenaSocket, @MessageBody() body: unknown) {
    return this.run(socket, async (who) => {
      await this.arena.invite(who, InviteBody.parse(body).userId);
      return {};
    });
  }

  @SubscribeMessage("duel:challenge")
  challenge(@ConnectedSocket() socket: ArenaSocket, @MessageBody() body: unknown) {
    return this.run(socket, async (who) => {
      const input = ChallengeBody.parse(body);
      const room = await this.arena.challenge(who, input.userId, input.languageId);
      await this.joinSocketRoom(socket, who.userId);
      return { room };
    });
  }

  @SubscribeMessage("room:team")
  team(@ConnectedSocket() socket: ArenaSocket, @MessageBody() body: unknown) {
    return this.run(socket, async (who) => ({
      room: this.arena.setTeam(who.userId, TeamBody.parse(body).team),
    }));
  }

  @SubscribeMessage("room:start")
  start(@ConnectedSocket() socket: ArenaSocket) {
    return this.run(socket, async (who) => {
      await this.arena.start(who.userId);
      return {};
    });
  }

  @SubscribeMessage("room:resync")
  resync(@ConnectedSocket() socket: ArenaSocket) {
    return this.run(socket, async (who) => {
      const state = this.arena.resync(who.userId);
      if (state) await this.joinSocketRoom(socket, who.userId);
      return { state };
    });
  }

  @SubscribeMessage("match:answer")
  answer(@ConnectedSocket() socket: ArenaSocket, @MessageBody() body: unknown): AnswerAck {
    const who = socket.data.identity;
    const parsed = AnswerBody.safeParse(body);
    if (!who || !parsed.success) return { accepted: false, reason: "not_in_match" };
    return this.arena.answer(who.userId, parsed.data);
  }

  private async joinSocketRoom(socket: ArenaSocket, userId: string) {
    const room = this.arena.socketRoomOf(userId);
    if (!room) return;
    // Todos os separadores da pessoa passam a ouvir a sala.
    await this.server.in(`user:${userId}`).socketsJoin(room);
    await socket.join(room);
  }

  /** Executa uma ação e responde sempre com { ok, ... } (nunca rebenta a ligação). */
  private async run<T extends object>(
    socket: ArenaSocket,
    fn: (who: ArenaIdentity) => Promise<T>,
  ): Promise<Ack<T>> {
    const who = socket.data.identity;
    if (!who) return { ok: false, code: "UNAUTHORIZED", message: "Sessão inválida." };
    try {
      return { ok: true, ...(await fn(who)) };
    } catch (e) {
      if (e instanceof ArenaError) return { ok: false, code: e.code, message: e.message };
      if (e instanceof z.ZodError) {
        return { ok: false, code: "INVALID_INPUT", message: "Pedido inválido." };
      }
      this.logger.error({ err: e }, "Erro na Arena");
      return { ok: false, code: "INTERNAL", message: "Ocorreu um erro. Tenta outra vez." };
    }
  }
}
