import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PrismaModule } from '../prisma/prisma.module';
import { MenuSyncController } from './menu-sync.controller';
import { MenuService } from './menu.service';
import { MenuRepository } from './repositories/menu.repository';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [MenuSyncController],
  providers: [MenuService, MenuRepository],
})
export class MenuModule {}
