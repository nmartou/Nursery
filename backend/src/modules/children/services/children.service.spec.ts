import { NotFoundException } from '@nestjs/common';
import type { SaveChildDto } from '../dtos/save-child.dto.js';
import type { ChildRepository } from '../repositories/child.repository.js';
import { CHILD, SAVE_CHILD_PAYLOAD } from '../testing/child.fixtures.js';
import { ChildrenService } from './children.service.js';

const NOW = new Date(2026, 9, 19, 10, 0); // Monday 19 October 2026, local time
const DTO = SAVE_CHILD_PAYLOAD as SaveChildDto;

function createRepositoryMock() {
  return {
    findAll: vi.fn(() => Promise.resolve([CHILD])),
    findById: vi.fn((id: string) =>
      Promise.resolve(id === 'c1' ? CHILD : null),
    ),
    create: vi.fn(() => Promise.resolve(CHILD)),
    update: vi.fn((id: string) => Promise.resolve(id === 'c1' ? CHILD : null)),
  };
}

describe('ChildrenService', () => {
  let repository: ReturnType<typeof createRepositoryMock>;
  let service: ChildrenService;

  beforeEach(() => {
    repository = createRepositoryMock();
    service = new ChildrenService(repository as unknown as ChildRepository);
  });

  it('lists the children with their status as of today', async () => {
    const list = await service.list(NOW);
    expect(list.today).toBe('2026-10-19');
    expect(list.children).toEqual([
      expect.objectContaining({ id: 'c1', enrollmentStatus: 'enrolled' }),
    ]);
  });

  it('saves the normalized registration', async () => {
    await service.create(DTO, NOW);
    expect(repository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        firstName: 'Léa',
        parents: [
          expect.objectContaining({ email: 'claire.martin@example.com' }),
        ],
      }),
    );
  });

  it('throws NotFound for an unknown child', async () => {
    await expect(service.getById('unknown', NOW)).rejects.toBeInstanceOf(
      NotFoundException,
    );
    await expect(service.update('unknown', DTO, NOW)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
