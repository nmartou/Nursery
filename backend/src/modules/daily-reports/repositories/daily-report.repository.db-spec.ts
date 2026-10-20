import { eq } from 'drizzle-orm';
import type { Database } from '../../../common/database/database.module.js';
import {
  childAbsence,
  closure,
  dailyReport,
} from '../../../common/database/schema.js';
import {
  connectTestDatabase,
  insertChild,
  resetDatabase,
  type TestDatabase,
} from '../../../../test/support/test-db.js';
import { EMPTY_REPORT_CONTENT } from '../testing/daily-report.fixtures.js';
import { DailyReportRepository } from './daily-report.repository.js';

const UNKNOWN_ID = '00000000-0000-4000-8000-000000000000';
const MONDAY = '2026-10-19';

describe('DailyReportRepository', () => {
  let connection: TestDatabase;
  let db: Database;
  let repository: DailyReportRepository;

  beforeAll(() => {
    connection = connectTestDatabase();
    db = connection.db;
    repository = new DailyReportRepository(db);
  });

  afterAll(() => connection.close());

  beforeEach(() => resetDatabase(db));

  const reportsOf = (date: string) =>
    db.select().from(dailyReport).where(eq(dailyReport.reportDate, date));

  /** Creates the reports of the day and returns the one of the child. */
  async function reportOf(childId: string, date = MONDAY): Promise<string> {
    await repository.ensureReportsForDate(date);
    const found = (await reportsOf(date)).find((r) => r.childId === childId);
    if (!found) {
      throw new Error(`No report for ${childId} on ${date}`);
    }
    return found.id;
  }

  describe('ensureReportsForDate', () => {
    it('creates one report per child enrolled that day, once', async () => {
      const enrolled = await insertChild(db);
      const lastDay = await insertChild(db, { enrollmentEnd: MONDAY });
      await insertChild(db, { enrollmentStart: '2026-10-20' });
      await insertChild(db, { enrollmentEnd: '2026-10-16' });

      await repository.ensureReportsForDate(MONDAY);
      await repository.ensureReportsForDate(MONDAY);

      const reports = await reportsOf(MONDAY);
      expect(reports.map((r) => r.childId).sort()).toEqual(
        [enrolled, lastDay].sort(),
      );
    });

    it('does nothing when no child is enrolled', async () => {
      await expect(
        repository.ensureReportsForDate(MONDAY),
      ).resolves.toBeUndefined();
      await expect(reportsOf(MONDAY)).resolves.toEqual([]);
    });
  });

  describe('findByDate', () => {
    it('lists the reports of the children enrolled that day, by name', async () => {
      await insertChild(db, { firstName: 'Zoé' });
      await insertChild(db, { firstName: 'Adam' });
      await insertChild(db, { firstName: 'Hugo', lastName: 'Bernard' });
      await repository.ensureReportsForDate(MONDAY);

      const reports = await repository.findByDate(MONDAY);

      expect(
        reports.map((r) => `${r.childLastName} ${r.childFirstName}`),
      ).toEqual(['Bernard Hugo', 'Martin Adam', 'Martin Zoé']);
      expect(reports[0]).toMatchObject({
        ...EMPTY_REPORT_CONTENT,
        date: MONDAY,
        plannedAbsence: null,
      });
    });

    it('hides the reports outside the enrollment of the child', async () => {
      // Léa's enrollment was shortened after her report was created: the
      // report stays in the database but is no longer listed.
      const lea = await insertChild(db, { enrollmentEnd: '2026-10-16' });
      await db.insert(dailyReport).values({ childId: lea, reportDate: MONDAY });
      await insertChild(db, { firstName: 'Hugo' });
      await repository.ensureReportsForDate(MONDAY);

      const reports = await repository.findByDate(MONDAY);

      expect(reports.map((r) => r.childFirstName)).toEqual(['Hugo']);
      await expect(reportsOf(MONDAY)).resolves.toHaveLength(2);
    });

    it('joins the absence planned in the calendar that day', async () => {
      const lea = await insertChild(db);
      const hugo = await insertChild(db, { firstName: 'Hugo' });
      await db.insert(childAbsence).values({
        childId: lea,
        startDate: '2026-10-16',
        endDate: MONDAY,
        kind: 'sickness',
        comment: 'Otite',
      });
      await repository.ensureReportsForDate(MONDAY);

      const reports = await repository.findByDate(MONDAY);

      const byChild = new Map(reports.map((r) => [r.childId, r]));
      expect(byChild.get(lea)?.plannedAbsence).toEqual({
        kind: 'sickness',
        comment: 'Otite',
      });
      expect(byChild.get(hugo)?.plannedAbsence).toBeNull();
    });
  });

  describe('findById and update', () => {
    it('saves the content and reads it back, times as HH:mm', async () => {
      const id = await reportOf(await insertChild(db));

      const saved = await repository.update(id, {
        ...EMPTY_REPORT_CONTENT,
        arrivalTime: '08:15',
        departureTime: '17:30',
        meals: [
          { label: 'Purée', quantityGrams: 120 },
          { label: 'Compote', quantityGrams: null },
        ],
        bottles: [
          { time: '15:00', quantityMl: 180 },
          { time: '09:30', quantityMl: null },
        ],
        naps: [
          { startTime: '13:00', endTime: null },
          { startTime: '10:00', endTime: '10:45' },
        ],
        stoolStatus: 'other',
        stoolComment: 'Liquides',
        parentNote: 'Bonne journée',
      });

      expect(saved).toMatchObject({
        id,
        arrivalTime: '08:15',
        departureTime: '17:30',
        // Meals in their order, bottles and naps by time.
        meals: [
          { label: 'Purée', quantityGrams: 120 },
          { label: 'Compote', quantityGrams: null },
        ],
        bottles: [
          { time: '09:30', quantityMl: null },
          { time: '15:00', quantityMl: 180 },
        ],
        naps: [
          { startTime: '10:00', endTime: '10:45' },
          { startTime: '13:00', endTime: null },
        ],
        stoolComment: 'Liquides',
        parentNote: 'Bonne journée',
      });
      await expect(repository.findById(id)).resolves.toEqual(saved);
    });

    it('replaces the meals, bottles and naps on each save', async () => {
      const id = await reportOf(await insertChild(db));
      await repository.update(id, {
        ...EMPTY_REPORT_CONTENT,
        meals: [{ label: 'Purée', quantityGrams: 120 }],
        bottles: [{ time: '09:30', quantityMl: 180 }],
        naps: [{ startTime: '10:00', endTime: '10:45' }],
      });

      const saved = await repository.update(id, {
        ...EMPTY_REPORT_CONTENT,
        absent: true,
      });

      expect(saved).toMatchObject({
        absent: true,
        meals: [],
        bottles: [],
        naps: [],
      });
    });

    it('returns null for an unknown report', async () => {
      await expect(repository.findById(UNKNOWN_ID)).resolves.toBeNull();
      await expect(
        repository.update(UNKNOWN_ID, EMPTY_REPORT_CONTENT),
      ).resolves.toBeNull();
    });
  });

  describe('closureOn', () => {
    it('names the public holiday or the closure of the day, null otherwise', async () => {
      await db.insert(closure).values({
        startDate: '2026-10-26',
        endDate: '2026-10-30',
        label: 'Toussaint',
      });

      await expect(repository.closureOn('2026-11-11')).resolves.toBe(
        'Armistice 1918',
      );
      await expect(repository.closureOn('2026-10-30')).resolves.toBe(
        'Toussaint',
      );
      await expect(repository.closureOn(MONDAY)).resolves.toBeNull();
    });
  });
});
