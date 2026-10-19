import type { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';
import type { Child, ChildPayload, ParentRelationship } from '../models/child.model';

export interface ParentFormValue {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  relationship: ParentRelationship;
}

export interface ContactFormValue {
  firstName: string;
  lastName: string;
  relationship: string;
  phone: string;
}

/** Raw value of the registration form: the optional end date is an empty string, not null. */
export interface ChildFormValue {
  firstName: string;
  lastName: string;
  birthDate: string;
  enrollmentStart: string;
  enrollmentEnd: string;
  parents: ParentFormValue[];
  contacts: ContactFormValue[];
}

export function emptyParent(relationship: ParentRelationship = 'mother'): ParentFormValue {
  return { firstName: '', lastName: '', email: '', phone: '', relationship };
}

export function emptyContact(): ContactFormValue {
  return { firstName: '', lastName: '', relationship: '', phone: '' };
}

/** A new registration starts with one parent to fill in. */
export function emptyFormValue(): ChildFormValue {
  return {
    firstName: '',
    lastName: '',
    birthDate: '',
    enrollmentStart: '',
    enrollmentEnd: '',
    parents: [emptyParent()],
    contacts: [],
  };
}

export function toFormValue(child: Child): ChildFormValue {
  return {
    firstName: child.firstName,
    lastName: child.lastName,
    birthDate: child.birthDate,
    enrollmentStart: child.enrollmentStart,
    enrollmentEnd: child.enrollmentEnd ?? '',
    parents: child.parents.map((parent) => ({
      firstName: parent.firstName,
      lastName: parent.lastName,
      email: parent.email,
      phone: parent.phone ?? '',
      relationship: parent.relationship,
    })),
    contacts: child.contacts.map((contact) => ({ ...contact })),
  };
}

export function toPayload(value: ChildFormValue): ChildPayload {
  return {
    firstName: value.firstName.trim(),
    lastName: value.lastName.trim(),
    birthDate: value.birthDate,
    enrollmentStart: value.enrollmentStart,
    enrollmentEnd: value.enrollmentEnd === '' ? null : value.enrollmentEnd,
    parents: value.parents.map((parent) => ({
      firstName: parent.firstName.trim(),
      lastName: parent.lastName.trim(),
      email: parent.email.trim(),
      phone: parent.phone.trim(),
      relationship: parent.relationship,
    })),
    contacts: value.contacts.map((contact) => ({
      firstName: contact.firstName.trim(),
      lastName: contact.lastName.trim(),
      relationship: contact.relationship.trim(),
      phone: contact.phone.trim(),
    })),
  };
}

/**
 * Group validator, same rules as the API: the enrollment cannot start before
 * the birth, and its end (when known) cannot precede its start.
 */
export const enrollmentDatesValidator: ValidatorFn = (
  group: AbstractControl,
): ValidationErrors | null => {
  const { birthDate, enrollmentStart, enrollmentEnd } = group.getRawValue() as ChildFormValue;
  const errors: ValidationErrors = {};
  if (birthDate !== '' && enrollmentStart !== '' && enrollmentStart < birthDate) {
    errors['startBeforeBirth'] = true;
  }
  if (enrollmentStart !== '' && enrollmentEnd !== '' && enrollmentEnd < enrollmentStart) {
    errors['endBeforeStart'] = true;
  }
  return Object.keys(errors).length > 0 ? errors : null;
};

/** Array validator: two parents cannot share an email (it identifies a parent). */
export const distinctEmailsValidator: ValidatorFn = (
  array: AbstractControl,
): ValidationErrors | null => {
  const emails = (array.getRawValue() as ParentFormValue[])
    .map((parent) => parent.email.trim().toLowerCase())
    .filter((email) => email !== '');
  return new Set(emails).size === emails.length ? null : { duplicateEmail: true };
};

function isBlank(fields: Record<string, string>, ignored: readonly string[] = []): boolean {
  return Object.entries(fields).every(
    ([key, value]) => ignored.includes(key) || value.trim() === '',
  );
}

/**
 * Comparable form content, to tell whether the user changed something: rows
 * added but left empty (a contact, or a parent whose relationship is only the
 * pre-selected default) do not count as a change.
 */
export function comparableValue(value: ChildFormValue): string {
  return JSON.stringify({
    ...value,
    parents: value.parents.filter((parent) => !isBlank({ ...parent }, ['relationship'])),
    contacts: value.contacts.filter((contact) => !isBlank({ ...contact })),
  });
}
