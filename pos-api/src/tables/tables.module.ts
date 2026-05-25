import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PrismaModule } from '../prisma/prisma.module';
import { AreasController } from './areas.controller';
import { AreasService } from './areas.service';
import { AreasRepository } from './areas.repository';
import { TablesController } from './tables.controller';
import { TablesService } from './tables.service';
import { TablesRepository } from './tables.repository';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [AreasController, TablesController],
  providers: [AreasService, AreasRepository, TablesService, TablesRepository],
})
export class TablesModule {}
