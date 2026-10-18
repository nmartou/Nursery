import { Test, TestingModule } from '@nestjs/testing';
import { NURSERY_REPOSITORY } from '../../../common/constants/injection-tokens.js';
import { InMemoryNurseryRepository } from '../repositories/in-memory-nursery.repository.js';
import { NurseryService } from './nursery.service.js';

describe('NurseryService', () => {
  let service: NurseryService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NurseryService,
        { provide: NURSERY_REPOSITORY, useClass: InMemoryNurseryRepository },
      ],
    }).compile();

    service = module.get(NurseryService);
  });

  it('returns the current nursery as a DTO', async () => {
    const nursery = await service.getCurrent();
    expect(nursery.name).toBe('Crèche Les Petits Pas');
    expect(nursery.createdAt).toBe('2026-01-01T00:00:00.000Z');
  });
});
