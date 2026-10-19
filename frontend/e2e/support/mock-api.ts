import type { Page, Request, Route } from '@playwright/test';

/**
 * In-memory fake of the backend API, installed with `page.route`.
 * It mirrors the backend behaviour the UI relies on: daily reports created
 * per weekday, status computed on save, weekends refused.
 */

export const API_URL = 'http://localhost:3000/api';
export const SEED_DATE = '2026-10-16'; // Friday

type ReportStatus = 'todo' | 'in_progress' | 'complete' | 'absent';

export interface MockReport {
  id: string;
  childId: string;
  childFirstName: string;
  childLastName: string;
  date: string;
  status: ReportStatus;
  updatedAt: string;
  absent: boolean;
  absenceComment: string | null;
  arrivalTime: string | null;
  departureTime: string | null;
  meals: { label: string; quantityGrams: number | null }[];
  bottles: { time: string; quantityMl: number | null }[];
  mealComment: string | null;
  naps: { startTime: string; endTime: string | null }[];
  noNap: boolean;
  napComment: string | null;
  stoolStatus: 'normal' | 'other';
  stoolComment: string | null;
  parentNote: string | null;
}

export interface RecordedRequest {
  method: string;
  path: string;
  body: unknown;
}

const CHILDREN = [
  { id: 'c1', firstName: 'Léa', lastName: 'Martin' },
  { id: 'c2', firstName: 'Hugo', lastName: 'Bernard' },
  { id: 'c3', firstName: 'Chloé', lastName: 'Dubois' },
  { id: 'c4', firstName: 'Nathan', lastName: 'Petit' },
  { id: 'c5', firstName: 'Inès', lastName: 'Leroy' },
];

const SEED_CONTENT: Record<string, Partial<MockReport>> = {
  c1: {
    arrivalTime: '08:15',
    departureTime: '17:30',
    meals: [
      { label: 'Purée de carottes', quantityGrams: 150 },
      { label: 'Compote de pommes', quantityGrams: 100 },
    ],
    bottles: [{ time: '15:30', quantityMl: 180 }],
    naps: [{ startTime: '12:30', endTime: '14:45' }],
  },
  c2: {
    arrivalTime: '08:40',
    bottles: [{ time: '09:30', quantityMl: 210 }],
    naps: [{ startTime: '10:00', endTime: '10:45' }],
  },
  c4: { absent: true, absenceComment: 'Malade (otite).' },
  c5: {
    arrivalTime: '07:55',
    meals: [{ label: 'Haricots verts et poulet', quantityGrams: 120 }],
    stoolStatus: 'other',
    stoolComment: 'Selles liquides, à surveiller.',
  },
};

function computeStatus(report: MockReport): ReportStatus {
  if (report.absent) return 'absent';
  const food = report.meals.length > 0 || report.bottles.length > 0;
  const nap = report.naps.length > 0 || report.noNap;
  if (report.arrivalTime && report.departureTime && food && nap) return 'complete';
  const any =
    !!report.arrivalTime ||
    !!report.departureTime ||
    food ||
    nap ||
    !!report.mealComment ||
    !!report.napComment ||
    report.stoolStatus !== 'normal' ||
    !!report.parentNote;
  return any ? 'in_progress' : 'todo';
}

function isWeekday(isoDate: string): boolean {
  const day = new Date(`${isoDate}T00:00:00Z`).getUTCDay();
  return day !== 0 && day !== 6;
}

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,PUT,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export class MockApi {
  readonly requests: RecordedRequest[] = [];
  /** Clock used for `updatedAt` on save; override it to assert displayed times. */
  now: () => Date = () => new Date();
  private readonly reports: MockReport[] = [];

  private constructor() {
    this.createReports(SEED_DATE);
  }

  /** Installs the fake API on the page. With `offline`, every call fails like a stopped backend. */
  static async install(page: Page, options: { offline?: boolean } = {}): Promise<MockApi> {
    const api = new MockApi();
    await page.route(`${API_URL}/**`, (route, request) =>
      options.offline ? route.abort('connectionrefused') : api.handle(route, request),
    );
    return api;
  }

  /** Requests that changed data (PUT), in call order. */
  saves(): RecordedRequest[] {
    return this.requests.filter((request) => request.method === 'PUT');
  }

  report(firstName: string, date = SEED_DATE): MockReport {
    return this.reports.find((r) => r.childFirstName === firstName && r.date === date)!;
  }

  private async handle(route: Route, request: Request): Promise<void> {
    const method = request.method();
    if (method === 'OPTIONS') {
      return route.fulfill({ status: 204, headers: CORS_HEADERS });
    }

    const url = new URL(request.url());
    const path = url.pathname.replace(/^\/api/, '');
    const body = request.postDataJSON() as Partial<MockReport> | null;
    this.requests.push({ method, path: url.pathname + url.search, body });

    if (method === 'GET' && path === '/daily-reports') {
      const date = url.searchParams.get('date') ?? SEED_DATE;
      if (!isWeekday(date)) {
        return this.json(route, 400, { message: 'La crèche est fermée le week-end.' });
      }
      this.createReports(date);
      const reports = this.reports
        .filter((report) => report.date === date)
        .map(({ id, childId, childFirstName, childLastName, status, updatedAt }) => ({
          id,
          childId,
          childFirstName,
          childLastName,
          status,
          updatedAt,
        }));
      return this.json(route, 200, { date, reports });
    }

    const match = /^\/daily-reports\/([^/]+)$/.exec(path);
    const report = match && this.reports.find((r) => r.id === match[1]);
    if (match && !report) {
      return this.json(route, 404, { message: 'Not found' });
    }
    if (report && method === 'GET') {
      return this.json(route, 200, report);
    }
    if (report && method === 'PUT') {
      Object.assign(report, body, { updatedAt: this.now().toISOString() });
      report.status = computeStatus(report);
      return this.json(route, 200, report);
    }

    return this.json(route, 404, { message: `Unhandled ${method} ${path}` });
  }

  private json(route: Route, status: number, body: unknown): Promise<void> {
    return route.fulfill({ status, headers: CORS_HEADERS, json: body });
  }

  private createReports(date: string): void {
    if (this.reports.some((report) => report.date === date)) {
      return;
    }
    const seeded = date === SEED_DATE;
    for (const child of CHILDREN) {
      const report: MockReport = {
        id: `${child.id}-${date}`,
        childId: child.id,
        childFirstName: child.firstName,
        childLastName: child.lastName,
        date,
        status: 'todo',
        updatedAt: `${date}T06:00:00.000Z`,
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
        ...(seeded ? SEED_CONTENT[child.id] : {}),
      };
      report.status = computeStatus(report);
      this.reports.push(report);
    }
    this.reports.sort((a, b) => {
      const byLastName = a.childLastName.localeCompare(b.childLastName);
      return byLastName !== 0 ? byLastName : a.childFirstName.localeCompare(b.childFirstName);
    });
  }
}
