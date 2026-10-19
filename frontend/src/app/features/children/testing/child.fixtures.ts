import type { Child, ChildList, ChildSummary } from '../models/child.model';

/** Shared test data for the children feature specs. Today is Monday 19 October 2026. */

export const TODAY = '2026-10-19';

export const CHILD_SUMMARIES: ChildSummary[] = [
  {
    id: 'c1',
    firstName: 'Léa',
    lastName: 'Martin',
    birthDate: '2024-03-12',
    enrollmentStart: '2026-09-01',
    enrollmentEnd: '2027-07-30',
    enrollmentStatus: 'enrolled',
    parents: [
      { firstName: 'Claire', lastName: 'Martin', relationship: 'mother', phone: '06 01 02 03 04' },
    ],
    contactCount: 2,
    currentAbsence: null,
    updatedAt: '2026-09-01T08:00:00.000Z',
  },
  {
    id: 'c2',
    firstName: 'Hugo',
    lastName: 'Bernard',
    birthDate: '2025-01-08',
    enrollmentStart: '2026-09-01',
    enrollmentEnd: null,
    enrollmentStatus: 'enrolled',
    parents: [
      { firstName: 'Sophie', lastName: 'Bernard', relationship: 'mother', phone: '06 11 22 33 44' },
    ],
    contactCount: 0,
    currentAbsence: null,
    updatedAt: '2026-09-01T08:00:00.000Z',
  },
  {
    id: 'c3',
    firstName: 'Émma',
    lastName: 'Moreau',
    birthDate: '2026-04-02',
    enrollmentStart: '2026-11-02',
    enrollmentEnd: null,
    enrollmentStatus: 'upcoming',
    parents: [
      { firstName: 'Laura', lastName: 'Moreau', relationship: 'mother', phone: '07 12 34 56 78' },
    ],
    contactCount: 0,
    currentAbsence: null,
    updatedAt: '2026-10-01T08:00:00.000Z',
  },
  {
    id: 'c4',
    firstName: 'Lucas',
    lastName: 'Garnier',
    birthDate: '2022-12-15',
    enrollmentStart: '2024-09-02',
    enrollmentEnd: '2026-07-31',
    enrollmentStatus: 'ended',
    parents: [
      { firstName: 'Marc', lastName: 'Garnier', relationship: 'father', phone: '06 21 43 65 87' },
    ],
    contactCount: 0,
    currentAbsence: null,
    updatedAt: '2026-07-31T08:00:00.000Z',
  },
];

export const CHILD_LIST: ChildList = { today: TODAY, children: CHILD_SUMMARIES };

export function buildChild(overrides: Partial<Child> = {}): Child {
  return {
    id: 'c1',
    firstName: 'Léa',
    lastName: 'Martin',
    birthDate: '2024-03-12',
    enrollmentStart: '2026-09-01',
    enrollmentEnd: '2027-07-30',
    enrollmentStatus: 'enrolled',
    parents: [
      {
        id: 'p1',
        firstName: 'Claire',
        lastName: 'Martin',
        email: 'claire.martin@example.com',
        phone: '06 01 02 03 04',
        relationship: 'mother',
      },
    ],
    contacts: [
      {
        firstName: 'Jeanne',
        lastName: 'Martin',
        relationship: 'Grand-mère',
        phone: '06 10 20 30 40',
      },
    ],
    absences: [],
    createdAt: '2026-09-01T08:00:00.000Z',
    updatedAt: '2026-09-01T08:00:00.000Z',
    ...overrides,
  };
}
