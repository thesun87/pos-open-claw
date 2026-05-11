import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { MenuSyncController } from './menu-sync.controller';
import { MenuService } from './menu.service';
import { MenuRepository } from './repositories/menu.repository';

@Module({
  imports: [PrismaModule],
  controllers: [MenuSyncController],
  providers: [MenuService, MenuRepository],
})
export class MenuModule {}
