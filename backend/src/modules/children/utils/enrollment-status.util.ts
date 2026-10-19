import type { Child, EnrollmentStatus } from '../models/child.model.js';

/** Status of the enrollment on `today` (`YYYY-MM-DD`); bounds are inclusive. */
export function computeEnrollmentStatus(
  child: Pick<Child, 'enrollmentStart' | 'enrollmentEnd'>,
  today: string,
): EnrollmentStatus {
  if (today < child.enrollmentStart) {
    return 'upcoming';
  }
  if (child.enrollmentEnd !== null && today > child.enrollmentEnd) {
    return 'ended';
  }
  return 'enrolled';
}
