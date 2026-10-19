import type { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, type TestingModule } from '@nestjs/testing';
import { sql } from 'drizzle-orm';
import request from 'supertest';
import { AppModule } from '../src/app.module.js';
import { setupApp } from '../src/app.setup.js';
import { DRIZZLE } from '../src/common/constants/injection-tokens.js';
import type { Database } from '../src/common/database/database.module.js';
import {
  child,
  dailyReport,
  nursery,
  reportMeal,
} from '../src/common/database/schema.js';
import type { AppConfig } from '../src/config/app.config.js';
import { EMPTY_REPORT_CONTENT } from '../src/modules/daily-reports/testing/daily-report.fixtures.js';

interface Summary {
  id: string;
  childFirstName: string;
  status: string;
  updatedAt: string;
}

/** Resets the test database to a known state: one nursery, three children. */
async function resetData(db: Database): Promise<void> {
  await db.execute(sql`TRUNCATE nursery, parent CASCADE`);
  const [{ id: nurseryId }] = await db
    .insert(nursery)
    .values({ name: 'Crèche de test', address: '1 rue du Test', capacity: 10 })
    .returning({ id: nursery.id });
  const children = await db
    .insert(child)
    .values([
      {
        nurseryId,
        firstName: 'Léa',
        lastName: 'Martin',
        birthDate: '2024-03-12',
      },
      {
        nurseryId,
        firstName: 'Chloé',
        lastName: 'Dubois',
        birthDate: '2024-07-22',
      },
      {
        nurseryId,
        firstName: 'Hugo',
        lastName: 'Bernard',
        birthDate: '2025-01-08',
      },
      {
        nurseryId,
        firstName: 'Ancien',
        lastName: 'Inscrit',
        birthDate: '2022-01-01',
        active: false,
      },
    ])
    .returning({ id: child.id, firstName: child.firstName });
  const leaId = children.find((c) => c.firstName === 'Léa')!.id;

  // Léa already has a complete report on 2026-10-16.
  const [{ id: reportId }] = await db
    .insert(dailyReport)
    .values({
      childId: leaId,
      reportDate: '2026-10-16',
      arrivalTime: '08:15',
      departureTime: '17:30',
      noNap: true,
    })
    .returning({ id: dailyReport.id });
  await db.insert(reportMeal).values([
    { reportId, position: 0, label: 'Purée de carottes', quantityGrams: 150 },
    { reportId, position: 1, label: 'Compote de pommes', quantityGrams: 100 },
  ]);
}

describe('Daily reports API (e2e)', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    setupApp(app, app.get(ConfigService).getOrThrow<AppConfig>('app'));
    await app.init();
    await resetData(app.get<Database>(DRIZZLE));
  });

  afterEach(async () => {
    await app.close();
  });

  async function findReport(firstName: string): Promise<Summary> {
    const res = await request(app.getHttpServer())
      .get('/api/daily-reports')
      .query({ date: '2026-10-16' })
      .expect(200);
    return (res.body.reports as Summary[]).find(
      (report) => report.childFirstName === firstName,
    )!;
  }

  it('GET /api/daily-reports lists the reports of the day', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/daily-reports?date=2026-10-16')
      .expect(200);
    expect(res.body.date).toBe('2026-10-16');
    // Active children only, sorted by last name.
    expect(
      (res.body.reports as Summary[]).map((report) => report.childFirstName),
    ).toEqual(['Hugo', 'Chloé', 'Léa']);
  });

  it('GET /api/daily-reports rejects weekends and invalid dates', async () => {
    await request(app.getHttpServer())
      .get('/api/daily-reports?date=2026-10-17')
      .expect(400);
    await request(app.getHttpServer())
      .get('/api/daily-reports?date=not-a-date')
      .expect(400);
  });

  it('GET /api/daily-reports/:id returns the full report', async () => {
    const lea = await findReport('Léa');
    const res = await request(app.getHttpServer())
      .get(`/api/daily-reports/${lea.id}`)
      .expect(200);
    expect(res.body).toMatchObject({
      childLastName: 'Martin',
      status: 'complete',
      arrivalTime: '08:15',
    });
    expect(res.body.meals).toHaveLength(2);
  });

  it('PUT /api/daily-reports/:id saves the report and updates its status', async () => {
    const chloe = await findReport('Chloé');
    const res = await request(app.getHttpServer())
      .put(`/api/daily-reports/${chloe.id}`)
      .send({
        ...EMPTY_REPORT_CONTENT,
        arrivalTime: '08:00',
        departureTime: '16:45',
        bottles: [{ time: '10:00', quantityMl: 180 }],
        noNap: true,
      })
      .expect(200);
    expect(res.body.status).toBe('complete');

    const updated = await findReport('Chloé');
    expect(updated.status).toBe('complete');
    expect(updated.updatedAt).toBe(res.body.updatedAt);
  });

  it('PUT /api/daily-reports/:id requires a comment for abnormal stools', async () => {
    const chloe = await findReport('Chloé');
    await request(app.getHttpServer())
      .put(`/api/daily-reports/${chloe.id}`)
      .send({ ...EMPTY_REPORT_CONTENT, stoolStatus: 'other' })
      .expect(400);
  });

  it('PUT /api/daily-reports/:id returns 404 for an unknown report', async () => {
    await request(app.getHttpServer())
      .put('/api/daily-reports/00000000-0000-0000-0000-000000000000')
      .send(EMPTY_REPORT_CONTENT)
      .expect(404);
  });

  it('GET /api/daily-reports/:id rejects an id that is not a UUID', async () => {
    await request(app.getHttpServer())
      .get('/api/daily-reports/unknown')
      .expect(400);
  });

  it('PUT /api/daily-reports/:id replaces meals, bottles and naps', async () => {
    const lea = await findReport('Léa');
    const res = await request(app.getHttpServer())
      .put(`/api/daily-reports/${lea.id}`)
      .send({
        ...EMPTY_REPORT_CONTENT,
        meals: [{ label: 'Riz', quantityGrams: 0 }],
        bottles: [{ time: '09:30', quantityMl: 210 }],
        naps: [{ startTime: '12:30', endTime: null }],
      })
      .expect(200);
    expect(res.body).toMatchObject({
      meals: [{ label: 'Riz', quantityGrams: 0 }],
      bottles: [{ time: '09:30', quantityMl: 210 }],
      naps: [{ startTime: '12:30', endTime: null }],
    });
  });
});
