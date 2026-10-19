import type { Child } from '../models/child.model.js';

/** A registration as the API receives it (email not yet lower-cased). */
export const SAVE_CHILD_PAYLOAD = {
  firstName: 'Léa',
  lastName: 'Martin',
  birthDate: '2024-03-12',
  enrollmentStart: '2026-09-01',
  enrollmentEnd: null,
  parents: [
    {
      firstName: 'Claire',
      lastName: 'Martin',
      email: 'Claire.Martin@Example.com',
      phone: '06 01 02 03 04',
      relationship: 'mother' as const,
    },
  ],
  contacts: [
    {
      firstName: 'Jeanne',
      lastName: 'Durand',
      relationship: 'Grand-mère',
      phone: '06 11 22 33 44',
    },
  ],
};

export const CHILD: Child = {
  id: 'c1',
  firstName: 'Léa',
  lastName: 'Martin',
  birthDate: '2024-03-12',
  enrollmentStart: '2026-09-01',
  enrollmentEnd: '2027-07-30',
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
      lastName: 'Durand',
      relationship: 'Grand-mère',
      phone: '06 11 22 33 44',
    },
  ],
  createdAt: new Date('2026-08-20T08:00:00Z'),
  updatedAt: new Date('2026-08-21T08:00:00Z'),
};
