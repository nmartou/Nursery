export type ParentRelationship = 'mother' | 'father' | 'guardian' | 'other';

/** Where the child stands, relative to today, in its enrollment period. */
export type EnrollmentStatus = 'upcoming' | 'enrolled' | 'ended';

export interface ChildParent {
  id?: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  relationship: ParentRelationship;
}

export interface ChildContact {
  firstName: string;
  lastName: string;
  /** Free text: grand-mère, voisin, nounou… */
  relationship: string;
  phone: string;
}

/** `GET /children/:id`, also returned after saving. */
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
  enrollmentStatus: EnrollmentStatus;
  parents: ChildParent[];
  contacts: ChildContact[];
  createdAt: string;
  updatedAt: string;
}

/** One row of `GET /children`. */
export interface ChildSummary {
  id: string;
  firstName: string;
  lastName: string;
  birthDate: string;
  enrollmentStart: string;
  enrollmentEnd: string | null;
  enrollmentStatus: EnrollmentStatus;
  parents: Pick<ChildParent, 'firstName' | 'lastName' | 'relationship' | 'phone'>[];
  contactCount: number;
  updatedAt: string;
}

export interface ChildList {
  /** `YYYY-MM-DD` the statuses were computed for. */
  today: string;
  children: ChildSummary[];
}

/** Body of `POST /children` and `PUT /children/:id`. */
export interface ChildPayload {
  firstName: string;
  lastName: string;
  birthDate: string;
  enrollmentStart: string;
  enrollmentEnd: string | null;
  parents: (Omit<ChildParent, 'id' | 'phone'> & { phone: string })[];
  contacts: ChildContact[];
}
