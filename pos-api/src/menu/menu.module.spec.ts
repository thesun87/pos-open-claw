import { Test } from '@nestjs/testing';
import { MenuModule } from './menu.module';
import { MenuSyncController } from './menu-sync.controller';

jest.mock('../prisma/prisma.service', () => ({
  PrismaService: class PrismaServiceMock {},
}));

describe('MenuModule', () => {
  it('compiles with route guards and their dependencies available in module context', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [MenuModule],
    }).compile();

    expect(moduleRef.get(MenuSyncController)).toBeInstanceOf(
      MenuSyncController,
    );
  });
});
