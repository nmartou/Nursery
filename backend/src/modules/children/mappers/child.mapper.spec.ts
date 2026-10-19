import { CHILD, SAVE_CHILD_PAYLOAD } from '../testing/child.fixtures.js';
import { ChildMapper } from './child.mapper.js';

describe('ChildMapper', () => {
  it('stores emails in lower case', () => {
    const input = ChildMapper.toInput(SAVE_CHILD_PAYLOAD);
    expect(input.parents[0].email).toBe('claire.martin@example.com');
    expect(input.enrollmentEnd).toBeNull();
  });

  it('adds the enrollment status and ISO timestamps to the response', () => {
    const dto = ChildMapper.toResponseDto(CHILD, '2026-10-19');
    expect(dto).toMatchObject({
      enrollmentStatus: 'enrolled',
      updatedAt: '2026-08-21T08:00:00.000Z',
      parents: [{ id: 'p1', relationship: 'mother' }],
    });
  });

  it('keeps only what the list shows in the summary', () => {
    const summary = ChildMapper.toSummaryDto(CHILD, '2027-08-01');
    expect(summary.enrollmentStatus).toBe('ended');
    expect(summary.parents).toEqual([
      {
        firstName: 'Claire',
        lastName: 'Martin',
        relationship: 'mother',
        phone: '06 01 02 03 04',
      },
    ]);
    expect(summary.contactCount).toBe(1);
  });
});

describe('ChildMapper and absences', () => {
  const child = {
    ...CHILD,
    absences: [
      {
        id: 'a1',
        startDate: '2026-09-07',
        endDate: '2026-09-11',
        kind: 'vacation' as const,
        comment: null,
      },
      {
        id: 'a2',
        startDate: '2026-10-19',
        endDate: '2026-10-20',
        kind: 'sickness' as const,
        comment: 'Otite',
      },
      {
        id: 'a3',
        startDate: '2026-12-21',
        endDate: '2026-12-24',
        kind: 'vacation' as const,
        comment: null,
      },
    ],
  };

  it('lists every absence in the detail, past ones included, most recent first', () => {
    const dto = ChildMapper.toResponseDto(
      {
        ...child,
        reportedAbsences: [
          { reportId: 'r1', date: '2026-10-02', comment: 'Fièvre' },
        ],
      },
      '2026-10-20',
    );
    expect(dto.absences.map((a) => [a.id, a.source])).toEqual([
      ['a3', 'calendar'],
      ['a2', 'calendar'],
      ['report-r1', 'report'],
      ['a1', 'calendar'],
    ]);
  });

  it('gives the absence covering today in the summary', () => {
    expect(
      ChildMapper.toSummaryDto(child, '2026-10-19').currentAbsence?.id,
    ).toBe('a2');
    expect(
      ChildMapper.toSummaryDto(child, '2026-10-21').currentAbsence,
    ).toBeNull();
  });
});
