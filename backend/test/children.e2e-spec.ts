import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { Database } from '../src/common/database/database.module.js';
import {
  childContact,
  nursery,
  parent,
} from '../src/common/database/schema.js';
import { createTestApp } from './support/test-app.js';

/** A valid registration; tests override what they need. */
function registration(overrides: Record<string, unknown> = {}) {
  return {
    firstName: 'Léa',
    lastName: 'Martin',
    birthDate: '2024-03-12',
    enrollmentStart: '2026-10-19',
    enrollmentEnd: null,
    parents: [
      {
        firstName: 'Claire',
        lastName: 'Martin',
        email: 'Claire.Martin@example.com',
        phone: '06 01 02 03 04',
        relationship: 'mother',
      },
    ],
    contacts: [
      {
        firstName: 'Jeanne',
        lastName: 'Durand',
        relationship: 'Grand-mère',
        phone: '+33 6 11 22 33 44',
      },
    ],
    ...overrides,
  };
}

interface ReportSummary {
  childFirstName: string;
}

describe('Children API (e2e)', () => {
  let app: INestApplication;
  let db: Database;

  beforeEach(async () => {
    ({ app, db } = await createTestApp());
  });

  afterEach(async () => {
    await app.close();
  });

  const http = () => request(app.getHttpServer());

  async function create(overrides: Record<string, unknown> = {}) {
    const res = await http()
      .post('/api/children')
      .send(registration(overrides))
      .expect(201);
    return res.body as { id: string } & Record<string, unknown>;
  }

  async function reportNames(date: string): Promise<string[]> {
    const res = await http()
      .get('/api/daily-reports')
      .query({ date })
      .expect(200);
    return (res.body.reports as ReportSummary[]).map((r) => r.childFirstName);
  }

  describe('registration', () => {
    it('POST /api/children registers a child with parents and contacts', async () => {
      const created = await create();

      expect(created).toMatchObject({
        firstName: 'Léa',
        lastName: 'Martin',
        enrollmentStart: '2026-10-19',
        enrollmentEnd: null,
        parents: [
          {
            firstName: 'Claire',
            email: 'claire.martin@example.com', // normalized
            phone: '06 01 02 03 04',
            relationship: 'mother',
          },
        ],
        contacts: [{ firstName: 'Jeanne', relationship: 'Grand-mère' }],
      });

      const detail = await http()
        .get(`/api/children/${created.id}`)
        .expect(200);
      expect(detail.body).toEqual(created);
    });

    it('creates the nursery on the first registration of an empty database', async () => {
      await create();
      const nurseries = await db.select().from(nursery);
      expect(nurseries).toHaveLength(1);
    });

    it('GET /api/children lists the children with their enrollment status', async () => {
      await create({
        firstName: 'Ancien',
        enrollmentStart: '2024-09-02',
        enrollmentEnd: '2025-07-31',
      });
      await create({
        firstName: 'Futur',
        birthDate: '2026-01-01',
        enrollmentStart: '2099-09-01',
        parents: [{ ...registration().parents[0], email: 'futur@example.com' }],
      });
      await create({ firstName: 'Présent', enrollmentStart: '2025-09-01' });

      const res = await http().get('/api/children').expect(200);
      const statuses = Object.fromEntries(
        (
          res.body.children as { firstName: string; enrollmentStatus: string }[]
        ).map((c) => [c.firstName, c.enrollmentStatus]),
      );
      expect(res.body.today).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(statuses).toEqual({
        Ancien: 'ended',
        Futur: 'upcoming',
        Présent: 'enrolled',
      });
      expect(res.body.children[0]).toMatchObject({
        parents: [{ firstName: 'Claire', relationship: 'mother' }],
        contactCount: 1,
      });
    });
  });

  describe('validation', () => {
    it.each([
      ['no parent', { parents: [] }],
      ['an end before the start', { enrollmentEnd: '2026-10-01' }],
      ['an enrollment before birth', { birthDate: '2026-11-01' }],
      ['an invalid date', { birthDate: '2024-02-30' }],
      ['a missing first name', { firstName: '' }],
      [
        'twice the same parent email',
        {
          parents: [
            registration().parents[0],
            {
              ...registration().parents[0],
              firstName: 'Paul',
              relationship: 'father',
            },
          ],
        },
      ],
      [
        'an invalid parent phone',
        { parents: [{ ...registration().parents[0], phone: 'abc' }] },
      ],
      [
        'an unknown relationship',
        { parents: [{ ...registration().parents[0], relationship: 'uncle' }] },
      ],
      [
        'a contact without phone',
        { contacts: [{ ...registration().contacts[0], phone: '' }] },
      ],
    ])('rejects %s', async (_case, overrides) => {
      await http()
        .post('/api/children')
        .send(registration(overrides))
        .expect(400);
    });

    it('returns 400 for a malformed id and 404 for an unknown child', async () => {
      await http().get('/api/children/not-a-uuid').expect(400);
      await http()
        .get('/api/children/00000000-0000-4000-8000-000000000000')
        .expect(404);
      await http()
        .put('/api/children/00000000-0000-4000-8000-000000000000')
        .send(registration())
        .expect(404);
    });
  });

  describe('editing', () => {
    it('PUT /api/children/:id replaces the child, its parents and contacts', async () => {
      const { id } = await create();

      const res = await http()
        .put(`/api/children/${id}`)
        .send(
          registration({
            lastName: 'Martin-Dupont',
            enrollmentEnd: '2027-07-30',
            parents: [
              {
                firstName: 'Paul',
                lastName: 'Dupont',
                email: 'paul.dupont@example.com',
                phone: '0612345678',
                relationship: 'father',
              },
            ],
            contacts: [],
          }),
        )
        .expect(200);

      expect(res.body).toMatchObject({
        lastName: 'Martin-Dupont',
        enrollmentEnd: '2027-07-30',
        parents: [{ firstName: 'Paul', relationship: 'father' }],
        contacts: [],
      });
      // Claire is no longer linked to any child: her personal data is removed.
      const emails = (await db.select().from(parent)).map((p) => p.email);
      expect(emails).toEqual(['paul.dupont@example.com']);
      expect(await db.select().from(childContact)).toEqual([]);
    });

    it('shares a parent between siblings through their email', async () => {
      await create({ firstName: 'Léa' });
      await create({
        firstName: 'Tom',
        birthDate: '2025-06-01',
        parents: [
          {
            ...registration().parents[0],
            phone: '07 00 00 00 00',
            relationship: 'mother',
          },
        ],
      });

      const parents = await db.select().from(parent);
      expect(parents).toHaveLength(1);
      expect(parents[0].phone).toBe('07 00 00 00 00');
    });
  });

  describe('daily reports', () => {
    it('a newly registered child gets reports from its first day', async () => {
      await create({ firstName: 'Nouveau', enrollmentStart: '2026-10-19' });

      expect(await reportNames('2026-10-16')).toEqual([]);
      expect(await reportNames('2026-10-19')).toEqual(['Nouveau']);

      const stats = await http()
        .get('/api/daily-reports/stats?date=2026-10-19')
        .expect(200);
      expect(stats.body).toMatchObject({ total: 1, byStatus: { todo: 1 } });
    });

    it('ending the enrollment removes the child from the following days', async () => {
      const { id } = await create({
        firstName: 'Partant',
        enrollmentStart: '2026-10-01',
      });
      expect(await reportNames('2026-10-20')).toEqual(['Partant']);

      await http()
        .put(`/api/children/${id}`)
        .send(
          registration({
            firstName: 'Partant',
            enrollmentStart: '2026-10-01',
            enrollmentEnd: '2026-10-19',
          }),
        )
        .expect(200);

      expect(await reportNames('2026-10-19')).toEqual(['Partant']);
      // The report already created for the 20th is kept but no longer listed.
      expect(await reportNames('2026-10-20')).toEqual([]);
    });

    it('reports show the updated name of the child', async () => {
      const { id } = await create({ firstName: 'Léa' });
      await http()
        .put(`/api/children/${id}`)
        .send(registration({ firstName: 'Léana' }))
        .expect(200);
      expect(await reportNames('2026-10-19')).toEqual(['Léana']);
    });
  });
});
