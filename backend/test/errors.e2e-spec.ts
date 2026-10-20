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

  it('share one flat format, in English by default', async () => {
    const res = await http().get(`/api/daily-reports/${UNKNOWN_ID}`).expect(404);

    expect(res.body).toEqual({
      statusCode: 404,
      error: 'Not Found',
      code: 'report.notFound',
      messages: ['This report does not exist.'],
      path: `/api/daily-reports/${UNKNOWN_ID}`,
      timestamp: expect.any(String),
    });
  });

  it('answer in the language asked by Accept-Language', async () => {
    const res = await http()
      .get(`/api/children/${UNKNOWN_ID}`)
      .set('Accept-Language', 'fr-FR,fr;q=0.9,en;q=0.8')
      .expect(404);

    expect(res.body).toMatchObject({
      code: 'child.notFound',
      messages: ["Cet enfant n'existe pas ou a été supprimé."],
    });
  });

  it('list every validation message', async () => {
    const res = await http()
      .post('/api/closures')
      .set('Accept-Language', 'fr')
      .send({ startDate: '2026-11-10', endDate: '2026-11-09', label: '' })
      .expect(400);

    expect(res.body).toMatchObject({
      statusCode: 400,
      error: 'Bad Request',
      code: 'validation.failed',
      messages: [
        'Le dernier jour de fermeture doit suivre le premier.',
        '« label » est obligatoire.',
      ],
    });
  });

  it('explain an unknown route, with its full path', async () => {
    const res = await http()
      .get('/api/unknown')
      .set('Accept-Language', 'fr')
      .expect(404);

    expect(res.body).toMatchObject({
      code: 'route.notFound',
      messages: ["Cette adresse n'existe pas : GET /api/unknown."],
      path: '/api/unknown',
    });
  });

  it('explain a malformed id', async () => {
    const res = await http().get('/api/children/not-a-uuid').expect(400);
    expect(res.body).toMatchObject({
      code: 'request.invalidId',
      messages: ['This identifier is not valid.'],
    });
  });

  it('explain a malformed JSON body, with the CORS headers', async () => {
    const res = await http()
      .post('/api/closures')
      .set('Origin', 'http://localhost:4200')
      .set('Accept-Language', 'fr')
      .set('Content-Type', 'application/json')
      .send('{"label":')
      .expect(400);

    expect(res.headers['access-control-allow-origin']).toBe(
      'http://localhost:4200',
    );
    expect(res.body).toMatchObject({
      code: 'body.invalidJson',
      messages: ["Le corps de la requête n'est pas un JSON valide."],
    });
  });

  it('refuse a body that is too large', async () => {
    const res = await http()
      .post('/api/closures')
      .send({ label: 'x'.repeat(200_000) })
      .expect(413);

    expect(res.body).toMatchObject({
      statusCode: 413,
      error: 'Payload Too Large',
      code: 'body.tooLarge',
    });
  });

  it('still parse a valid body', async () => {
    await http()
      .post('/api/closures')
      .send({ startDate: '2026-11-09', endDate: '2026-11-10', label: 'Pont' })
      .expect(201);
  });
});
