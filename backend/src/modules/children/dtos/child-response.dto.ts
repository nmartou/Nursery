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
  createdAt: string;
  updatedAt: string;
}
