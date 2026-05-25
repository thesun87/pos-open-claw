import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PrismaModule } from '../prisma/prisma.module';
import { AreasController } from './areas.controller';
import { AreasService } from './areas.service';
import { AreasRepository } from './areas.repository';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [AreasController],
  providers: [AreasService, AreasRepository],
})
export class TablesModule {}
