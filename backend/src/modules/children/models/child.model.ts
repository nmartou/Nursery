export type ParentRelationship = 'mother' | 'father' | 'guardian' | 'other';

/** Where the child stands, relative to today, in its enrollment period. */
export type EnrollmentStatus = 'upcoming' | 'enrolled' | 'ended';

/** A parent or legal guardian, possibly shared with siblings. */
export interface ChildParent {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  relationship: ParentRelationship;
}

/** Someone else to call when the parents cannot be reached. */
export interface ChildContact {
  firstName: string;
  lastName: string;
  relationship: string;
  phone: string;
}

export interface Child {
  id: string;
  firstName: string;
  lastName: string;
  /** `YYYY-MM-DD` */
  birthDate: string;
  /** `YYYY-MM-DD`, first day of attendance */
  enrollmentStart: string;
  /** `YYYY-MM-DD`, last day of attendance; null when not known yet */
  enrollmentEnd: string | null;
  /** Ordered: the first parent is the main contact. */
  parents: ChildParent[];
  contacts: ChildContact[];
  createdAt: Date;
  updatedAt: Date;
}

/** What the staff fills in when registering or editing a child. */
export interface ChildInput {
  firstName: string;
  lastName: string;
  birthDate: string;
  enrollmentStart: string;
  enrollmentEnd: string | null;
  parents: Omit<ChildParent, 'id'>[];
  contacts: ChildContact[];
}
