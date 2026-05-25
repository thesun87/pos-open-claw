import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PrismaModule } from '../prisma/prisma.module';
import { AreasController } from './areas.controller';
import { AreasService } from './areas.service';
import { AreasRepository } from './areas.repository';
import { StoresController } from './stores.controller';
import { StoresRepository } from './stores.repository';
import { StoresService } from './stores.service';
import { TableStatusService } from './table-status.service';
import { TablesController } from './tables.controller';
import { TablesService } from './tables.service';
import { TablesRepository } from './tables.repository';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [AreasController, TablesController, StoresController],
  providers: [
    AreasService,
    AreasRepository,
    TablesService,
    TablesRepository,
    TableStatusService,
    StoresService,
    StoresRepository,
  ],
})
export class TablesModule {}
