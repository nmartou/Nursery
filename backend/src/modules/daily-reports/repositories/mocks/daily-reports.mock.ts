import type { Child } from '../../models/child.model.js';
import type { DailyReportContent } from '../../models/daily-report.model.js';

/** Mock data used while no PostgreSQL database is available (mirrors database/seed.sql). */

export const MOCK_CHILDREN: Child[] = [
  {
    id: 'c0000000-0000-0000-0000-000000000001',
    firstName: 'Léa',
    lastName: 'Martin',
  },
  {
    id: 'c0000000-0000-0000-0000-000000000002',
    firstName: 'Hugo',
    lastName: 'Bernard',
  },
  {
    id: 'c0000000-0000-0000-0000-000000000003',
    firstName: 'Chloé',
    lastName: 'Dubois',
  },
  {
    id: 'c0000000-0000-0000-0000-000000000004',
    firstName: 'Nathan',
    lastName: 'Petit',
  },
  {
    id: 'c0000000-0000-0000-0000-000000000005',
    firstName: 'Inès',
    lastName: 'Leroy',
  },
];

export const EMPTY_REPORT_CONTENT: DailyReportContent = {
  absent: false,
  absenceComment: null,
  arrivalTime: null,
  departureTime: null,
  meals: [],
  bottles: [],
  mealComment: null,
  naps: [],
  noNap: false,
  napComment: null,
  stoolStatus: 'normal',
  stoolComment: null,
  parentNote: null,
};

/** Pre-filled content for the seeded day, keyed by child id. Children not listed stay empty. */
export const MOCK_REPORT_CONTENTS: Record<
  string,
  Partial<DailyReportContent>
> = {
  // Complete
  'c0000000-0000-0000-0000-000000000001': {
    arrivalTime: '08:15',
    departureTime: '17:30',
    meals: [
      { label: 'Purée de carottes', quantityGrams: 150 },
      { label: 'Compote de pommes', quantityGrams: 100 },
    ],
    bottles: [{ time: '15:30', quantityMl: 180 }],
    mealComment: 'A tout mangé avec appétit.',
    naps: [{ startTime: '12:30', endTime: '14:45' }],
    napComment: 'Endormie rapidement.',
    parentNote: 'Très bonne journée, beaucoup joué à la pâte à modeler.',
  },
  // In progress: morning only
  'c0000000-0000-0000-0000-000000000002': {
    arrivalTime: '08:40',
    bottles: [{ time: '09:30', quantityMl: 210 }],
    naps: [{ startTime: '10:00', endTime: '10:45' }],
  },
  // Absent
  'c0000000-0000-0000-0000-000000000004': {
    absent: true,
    absenceComment: 'Malade (otite), prévenu par sa maman.',
  },
  // In progress with abnormal stools
  'c0000000-0000-0000-0000-000000000005': {
    arrivalTime: '07:55',
    meals: [{ label: 'Haricots verts et poulet', quantityGrams: 120 }],
    stoolStatus: 'other',
    stoolComment: 'Selles liquides en fin de matinée, à surveiller.',
  },
};
