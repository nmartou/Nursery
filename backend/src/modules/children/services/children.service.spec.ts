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

  it('computes the status from the given day', async () => {
    const list = await service.list(new Date(2026, 7, 31, 10, 0));
    expect(list.children[0].enrollmentStatus).toBe('upcoming');
  });

  it('flags a child absent today in the list', async () => {
    repository.findAll.mockResolvedValueOnce([
      {
        ...CHILD,
        reportedAbsences: [{ reportId: 'r1', date: '2026-10-19', comment: null }],
      },
    ]);
    const list = await service.list(NOW);
    expect(list.children[0].currentAbsence).toMatchObject({
      startDate: '2026-10-19',
      source: 'report',
    });
  });

  it('returns a child with its parents, contacts and absence history', async () => {
    repository.findById.mockResolvedValueOnce({
      ...CHILD,
      absences: [
        {
          id: 'a1',
          startDate: '2026-10-05',
          endDate: '2026-10-06',
          kind: 'vacation',
          comment: null,
        },
      ],
      reportedAbsences: [{ reportId: 'r1', date: '2026-10-15', comment: 'Fièvre' }],
    });

    const child = await service.getById('c1', NOW);

    expect(child).toMatchObject({
      id: 'c1',
      enrollmentStatus: 'enrolled',
      parents: [{ email: 'claire.martin@example.com' }],
      contacts: [{ firstName: 'Jeanne' }],
      createdAt: '2026-08-20T08:00:00.000Z',
    });
    expect(child.absences.map((a) => [a.startDate, a.source])).toEqual([
      ['2026-10-15', 'report'],
      ['2026-10-05', 'calendar'],
    ]);
  });

  it('returns the created child', async () => {
    await expect(service.create(DTO, NOW)).resolves.toMatchObject({
      id: 'c1',
      enrollmentStatus: 'enrolled',
    });
  });

  it('replaces the child with the normalized registration', async () => {
    await expect(service.update('c1', DTO, NOW)).resolves.toMatchObject({
      id: 'c1',
    });
    expect(repository.update).toHaveBeenCalledWith(
      'c1',
      expect.objectContaining({
        enrollmentEnd: null,
        parents: [
          expect.objectContaining({ email: 'claire.martin@example.com' }),
        ],
        contacts: [expect.objectContaining({ firstName: 'Jeanne' })],
      }),
    );
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
