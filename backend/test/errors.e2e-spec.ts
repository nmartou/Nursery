import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp } from './support/test-app.js';

const UNKNOWN_ID = '00000000-0000-4000-8000-000000000000';

/** The error responses of the API, whatever raised them. */
describe('Error responses (e2e)', () => {
  let app: INestApplication;
  const http = () => request(app.getHttpServer());

  beforeEach(async () => {
    ({ app } = await createTestApp());
  });

  afterEach(async () => {
    await app.close();
  });

  it('share one flat format', async () => {
    const res = await http().get(`/api/daily-reports/${UNKNOWN_ID}`).expect(404);

    expect(res.body).toEqual({
      statusCode: 404,
      error: 'Not Found',
      messages: [expect.any(String)],
      path: `/api/daily-reports/${UNKNOWN_ID}`,
      timestamp: expect.any(String),
    });
  });

  it('list every validation message', async () => {
    const res = await http()
      .post('/api/closures')
      .send({ startDate: '2026-11-10', endDate: '2026-11-09', label: '' })
      .expect(400);

    expect(res.body).toMatchObject({ statusCode: 400, error: 'Bad Request' });
    expect((res.body as { messages: string[] }).messages.length).toBeGreaterThan(
      1,
    );
  });
});
