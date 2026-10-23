import { type DynamicModule, Module } from "@nestjs/common";
import { APP_FILTER, APP_GUARD } from "@nestjs/core";
import { ThrottlerGuard, ThrottlerModule } from "@nestjs/throttler";
import { LoggerModule } from "nestjs-pino";
import { ClerkService } from "./auth/clerk.service.js";
import { ReviewController } from "./content/review.controller.js";
import { ReviewService } from "./content/review.service.js";
import { CoursesController } from "./courses/courses.controller.js";
import { CoursesService } from "./courses/courses.service.js";
import { DailyController } from "./daily/daily.controller.js";
import { DailyService } from "./daily/daily.service.js";
import { NotificationsService } from "./social/notifications.service.js";
import { RankingService } from "./social/ranking.service.js";
import { AdminContentService } from "./admin/admin-content.service.js";
import { AdminInsightsController } from "./admin/admin-insights.controller.js";
import { AdminInsightsService } from "./admin/admin-insights.service.js";
import { AdminCoursesController } from "./admin/admin-courses.controller.js";
import { AdminCoursesService } from "./admin/admin-courses.service.js";
import { ArenaAuthService } from "./arena/arena-auth.service.js";
import { ArenaController } from "./arena/arena.controller.js";
import { ArenaGateway } from "./arena/arena.gateway.js";
import { ARENA_TIMINGS, ArenaService, DEFAULT_ARENA_TIMINGS } from "./arena/arena.service.js";
import { AdminUsersService } from "./admin/admin-users.service.js";
import { AdminController } from "./admin/admin.controller.js";
import { ShopController } from "./shop/shop.controller.js";
import { ShopService } from "./shop/shop.service.js";
import { SocialController } from "./social/social.controller.js";
import { SocialService } from "./social/social.service.js";
import { LessonsController } from "./lessons/lessons.controller.js";
import { LessonsService } from "./lessons/lessons.service.js";
import { AllExceptionsFilter } from "./common/all-exceptions.filter.js";
import { ENV, type Env } from "./config/env.js";
import { DatabaseModule } from "./database/database.module.js";
import { HealthController } from "./health/health.controller.js";
import { LanguagesController } from "./languages/languages.controller.js";
import { LanguagesService } from "./languages/languages.service.js";
import { ProgressService } from "./progress/progress.service.js";
import { MeController } from "./users/me.controller.js";
import { UsersService } from "./users/users.service.js";
import { ClerkWebhookController } from "./webhooks/clerk-webhook.controller.js";
import { AudioStorage } from "./voice/audio-storage.js";
import { MediaController } from "./voice/media.controller.js";
import { MediaUrls } from "./voice/media-urls.js";
import { VoiceController } from "./voice/voice.controller.js";
import { VoiceAdminService } from "./voice/voice-admin.service.js";
import { VoiceService } from "./voice/voice.service.js";

/**
 * Módulo raiz. Recebe a configuração já validada (main.ts ou testes), para que cada
 * teste possa arrancar a API com a sua própria configuração.
 */
@Module({})
export class AppModule {
  static register(env: Env): DynamicModule {
    return {
      module: AppModule,
      global: true,
      imports: [
        LoggerModule.forRoot({
          pinoHttp: {
            level: env.NODE_ENV === "test" ? "silent" : env.LOG_LEVEL,
            // Nunca registar segredos nem dados de autenticação.
            redact: ["req.headers.authorization", "req.headers.cookie"],
            transport:
              env.NODE_ENV === "development"
                ? { target: "pino-pretty", options: { singleLine: true } }
                : undefined,
          },
        }),
        ThrottlerModule.forRoot([{ ttl: 60_000, limit: env.RATE_LIMIT_PER_MINUTE }]),
        DatabaseModule,
      ],
      controllers: [
        HealthController,
        LanguagesController,
        MeController,
        ClerkWebhookController,
        CoursesController,
        ReviewController,
        LessonsController,
        DailyController,
        SocialController,
        ShopController,
        AdminController,
        AdminCoursesController,
        AdminInsightsController,
        ArenaController,
        VoiceController,
        MediaController,
      ],
      providers: [
        { provide: ENV, useValue: env },
        LanguagesService,
        UsersService,
        ClerkService,
        ProgressService,
        CoursesService,
        ReviewService,
        LessonsService,
        DailyService,
        SocialService,
        RankingService,
        NotificationsService,
        ShopService,
        AdminContentService,
        AdminUsersService,
        AdminCoursesService,
        AdminInsightsService,
        ArenaService,
        ArenaAuthService,
        ArenaGateway,
        AudioStorage,
        MediaUrls,
        VoiceService,
        VoiceAdminService,
        { provide: ARENA_TIMINGS, useValue: DEFAULT_ARENA_TIMINGS },
        { provide: APP_GUARD, useClass: ThrottlerGuard },
        { provide: APP_FILTER, useClass: AllExceptionsFilter },
      ],
      exports: [ENV],
    };
  }
}
