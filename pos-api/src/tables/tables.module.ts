import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PrismaModule } from '../prisma/prisma.module';
import { AreasController } from './areas.controller';
import { AreasService } from './areas.service';
import { AreasRepository } from './areas.repository';
import { StoresController } from './stores.controller';
import { StoresRepository } from './stores.repository';
import { StoresService } from './stores.service';
import { TableSessionsController } from './table-sessions.controller';
import { TableSessionsRepository } from './table-sessions.repository';
import { TableSessionsService } from './table-sessions.service';
import { TableStatusService } from './table-status.service';
import { TablesController } from './tables.controller';
import { TablesService } from './tables.service';
import { TablesRepository } from './tables.repository';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [
    AreasController,
    TableSessionsController,
    TablesController,
    StoresController,
  ],
  providers: [
    AreasService,
    AreasRepository,
    TablesService,
    TablesRepository,
    TableStatusService,
    TableSessionsService,
    TableSessionsRepository,
    StoresService,
    StoresRepository,
  ],
})
export class TablesModule {}
