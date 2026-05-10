import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { LoggerModule } from 'nestjs-pino';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { TenantScopeMiddleware } from './common/middleware/tenant-scope.middleware';
import { generateTraceId, TRACE_ID_HEADER } from './common/utils/trace-id';
import { HealthModule } from './health/health.module';
import { PrismaModule } from './prisma/prisma.module';

@Module({
  imports: [
    LoggerModule.forRoot({
      pinoHttp: {
        level: process.env.LOG_LEVEL ?? 'info',
        genReqId: (req, res) => {
          const incoming = req.headers[TRACE_ID_HEADER.toLowerCase()];
          const traceId =
            (Array.isArray(incoming) ? incoming[0] : incoming) ??
            generateTraceId();
          res.setHeader(TRACE_ID_HEADER, traceId);
          return traceId;
        },
        customProps: (req) => ({ traceId: req.id }),
      },
    }),
    PrismaModule,
    HealthModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(TenantScopeMiddleware).forRoutes('*');
  }
}
