import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PrismaModule } from '../prisma/prisma.module';
import { CategoriesController } from './controllers/categories.controller';
import { OptionGroupsController } from './controllers/option-groups.controller';
import { MenuSyncController } from './menu-sync.controller';
import { MenuService } from './menu.service';
import { CategoriesRepository } from './repositories/categories.repository';
import { OptionGroupsRepository } from './repositories/option-groups.repository';
import { MenuRepository } from './repositories/menu.repository';
import { CategoriesService } from './services/categories.service';
import { OptionGroupsService } from './services/option-groups.service';
import { MenuVersionService } from './services/menu-version.service';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [
    MenuSyncController,
    CategoriesController,
    OptionGroupsController,
  ],
  providers: [
    MenuService,
    MenuRepository,
    CategoriesService,
    CategoriesRepository,
    OptionGroupsService,
    OptionGroupsRepository,
    MenuVersionService,
  ],
})
export class MenuModule {}
