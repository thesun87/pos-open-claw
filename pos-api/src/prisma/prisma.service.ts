import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { createPrismaClientOptions } from './prisma-client-options';
import { tenantScopeExtension } from './tenant-scope.extension';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly tenantScopedClient: ReturnType<PrismaClient['$extends']>;

  constructor() {
    super(createPrismaClientOptions());
    this.tenantScopedClient = this.$extends(tenantScopeExtension);

    return new Proxy(this, {
      get: (target, property, receiver) => {
        if (property in target) {
          return Reflect.get(target, property, receiver) as unknown;
        }

        const value = Reflect.get(
          this.tenantScopedClient,
          property,
          this.tenantScopedClient,
        );
        if (typeof value === 'function') {
          return (value as (...args: unknown[]) => unknown).bind(
            this.tenantScopedClient,
          );
        }
        return value;
      },
    });
  }

  async onModuleInit(): Promise<void> {
    await this.$connect();
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
