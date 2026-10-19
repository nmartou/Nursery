import { computeEnrollmentStatus } from './enrollment-status.util.js';

describe('computeEnrollmentStatus', () => {
  const period = { enrollmentStart: '2026-09-01', enrollmentEnd: '2027-07-30' };

  it('is upcoming before the first day', () => {
    expect(computeEnrollmentStatus(period, '2026-08-31')).toBe('upcoming');
  });

  it('is enrolled from the first to the last day, both included', () => {
    expect(computeEnrollmentStatus(period, '2026-09-01')).toBe('enrolled');
    expect(computeEnrollmentStatus(period, '2027-07-30')).toBe('enrolled');
  });

  it('is ended after the last day', () => {
    expect(computeEnrollmentStatus(period, '2027-07-31')).toBe('ended');
  });

  it('never ends without an end date', () => {
    expect(
      computeEnrollmentStatus({ ...period, enrollmentEnd: null }, '2099-01-01'),
    ).toBe('enrolled');
  });
});
