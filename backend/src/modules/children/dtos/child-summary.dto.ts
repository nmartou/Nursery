import type {
  EnrollmentStatus,
  ParentRelationship,
} from '../models/child.model.js';

export class ChildParentSummaryDto {
  firstName: string;
  lastName: string;
  relationship: ParentRelationship;
  phone: string | null;
}

/** One row of the children list. */
export class ChildSummaryDto {
  id: string;
  firstName: string;
  lastName: string;
  birthDate: string;
  enrollmentStart: string;
  enrollmentEnd: string | null;
  enrollmentStatus: EnrollmentStatus;
  parents: ChildParentSummaryDto[];
  contactCount: number;
  updatedAt: string;
}

export class ChildListResponseDto {
  /** `YYYY-MM-DD` the enrollment statuses were computed for. */
  today: string;
  children: ChildSummaryDto[];
}
