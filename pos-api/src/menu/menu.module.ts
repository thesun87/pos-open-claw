import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PrismaModule } from '../prisma/prisma.module';
import { CategoriesController } from './controllers/categories.controller';
import { MenuSyncController } from './menu-sync.controller';
import { MenuService } from './menu.service';
import { CategoriesRepository } from './repositories/categories.repository';
import { MenuRepository } from './repositories/menu.repository';
import { CategoriesService } from './services/categories.service';
import { MenuVersionService } from './services/menu-version.service';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [MenuSyncController, CategoriesController],
  providers: [
    MenuService,
    MenuRepository,
    CategoriesService,
    CategoriesRepository,
    MenuVersionService,
  ],
})
export class MenuModule {}
