import type { ChildAbsence, EnrollmentStatus, ParentRelationship } from '../models/child.model';

export const PARENT_RELATIONSHIP_LABELS: Record<ParentRelationship, string> = {
  mother: 'Mère',
  father: 'Père',
  guardian: 'Tuteur / tutrice',
  other: 'Autre responsable',
};

export const ENROLLMENT_STATUS_LABELS: Record<EnrollmentStatus, string> = {
  enrolled: 'Inscrit',
  upcoming: 'À venir',
  ended: 'Terminé',
};

/** Filters of the list, in display order. */
export const ENROLLMENT_FILTERS: readonly { value: EnrollmentStatus | 'all'; label: string }[] = [
  { value: 'enrolled', label: 'Inscrits' },
  { value: 'upcoming', label: 'À venir' },
  { value: 'ended', label: 'Anciens' },
  { value: 'all', label: 'Tous' },
];

/** Same rule as the API: digits, spaces and + ( ) . - */
export const PHONE_PATTERN = /^\+?[0-9 ().-]{6,30}$/;

export const MAX_PARENTS = 4;
export const MAX_CONTACTS = 10;

export const ABSENCE_KIND_LABELS: Record<NonNullable<ChildAbsence['kind']>, string> = {
  vacation: 'Congés',
  sickness: 'Maladie',
  other: 'Absence',
};
