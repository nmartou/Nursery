import type { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, type TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module.js';
import { setupApp } from '../src/app.setup.js';
import { DAILY_REPORT_REPOSITORY } from '../src/common/constants/injection-tokens.js';
import type { AppConfig } from '../src/config/app.config.js';
import { InMemoryDailyReportRepository } from '../src/modules/daily-reports/repositories/in-memory-daily-report.repository.js';
import {
  EMPTY_REPORT_CONTENT,
  MOCK_CHILDREN,
} from '../src/modules/daily-reports/repositories/mocks/daily-reports.mock.js';

interface Summary {
  id: string;
  childFirstName: string;
  status: string;
  updatedAt: string;
}

describe('Daily reports API (e2e)', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(DAILY_REPORT_REPOSITORY)
      .useValue(new InMemoryDailyReportRepository(MOCK_CHILDREN, '2026-10-16'))
      .compile();

    app = moduleFixture.createNestApplication();
    setupApp(app, app.get(ConfigService).getOrThrow<AppConfig>('app'));
    await app.init();
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
    expect(res.body.reports).toHaveLength(5);
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
      .put('/api/daily-reports/unknown')
      .send(EMPTY_REPORT_CONTENT)
      .expect(404);
  });
});
