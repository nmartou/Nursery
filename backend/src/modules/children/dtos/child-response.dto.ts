import type {
  EnrollmentStatus,
  ParentRelationship,
} from '../models/child.model.js';

export class ParentResponseDto {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  relationship: ParentRelationship;
}

export class ContactResponseDto {
  firstName: string;
  lastName: string;
  relationship: string;
  phone: string;
}

export class ChildAbsenceResponseDto {
  id: string;
  startDate: string;
  endDate: string;
  /** Null for absences noted in the daily reports. */
  kind: 'vacation' | 'sickness' | 'other' | null;
  comment: string | null;
  source: 'calendar' | 'report';
}

/** A child with everything the registration form needs. */
export class ChildResponseDto {
  id: string;
  firstName: string;
  lastName: string;
  birthDate: string;
  enrollmentStart: string;
  enrollmentEnd: string | null;
  enrollmentStatus: EnrollmentStatus;
  parents: ParentResponseDto[];
  contacts: ContactResponseDto[];
  /** Every absence, most recent first: planned in the calendar or noted in the reports. */
  absences: ChildAbsenceResponseDto[];
  createdAt: string;
  updatedAt: string;
}
