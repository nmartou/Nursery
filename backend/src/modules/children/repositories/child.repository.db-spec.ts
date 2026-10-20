import type { Database } from '../../../common/database/database.module.js';
import {
  childAbsence,
  dailyReport,
  nursery,
  parent,
} from '../../../common/database/schema.js';
import {
  connectTestDatabase,
  resetDatabase,
  type TestDatabase,
} from '../../../../test/support/test-db.js';
import type { ChildInput } from '../models/child.model.js';
import { ChildRepository } from './child.repository.js';

const UNKNOWN_ID = '00000000-0000-4000-8000-000000000000';

const CLAIRE = {
  firstName: 'Claire',
  lastName: 'Martin',
  email: 'claire.martin@example.com',
  phone: '06 01 02 03 04',
  relationship: 'mother' as const,
};

const PAUL = {
  firstName: 'Paul',
  lastName: 'Martin',
  email: 'paul.martin@example.com',
  phone: null,
  relationship: 'father' as const,
};

function registration(overrides: Partial<ChildInput> = {}): ChildInput {
  return {
    firstName: 'Léa',
    lastName: 'Martin',
    birthDate: '2024-03-12',
    enrollmentStart: '2026-09-01',
    enrollmentEnd: null,
    parents: [CLAIRE, PAUL],
    contacts: [
      {
        firstName: 'Jeanne',
        lastName: 'Durand',
        relationship: 'Grand-mère',
        phone: '06 11 22 33 44',
      },
      {
        firstName: 'Marc',
        lastName: 'Durand',
        relationship: 'Grand-père',
        phone: '06 55 66 77 88',
      },
    ],
    ...overrides,
  };
}

describe('ChildRepository', () => {
  let connection: TestDatabase;
  let db: Database;
  let repository: ChildRepository;

  beforeAll(() => {
    connection = connectTestDatabase();
    db = connection.db;
    repository = new ChildRepository(db);
  });

  afterAll(() => connection.close());

  beforeEach(() => resetDatabase(db));

  const parentEmails = async () =>
    (await db.select({ email: parent.email }).from(parent))
      .map((p) => p.email)
      .sort();

  describe('create', () => {
    it('saves the child with its parents and contacts, in order', async () => {
      const created = await repository.create(registration());

      expect(created).toMatchObject({
        id: expect.any(String),
        firstName: 'Léa',
        enrollmentStart: '2026-09-01',
        enrollmentEnd: null,
        parents: [
          { ...CLAIRE, id: expect.any(String) },
          { ...PAUL, id: expect.any(String) },
        ],
        contacts: [{ firstName: 'Jeanne' }, { firstName: 'Marc' }],
        absences: [],
        reportedAbsences: [],
      });
      expect(created.createdAt).toBeInstanceOf(Date);
    });

    it('creates the nursery once, on the first registration', async () => {
      await repository.create(registration());
      await repository.create(
        registration({ firstName: 'Hugo', parents: [PAUL] }),
      );
      await expect(db.select().from(nursery)).resolves.toHaveLength(1);
    });

    it('accepts a child without other contacts', async () => {
      const created = await repository.create(registration({ contacts: [] }));
      expect(created.contacts).toEqual([]);
    });

    it('shares a parent between siblings and updates their details', async () => {
      const lea = await repository.create(registration());
      const hugo = await repository.create(
        registration({
          firstName: 'Hugo',
          parents: [{ ...CLAIRE, phone: '07 00 00 00 00' }],
        }),
      );

      expect(hugo.parents[0].id).toBe(lea.parents[0].id);
      await expect(parentEmails()).resolves.toEqual([
        CLAIRE.email,
        PAUL.email,
      ]);
      const reloaded = await repository.findById(lea.id);
      expect(reloaded?.parents[0].phone).toBe('07 00 00 00 00');
    });
  });

  describe('update', () => {
    it('replaces the child, its parents and contacts', async () => {
      const { id, updatedAt } = await repository.create(registration());

      const updated = await repository.update(
        id,
        registration({
          lastName: 'Martin-Durand',
          enrollmentEnd: '2027-07-30',
          parents: [PAUL, CLAIRE],
          contacts: [
            {
              firstName: 'Ana',
              lastName: 'Lopez',
              relationship: 'Voisine',
              phone: '06 99 99 99 99',
            },
          ],
        }),
      );

      expect(updated).toMatchObject({
        id,
        lastName: 'Martin-Durand',
        enrollmentEnd: '2027-07-30',
        parents: [{ email: PAUL.email }, { email: CLAIRE.email }],
        contacts: [{ firstName: 'Ana' }],
      });
      expect(updated?.updatedAt.getTime()).toBeGreaterThanOrEqual(
        updatedAt.getTime(),
      );
    });

    it('deletes the parents no longer linked to any child', async () => {
      const { id } = await repository.create(registration());
      await repository.create(
        registration({ firstName: 'Hugo', parents: [PAUL] }),
      );

      // Claire leaves Léa's file, Paul stays Hugo's parent.
      await repository.update(id, registration({ parents: [] }));

      await expect(parentEmails()).resolves.toEqual([PAUL.email]);
    });

    it('returns null for an unknown child', async () => {
      await expect(
        repository.update(UNKNOWN_ID, registration()),
      ).resolves.toBeNull();
    });
  });

  describe('reading', () => {
    it('lists the children by last name then first name', async () => {
      await repository.create(registration({ firstName: 'Zoé' }));
      await repository.create(registration({ firstName: 'Adam' }));
      await repository.create(
        registration({ firstName: 'Hugo', lastName: 'Bernard' }),
      );

      const children = await repository.findAll();

      expect(children.map((c) => `${c.lastName} ${c.firstName}`)).toEqual([
        'Bernard Hugo',
        'Martin Adam',
        'Martin Zoé',
      ]);
    });

    it('loads the planned absences and the days marked absent, by date', async () => {
      const { id } = await repository.create(registration());
      await db.insert(childAbsence).values([
        {
          childId: id,
          startDate: '2026-12-21',
          endDate: '2026-12-24',
          kind: 'vacation',
        },
        {
          childId: id,
          startDate: '2026-10-05',
          endDate: '2026-10-06',
          kind: 'sickness',
          comment: 'Otite',
        },
      ]);
      await db.insert(dailyReport).values([
        { childId: id, reportDate: '2026-10-16', absent: true },
        { childId: id, reportDate: '2026-10-15', absent: false },
        {
          childId: id,
          reportDate: '2026-10-14',
          absent: true,
          absenceComment: 'Fièvre',
        },
      ]);

      const child = await repository.findById(id);

      expect(child?.absences).toEqual([
        {
          id: expect.any(String),
          startDate: '2026-10-05',
          endDate: '2026-10-06',
          kind: 'sickness',
          comment: 'Otite',
        },
        {
          id: expect.any(String),
          startDate: '2026-12-21',
          endDate: '2026-12-24',
          kind: 'vacation',
          comment: null,
        },
      ]);
      expect(child?.reportedAbsences).toEqual([
        { reportId: expect.any(String), date: '2026-10-14', comment: 'Fièvre' },
        { reportId: expect.any(String), date: '2026-10-16', comment: null },
      ]);
    });

    it('returns null for an unknown child', async () => {
      await expect(repository.findById(UNKNOWN_ID)).resolves.toBeNull();
    });
  });
});
