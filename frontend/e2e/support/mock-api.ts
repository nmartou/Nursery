import type { Page, Request, Route } from '@playwright/test';

/**
 * In-memory fake of the backend API, installed with `page.route`.
 * It mirrors the backend behaviour the UI relies on: children registered over
 * an enrollment period, daily reports created per weekday for the children
 * enrolled that day, status computed on save, weekends refused.
 */

export const API_URL = 'http://localhost:3000/api';
export const SEED_DATE = '2026-10-16'; // Friday
/** "Today" for the enrollment statuses and ages (Monday). */
export const TODAY = '2026-10-19';

type ReportStatus = 'todo' | 'in_progress' | 'complete' | 'absent';
type EnrollmentStatus = 'upcoming' | 'enrolled' | 'ended';
type ParentRelationship = 'mother' | 'father' | 'guardian' | 'other';

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

export interface MockChild {
  id: string;
  firstName: string;
  lastName: string;
  birthDate: string;
  enrollmentStart: string;
  enrollmentEnd: string | null;
  parents: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    relationship: ParentRelationship;
  }[];
  contacts: { firstName: string; lastName: string; relationship: string; phone: string }[];
  createdAt: string;
  updatedAt: string;
}

export interface RecordedRequest {
  method: string;
  path: string;
  body: unknown;
}

function parent(
  firstName: string,
  lastName: string,
  relationship: ParentRelationship,
  phone: string,
): MockChild['parents'][number] {
  const email = `${firstName}.${lastName}@example.com`.toLowerCase();
  return { firstName, lastName, email, phone, relationship };
}

function seedChild(
  id: string,
  firstName: string,
  lastName: string,
  birthDate: string,
  enrollment: [string, string | null],
  parents: MockChild['parents'],
  contacts: MockChild['contacts'] = [],
): MockChild {
  const [enrollmentStart, enrollmentEnd] = enrollment;
  const stamp = `${enrollmentStart}T08:00:00.000Z`;
  return {
    ...{ id, firstName, lastName, birthDate, enrollmentStart, enrollmentEnd },
    parents,
    contacts,
    createdAt: stamp,
    updatedAt: stamp,
  };
}

function seedChildren(): MockChild[] {
  return [
    seedChild(
      'c1',
      'Léa',
      'Martin',
      '2024-03-12',
      ['2026-09-01', '2027-07-30'],
      [
        parent('Claire', 'Martin', 'mother', '06 01 02 03 04'),
        parent('Thomas', 'Martin', 'father', '06 01 02 03 05'),
      ],
      [
        {
          firstName: 'Jeanne',
          lastName: 'Martin',
          relationship: 'Grand-mère',
          phone: '06 10 20 30 40',
        },
      ],
    ),
    seedChild(
      'c2',
      'Hugo',
      'Bernard',
      '2025-01-08',
      ['2026-09-01', null],
      [parent('Sophie', 'Bernard', 'mother', '06 11 22 33 44')],
    ),
    seedChild(
      'c3',
      'Chloé',
      'Dubois',
      '2024-07-22',
      ['2026-09-01', null],
      [parent('Julien', 'Dubois', 'father', '06 77 88 99 00')],
    ),
    seedChild(
      'c4',
      'Nathan',
      'Petit',
      '2023-11-30',
      ['2026-09-01', '2027-07-30'],
      [parent('Amélie', 'Petit', 'mother', '06 99 88 77 66')],
    ),
    seedChild(
      'c5',
      'Inès',
      'Leroy',
      '2024-05-17',
      ['2026-09-01', null],
      [parent('Karim', 'Leroy', 'father', '06 55 44 33 22')],
    ),
    seedChild(
      'c6',
      'Emma',
      'Moreau',
      '2026-04-02',
      ['2026-11-02', null],
      [parent('Laura', 'Moreau', 'mother', '07 12 34 56 78')],
    ),
    seedChild(
      'c7',
      'Lucas',
      'Garnier',
      '2022-12-15',
      ['2024-09-02', '2026-07-31'],
      [parent('Marc', 'Garnier', 'father', '06 21 43 65 87')],
    ),
  ];
}

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

function isEnrolledOn(child: MockChild, date: string): boolean {
  return (
    child.enrollmentStart <= date && (child.enrollmentEnd === null || child.enrollmentEnd >= date)
  );
}

function enrollmentStatus(child: MockChild): EnrollmentStatus {
  if (TODAY < child.enrollmentStart) return 'upcoming';
  if (child.enrollmentEnd !== null && TODAY > child.enrollmentEnd) return 'ended';
  return 'enrolled';
}

function byName(
  a: { lastName: string; firstName: string },
  b: { lastName: string; firstName: string },
): number {
  const byLastName = a.lastName.localeCompare(b.lastName);
  return byLastName !== 0 ? byLastName : a.firstName.localeCompare(b.firstName);
}

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,PUT,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export class MockApi {
  readonly requests: RecordedRequest[] = [];
  /** Clock used for `updatedAt` on save; override it to assert displayed times. */
  now: () => Date = () => new Date();
  private readonly children: MockChild[] = seedChildren();
  private readonly reports: MockReport[] = [];
  private nextChildId = 100;

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

  /** Requests that changed data (PUT and POST), in call order. */
  saves(): RecordedRequest[] {
    return this.requests.filter((request) => request.method === 'PUT' || request.method === 'POST');
  }

  report(firstName: string, date = SEED_DATE): MockReport {
    return this.reportsOn(date).find((r) => r.childFirstName === firstName)!;
  }

  child(firstName: string): MockChild | undefined {
    return this.children.find((child) => child.firstName === firstName);
  }

  private async handle(route: Route, request: Request): Promise<void> {
    const method = request.method();
    if (method === 'OPTIONS') {
      return route.fulfill({ status: 204, headers: CORS_HEADERS });
    }

    const url = new URL(request.url());
    const path = url.pathname.replace(/^\/api/, '');
    const body = request.postDataJSON() as unknown;
    this.requests.push({ method, path: url.pathname + url.search, body });

    if (path === '/children' || path.startsWith('/children/')) {
      return this.handleChildren(route, method, path, body as Partial<MockChild> | null);
    }

    if (method === 'GET' && (path === '/daily-reports' || path === '/daily-reports/stats')) {
      const date = url.searchParams.get('date') ?? SEED_DATE;
      if (!isWeekday(date)) {
        return this.json(route, 400, { message: 'La crèche est fermée le week-end.' });
      }
      this.createReports(date);
      const reports = this.reportsOn(date);
      if (path === '/daily-reports/stats') {
        const byStatus: Record<ReportStatus, number> = {
          todo: 0,
          in_progress: 0,
          complete: 0,
          absent: 0,
        };
        for (const r of reports) {
          byStatus[r.status]++;
        }
        return this.json(route, 200, { date, total: reports.length, byStatus });
      }
      return this.json(route, 200, {
        date,
        reports: reports.map(
          ({ id, childId, childFirstName, childLastName, status, updatedAt }) => ({
            id,
            childId,
            childFirstName,
            childLastName,
            status,
            updatedAt,
          }),
        ),
      });
    }

    const match = /^\/daily-reports\/([^/]+)$/.exec(path);
    const report = match && this.reports.find((r) => r.id === match[1]);
    if (match && !report) {
      return this.json(route, 404, { message: 'Not found' });
    }
    if (report && method === 'GET') {
      return this.json(route, 200, this.withChildName(report));
    }
    if (report && method === 'PUT') {
      Object.assign(report, body, { updatedAt: this.now().toISOString() });
      report.status = computeStatus(report);
      return this.json(route, 200, this.withChildName(report));
    }

    return this.json(route, 404, { message: `Unhandled ${method} ${path}` });
  }

  private handleChildren(
    route: Route,
    method: string,
    path: string,
    body: Partial<MockChild> | null,
  ): Promise<void> {
    if (method === 'GET' && path === '/children') {
      const children = [...this.children].sort(byName).map((child) => ({
        id: child.id,
        firstName: child.firstName,
        lastName: child.lastName,
        birthDate: child.birthDate,
        enrollmentStart: child.enrollmentStart,
        enrollmentEnd: child.enrollmentEnd,
        enrollmentStatus: enrollmentStatus(child),
        parents: child.parents.map(({ firstName, lastName, relationship, phone }) => ({
          firstName,
          lastName,
          relationship,
          phone,
        })),
        contactCount: child.contacts.length,
        updatedAt: child.updatedAt,
      }));
      return this.json(route, 200, { today: TODAY, children });
    }

    if (method === 'POST' && path === '/children' && body) {
      const stamp = this.now().toISOString();
      const child = {
        ...(body as MockChild),
        id: `c${this.nextChildId++}`,
        createdAt: stamp,
        updatedAt: stamp,
      };
      this.children.push(child);
      return this.json(route, 201, this.childDto(child));
    }

    const child = this.children.find((c) => c.id === path.replace('/children/', ''));
    if (!child) {
      return this.json(route, 404, { message: 'Not found' });
    }
    if (method === 'GET') {
      return this.json(route, 200, this.childDto(child));
    }
    if (method === 'PUT' && body) {
      Object.assign(child, body, { updatedAt: this.now().toISOString() });
      return this.json(route, 200, this.childDto(child));
    }
    return this.json(route, 404, { message: `Unhandled ${method} ${path}` });
  }

  private childDto(child: MockChild) {
    return { ...child, enrollmentStatus: enrollmentStatus(child) };
  }

  private json(route: Route, status: number, body: unknown): Promise<void> {
    return route.fulfill({ status, headers: CORS_HEADERS, json: body });
  }

  /** Reports of the day of the children enrolled that day, with their current names. */
  private reportsOn(date: string): MockReport[] {
    return this.reports
      .filter((report) => report.date === date)
      .filter((report) => {
        const child = this.children.find((c) => c.id === report.childId);
        return child !== undefined && isEnrolledOn(child, date);
      })
      .map((report) => this.withChildName(report))
      .sort((a, b) =>
        byName(
          { lastName: a.childLastName, firstName: a.childFirstName },
          { lastName: b.childLastName, firstName: b.childFirstName },
        ),
      );
  }

  /** Reports always show the child's current name (it may have been edited). */
  private withChildName(report: MockReport): MockReport {
    const child = this.children.find((c) => c.id === report.childId);
    if (child) {
      report.childFirstName = child.firstName;
      report.childLastName = child.lastName;
    }
    return report;
  }

  /** Creates the missing reports of the day for the children enrolled that day. */
  private createReports(date: string): void {
    const seeded = date === SEED_DATE;
    for (const child of this.children) {
      const exists = this.reports.some((r) => r.childId === child.id && r.date === date);
      if (exists || !isEnrolledOn(child, date)) {
        continue;
      }
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
  }
}
