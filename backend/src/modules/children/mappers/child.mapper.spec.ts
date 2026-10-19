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
