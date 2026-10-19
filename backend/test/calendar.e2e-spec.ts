import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { toIsoDate } from '../src/common/utils/date.util.js';
import { createTestApp } from './support/test-app.js';

interface CalendarEvent {
  type: string;
  startDate: string;
  endDate: string;
  label: string;
  sourceId: string | null;
  absenceKind: string | null;
}

interface ReportSummary {
  id: string;
  childFirstName: string;
  status: string;
  plannedAbsence: { kind: string; comment: string | null } | null;
}

const TODAY = toIsoDate(new Date());

describe('Calendar API (e2e)', () => {
  let app: INestApplication;
  const http = () => request(app.getHttpServer());

  beforeEach(async () => {
    ({ app } = await createTestApp());
  });

  afterEach(async () => {
    await app.close();
  });

  /** Registers a child through the API; returns its id. */
  async function register(
    firstName: string,
    enrollmentStart = '2026-09-01',
    enrollmentEnd: string | null = null,
  ): Promise<string> {
    const res = await http()
      .post('/api/children')
      .send({
        firstName,
        lastName: 'Test',
        birthDate: '2024-01-15',
        enrollmentStart,
        enrollmentEnd,
        parents: [
          {
            firstName: 'Parent',
            lastName: firstName,
            email: `${firstName.toLowerCase()}@example.com`,
            phone: '06 00 00 00 00',
            relationship: 'mother',
          },
        ],
        contacts: [],
      })
      .expect(201);
    return (res.body as { id: string }).id;
  }

  const absence = (
    childId: string,
    overrides: Record<string, unknown> = {},
  ) => ({
    childId,
    startDate: '2026-10-19',
    endDate: '2026-10-21',
    kind: 'sickness',
    comment: 'Otite',
    ...overrides,
  });

  async function reportsOn(date: string) {
    const res = await http()
      .get('/api/daily-reports')
      .query({ date })
      .expect(200);
    return res.body as { closure: string | null; reports: ReportSummary[] };
  }

  async function events(from: string, to: string): Promise<CalendarEvent[]> {
    const res = await http()
      .get('/api/calendar')
      .query({ from, to })
      .expect(200);
    return (res.body as { events: CalendarEvent[] }).events;
  }

  /** Marks the child's report of that day absent, through the reports API. */
  async function markAbsent(date: string, comment: string | null) {
    const [report] = (await reportsOn(date)).reports;
    const detail = await http()
      .get(`/api/daily-reports/${report.id}`)
      .expect(200);
    await http()
      .put(`/api/daily-reports/${report.id}`)
      .send({
        ...pickContent(detail.body as Record<string, unknown>),
        absent: true,
        absenceComment: comment,
      })
      .expect(200);
  }

  describe('closures', () => {
    it('creates, updates and deletes a closure of the nursery', async () => {
      const created = await http()
        .post('/api/closures')
        .send({
          startDate: '2026-12-21',
          endDate: '2027-01-01',
          label: ' Vacances de Noël ',
        })
        .expect(201);
      expect(created.body).toMatchObject({
        label: 'Vacances de Noël',
        endDate: '2027-01-01',
      });
      const id = (created.body as { id: string }).id;

      await http()
        .put(`/api/closures/${id}`)
        .send({ startDate: '2026-12-24', endDate: '2027-01-01', label: 'Noël' })
        .expect(200);
      expect(
        (await events('2026-12-01', '2026-12-31')).find(
          (e) => e.type === 'closure',
        ),
      ).toMatchObject({ startDate: '2026-12-24', label: 'Noël', sourceId: id });

      await http().delete(`/api/closures/${id}`).expect(204);
      await http().delete(`/api/closures/${id}`).expect(404);
    });

    it.each([
      [
        'an end before the start',
        { startDate: '2026-12-21', endDate: '2026-12-20', label: 'X' },
      ],
      [
        'an empty label',
        { startDate: '2026-12-21', endDate: '2026-12-22', label: '   ' },
      ],
      [
        'an invalid date',
        { startDate: '2026-02-30', endDate: '2026-03-01', label: 'X' },
      ],
    ])('rejects %s', async (_case, body) => {
      await http().post('/api/closures').send(body).expect(400);
    });
  });

  describe('absences', () => {
    it('declares, moves and removes an absence of a child', async () => {
      const childId = await register('Léa');
      const created = await http()
        .post('/api/absences')
        .send(absence(childId))
        .expect(201);
      expect(created.body).toMatchObject({
        childFirstName: 'Léa',
        kind: 'sickness',
        comment: 'Otite',
      });
      const id = (created.body as { id: string }).id;

      // Moving it over its own previous dates is not an overlap.
      await http()
        .put(`/api/absences/${id}`)
        .send(
          absence(childId, {
            endDate: '2026-10-23',
            kind: 'vacation',
            comment: '',
          }),
        )
        .expect(200)
        .expect((res) =>
          expect(res.body).toMatchObject({
            endDate: '2026-10-23',
            comment: null,
          }),
        );

      await http().delete(`/api/absences/${id}`).expect(204);
      await http()
        .put(`/api/absences/${id}`)
        .send(absence(childId))
        .expect(404);
    });

    it('refuses an absence outside the enrollment, for an unknown child or overlapping another', async () => {
      const childId = await register('Hugo', '2026-09-01', '2027-07-30');
      await http()
        .post('/api/absences')
        .send(absence(childId, { startDate: '2026-08-31' }))
        .expect(400);
      await http()
        .post('/api/absences')
        .send(
          absence(childId, { startDate: '2027-07-30', endDate: '2027-08-02' }),
        )
        .expect(400);
      await http()
        .post('/api/absences')
        .send(absence('00000000-0000-4000-8000-000000000000'))
        .expect(400);
      await http()
        .post('/api/absences')
        .send(absence(childId, { kind: 'party' }))
        .expect(400);

      await http().post('/api/absences').send(absence(childId)).expect(201);
      await http()
        .post('/api/absences')
        .send(
          absence(childId, { startDate: '2026-10-21', endDate: '2026-10-22' }),
        )
        .expect(409);
    });
  });

  describe('GET /api/calendar', () => {
    it('gathers holidays, closures, absences, arrivals and departures, by date', async () => {
      const lea = await register('Léa', '2026-11-02');
      await register('Lucas', '2024-09-02', '2026-11-13');
      await http()
        .post('/api/closures')
        .send({
          startDate: '2026-11-09',
          endDate: '2026-11-10',
          label: 'Pont du 11 novembre',
        })
        .expect(201);
      await http()
        .post('/api/absences')
        .send(
          absence(lea, {
            startDate: '2026-11-04',
            endDate: '2026-11-05',
            kind: 'vacation',
          }),
        )
        .expect(201);

      const found = await events('2026-11-01', '2026-11-30');
      expect(found.map((e) => [e.startDate, e.type, e.label])).toEqual([
        ['2026-11-01', 'public_holiday', 'Toussaint'],
        ['2026-11-02', 'enrollment_start', 'Léa Test'],
        ['2026-11-04', 'absence', 'Léa Test'],
        ['2026-11-09', 'closure', 'Pont du 11 novembre'],
        ['2026-11-11', 'public_holiday', 'Armistice 1918'],
        ['2026-11-13', 'enrollment_end', 'Lucas Test'],
      ]);
      expect(found[2]).toMatchObject({
        endDate: '2026-11-05',
        absenceKind: 'vacation',
      });
    });

    it('validates the period', async () => {
      await http()
        .get('/api/calendar')
        .query({ from: '2026-11-30', to: '2026-11-01' })
        .expect(400);
      await http()
        .get('/api/calendar')
        .query({ from: '2026-01-01', to: '2027-06-01' })
        .expect(400);
      await http()
        .get('/api/calendar')
        .query({ from: 'nope', to: '2026-11-01' })
        .expect(400);
    });
  });

  describe('absences noted in the daily reports', () => {
    it('shows a child marked absent in a report on the calendar', async () => {
      await register('Inès');
      await markAbsent('2026-10-20', 'Fièvre');

      const found = (await events('2026-10-01', '2026-10-31')).filter(
        (e) => e.type === 'reported_absence',
      );
      expect(found).toEqual([
        expect.objectContaining({
          startDate: '2026-10-20',
          endDate: '2026-10-20',
          label: 'Inès Test',
          comment: 'Fièvre',
          sourceId: null,
        }),
      ]);
    });

    it('does not repeat a day already covered by a planned absence', async () => {
      const childId = await register('Léa');
      await http()
        .post('/api/absences')
        .send(
          absence(childId, { startDate: '2026-10-21', endDate: '2026-10-21' }),
        )
        .expect(201);
      await markAbsent('2026-10-21', null);
      await markAbsent('2026-10-22', null);

      const found = await events('2026-10-21', '2026-10-22');
      expect(found.map((e) => [e.startDate, e.type])).toEqual([
        ['2026-10-21', 'absence'],
        ['2026-10-22', 'reported_absence'],
      ]);
    });
  });

  describe('daily reports', () => {
    it('has no report on a closure or a public holiday, and says why', async () => {
      await register('Léa');
      await http()
        .post('/api/closures')
        .send({
          startDate: '2026-10-19',
          endDate: '2026-10-20',
          label: 'Formation du personnel',
        })
        .expect(201);

      expect(await reportsOn('2026-10-19')).toEqual({
        date: '2026-10-19',
        closure: 'Formation du personnel',
        reports: [],
      });
      expect((await reportsOn('2026-11-11')).closure).toBe('Armistice 1918');
      const open = await reportsOn('2026-10-21');
      expect(open.closure).toBeNull();
      expect(open.reports).toHaveLength(1);

      const stats = await http()
        .get('/api/daily-reports/stats?date=2026-10-20')
        .expect(200);
      expect(stats.body).toMatchObject({
        closure: 'Formation du personnel',
        total: 0,
      });
    });

    it('shows the report of a planned absence as absent until something is entered', async () => {
      const childId = await register('Léa');
      const created = await http()
        .post('/api/absences')
        .send(absence(childId))
        .expect(201);

      const [report] = (await reportsOn('2026-10-20')).reports;
      expect(report).toMatchObject({
        status: 'absent',
        plannedAbsence: { kind: 'sickness', comment: 'Otite' },
      });
      expect((await reportsOn('2026-10-22')).reports[0]).toMatchObject({
        status: 'todo',
        plannedAbsence: null,
      });

      // The child came after all: what is entered takes over.
      const detail = await http()
        .get(`/api/daily-reports/${report.id}`)
        .expect(200);
      expect(detail.body).toMatchObject({
        plannedAbsence: { kind: 'sickness' },
        absent: false,
      });
      const saved = await http()
        .put(`/api/daily-reports/${report.id}`)
        .send({
          ...pickContent(detail.body as Record<string, unknown>),
          arrivalTime: '09:30',
        })
        .expect(200);
      expect(saved.body).toMatchObject({ status: 'in_progress' });

      // Removing the absence removes its effect on untouched reports.
      await http()
        .delete(`/api/absences/${(created.body as { id: string }).id}`)
        .expect(204);
      expect((await reportsOn('2026-10-19')).reports[0]).toMatchObject({
        status: 'todo',
        plannedAbsence: null,
      });
    });
  });

  describe('children', () => {
    it('shows the current and upcoming absences of a child', async () => {
      const childId = await register('Léa', '2024-02-01');
      await http()
        .post('/api/absences')
        .send(
          absence(childId, {
            startDate: TODAY,
            endDate: TODAY,
            kind: 'sickness',
          }),
        )
        .expect(201);
      await http()
        .post('/api/absences')
        .send(
          absence(childId, {
            startDate: '2024-03-04',
            endDate: '2024-03-08',
            kind: 'vacation',
          }),
        )
        .expect(201);

      const list = await http().get('/api/children').expect(200);
      expect(list.body.children[0]).toMatchObject({
        currentAbsence: { kind: 'sickness', startDate: TODAY },
      });
      const detail = await http().get(`/api/children/${childId}`).expect(200);
      // Past absences are listed too, most recent first.
      expect(detail.body.absences).toEqual([
        expect.objectContaining({
          kind: 'sickness',
          startDate: TODAY,
          source: 'calendar',
        }),
        expect.objectContaining({
          kind: 'vacation',
          startDate: '2024-03-04',
          source: 'calendar',
        }),
      ]);
    });

    it('adds the absences noted in the daily reports, grouped by period', async () => {
      const childId = await register('Inès');
      await markAbsent('2026-10-16', 'Fièvre');
      await markAbsent('2026-10-19', null); // Monday: same period
      await markAbsent('2026-10-21', 'Rendez-vous');

      const detail = await http().get(`/api/children/${childId}`).expect(200);
      expect(
        (
          detail.body.absences as {
            startDate: string;
            endDate: string;
            kind: unknown;
            comment: unknown;
            source: string;
          }[]
        ).map((a) => [a.startDate, a.endDate, a.kind, a.comment, a.source]),
      ).toEqual([
        ['2026-10-21', '2026-10-21', null, 'Rendez-vous', 'report'],
        ['2026-10-16', '2026-10-19', null, 'Fièvre', 'report'],
      ]);
    });
  });
});

/** The editable fields of a report, as `PUT /daily-reports/:id` expects them. */
function pickContent(report: Record<string, unknown>) {
  const keys = [
    'absent',
    'absenceComment',
    'arrivalTime',
    'departureTime',
    'meals',
    'bottles',
    'mealComment',
    'naps',
    'noNap',
    'napComment',
    'stoolStatus',
    'stoolComment',
    'parentNote',
  ];
  return Object.fromEntries(keys.map((key) => [key, report[key]]));
}
