import type { Database } from '../../../common/database/database.module.js';
import { dailyReport } from '../../../common/database/schema.js';
import {
  connectTestDatabase,
  insertChild,
  resetDatabase,
  type TestDatabase,
} from '../../../../test/support/test-db.js';
import type { AbsenceInput } from '../models/calendar.model.js';
import { CalendarRepository } from './calendar.repository.js';

const UNKNOWN_ID = '00000000-0000-4000-8000-000000000000';

describe('CalendarRepository', () => {
  let connection: TestDatabase;
  let db: Database;
  let repository: CalendarRepository;
  let lea: string;

  beforeAll(() => {
    connection = connectTestDatabase();
    db = connection.db;
    repository = new CalendarRepository(db);
  });

  afterAll(() => connection.close());

  beforeEach(async () => {
    await resetDatabase(db);
    lea = await insertChild(db);
  });

  const absence = (overrides: Partial<AbsenceInput> = {}): AbsenceInput => ({
    childId: lea,
    startDate: '2026-10-19',
    endDate: '2026-10-21',
    kind: 'sickness',
    comment: 'Otite',
    ...overrides,
  });

  describe('closures', () => {
    it('finds the closures overlapping the period, bounds included', async () => {
      for (const [startDate, endDate, label] of [
        ['2026-10-26', '2026-10-30', 'Toussaint'],
        ['2026-10-01', '2026-10-02', 'Formation'],
        ['2026-12-21', '2027-01-01', 'Noël'],
        ['2026-11-30', '2026-11-30', 'Inventaire'],
      ]) {
        await repository.createClosure({ startDate, endDate, label });
      }

      const found = await repository.findClosuresBetween(
        '2026-10-30',
        '2026-12-21',
      );

      expect(found.map((c) => c.label)).toEqual([
        'Toussaint',
        'Inventaire',
        'Noël',
      ]);
    });

    it('creates, updates and deletes a closure', async () => {
      const created = await repository.createClosure({
        startDate: '2026-11-09',
        endDate: '2026-11-10',
        label: 'Pont',
      });
      expect(created).toEqual({
        id: expect.any(String),
        startDate: '2026-11-09',
        endDate: '2026-11-10',
        label: 'Pont',
      });

      await expect(
        repository.updateClosure(created.id, {
          startDate: '2026-11-10',
          endDate: '2026-11-10',
          label: 'Pont du 11 novembre',
        }),
      ).resolves.toEqual({
        id: created.id,
        startDate: '2026-11-10',
        endDate: '2026-11-10',
        label: 'Pont du 11 novembre',
      });

      await expect(repository.deleteClosure(created.id)).resolves.toBe(true);
      await expect(repository.deleteClosure(created.id)).resolves.toBe(false);
    });

    it('returns null when updating an unknown closure', async () => {
      await expect(
        repository.updateClosure(UNKNOWN_ID, {
          startDate: '2026-11-10',
          endDate: '2026-11-10',
          label: 'Pont',
        }),
      ).resolves.toBeNull();
    });
  });

  describe('absences', () => {
    it('creates an absence and returns it with the name of the child', async () => {
      const created = await repository.createAbsence(absence());
      expect(created).toEqual({
        id: expect.any(String),
        childFirstName: 'Léa',
        childLastName: 'Martin',
        ...absence(),
      });
      await expect(repository.findAbsenceById(created.id)).resolves.toEqual(
        created,
      );
    });

    it('updates and deletes an absence, null or false when unknown', async () => {
      const { id } = await repository.createAbsence(absence());

      await expect(
        repository.updateAbsence(id, absence({ kind: 'vacation', comment: null })),
      ).resolves.toMatchObject({ id, kind: 'vacation', comment: null });
      await expect(
        repository.updateAbsence(UNKNOWN_ID, absence()),
      ).resolves.toBeNull();

      await expect(repository.deleteAbsence(id)).resolves.toBe(true);
      await expect(repository.deleteAbsence(id)).resolves.toBe(false);
      await expect(repository.findAbsenceById(id)).resolves.toBeNull();
    });

    it('finds the absences overlapping the period, by date then name', async () => {
      const hugo = await insertChild(db, {
        firstName: 'Hugo',
        lastName: 'Bernard',
      });
      await repository.createAbsence(absence());
      await repository.createAbsence(absence({ childId: hugo }));
      await repository.createAbsence(
        absence({ startDate: '2026-11-02', endDate: '2026-11-06' }),
      );

      const found = await repository.findAbsencesBetween(
        '2026-10-21',
        '2026-10-31',
      );

      expect(found.map((a) => a.childLastName)).toEqual(['Bernard', 'Martin']);
    });

    it('detects an overlap with another absence of the same child only', async () => {
      const { id } = await repository.createAbsence(absence());
      const other = await insertChild(db, { firstName: 'Hugo' });

      // The bounds are included.
      await expect(
        repository.hasOverlappingAbsence(
          absence({ startDate: '2026-10-21', endDate: '2026-10-23' }),
        ),
      ).resolves.toBe(true);
      await expect(
        repository.hasOverlappingAbsence(
          absence({ startDate: '2026-10-22', endDate: '2026-10-23' }),
        ),
      ).resolves.toBe(false);
      await expect(
        repository.hasOverlappingAbsence(absence({ childId: other })),
      ).resolves.toBe(false);
      // Moving an absence does not conflict with itself.
      await expect(
        repository.hasOverlappingAbsence(absence(), id),
      ).resolves.toBe(false);
    });

    it('reads the enrollment period of a child, null when unknown', async () => {
      const ended = await insertChild(db, { enrollmentEnd: '2027-07-30' });
      await expect(repository.findEnrollment(lea)).resolves.toEqual({
        start: '2026-09-01',
        end: null,
      });
      await expect(repository.findEnrollment(ended)).resolves.toEqual({
        start: '2026-09-01',
        end: '2027-07-30',
      });
      await expect(repository.findEnrollment(UNKNOWN_ID)).resolves.toBeNull();
    });
  });

  describe('absences noted in the daily reports', () => {
    async function report(childId: string, date: string, absent = true) {
      await db.insert(dailyReport).values({
        childId,
        reportDate: date,
        absent,
        absenceComment: absent ? 'Fièvre' : null,
      });
    }

    it('lists the days marked absent within the period', async () => {
      await report(lea, '2026-10-15');
      await report(lea, '2026-10-16');
      await report(lea, '2026-10-19', false);
      await report(lea, '2026-10-20');

      const found = await repository.findReportedAbsencesBetween(
        '2026-10-16',
        '2026-10-19',
      );

      expect(found).toEqual([
        {
          reportId: expect.any(String),
          childId: lea,
          childFirstName: 'Léa',
          childLastName: 'Martin',
          date: '2026-10-16',
          comment: 'Fièvre',
        },
      ]);
    });

    it('leaves out the days covered by a planned absence of the same child', async () => {
      const hugo = await insertChild(db, { firstName: 'Hugo' });
      await repository.createAbsence(absence());
      await report(lea, '2026-10-20');
      await report(lea, '2026-10-22');
      await report(hugo, '2026-10-20');

      const found = await repository.findReportedAbsencesBetween(
        '2026-10-19',
        '2026-10-23',
      );

      expect(found.map((a) => [a.childFirstName, a.date])).toEqual([
        ['Hugo', '2026-10-20'],
        ['Léa', '2026-10-22'],
      ]);
    });
  });

  describe('arrivals and departures', () => {
    it('lists the enrollments starting or ending within the period', async () => {
      await insertChild(db, {
        firstName: 'Emma',
        lastName: 'Petit',
        enrollmentStart: '2026-11-02',
        enrollmentEnd: '2026-11-27',
      });
      await insertChild(db, { firstName: 'Lucas', enrollmentStart: '2026-12-01' });

      const starts = await repository.findEnrollmentStartsBetween(
        '2026-11-01',
        '2026-11-30',
      );
      const ends = await repository.findEnrollmentEndsBetween(
        '2026-11-01',
        '2026-11-30',
      );

      expect(starts.map((s) => [s.childFirstName, s.date])).toEqual([
        ['Emma', '2026-11-02'],
      ]);
      // Léa's enrollment has no end: she is not listed.
      expect(ends.map((e) => [e.childFirstName, e.date])).toEqual([
        ['Emma', '2026-11-27'],
      ]);
    });
  });
});
