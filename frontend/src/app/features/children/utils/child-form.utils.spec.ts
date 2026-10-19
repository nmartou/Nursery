import { FormArray, FormControl, FormGroup } from '@angular/forms';
import { buildChild } from '../testing/child.fixtures';
import {
  comparableValue,
  distinctEmailsValidator,
  emptyContact,
  emptyFormValue,
  emptyParent,
  enrollmentDatesValidator,
  toFormValue,
  toPayload,
} from './child-form.utils';

function datesGroup(birthDate: string, enrollmentStart: string, enrollmentEnd: string) {
  return new FormGroup({
    birthDate: new FormControl(birthDate),
    enrollmentStart: new FormControl(enrollmentStart),
    enrollmentEnd: new FormControl(enrollmentEnd),
  });
}

describe('child form utils', () => {
  it('starts a new registration with one parent and no contact', () => {
    const value = emptyFormValue();
    expect(value.parents).toEqual([emptyParent()]);
    expect(value.contacts).toEqual([]);
  });

  it('round-trips a child, turning the missing end date into an empty field and back', () => {
    const child = buildChild({ enrollmentEnd: null });
    const value = toFormValue(child);
    expect(value.enrollmentEnd).toBe('');

    const payload = toPayload(value);
    expect(payload).toEqual({
      firstName: 'Léa',
      lastName: 'Martin',
      birthDate: '2024-03-12',
      enrollmentStart: '2026-09-01',
      enrollmentEnd: null,
      parents: [
        {
          firstName: 'Claire',
          lastName: 'Martin',
          email: 'claire.martin@example.com',
          phone: '06 01 02 03 04',
          relationship: 'mother',
        },
      ],
      contacts: child.contacts,
    });
  });

  it('trims the text fields of the payload', () => {
    const value = toFormValue(buildChild());
    value.firstName = '  Léa ';
    value.parents[0].email = ' claire@example.com ';
    const payload = toPayload(value);
    expect(payload.firstName).toBe('Léa');
    expect(payload.parents[0].email).toBe('claire@example.com');
  });

  describe('enrollmentDatesValidator', () => {
    it('accepts consistent dates, an open end, or missing dates', () => {
      expect(enrollmentDatesValidator(datesGroup('2024-03-12', '2026-09-01', '2027-07-30'))).toBe(
        null,
      );
      expect(enrollmentDatesValidator(datesGroup('2024-03-12', '2026-09-01', ''))).toBe(null);
      expect(enrollmentDatesValidator(datesGroup('', '', ''))).toBe(null);
      expect(enrollmentDatesValidator(datesGroup('2024-03-12', '2026-09-01', '2026-09-01'))).toBe(
        null,
      );
    });

    it('flags an enrollment before birth and an end before the start', () => {
      expect(enrollmentDatesValidator(datesGroup('2026-10-01', '2026-09-01', ''))).toEqual({
        startBeforeBirth: true,
      });
      expect(
        enrollmentDatesValidator(datesGroup('2024-03-12', '2026-09-01', '2026-08-31')),
      ).toEqual({ endBeforeStart: true });
    });
  });

  describe('comparableValue', () => {
    it('ignores the rows added but left empty', () => {
      const loaded = toFormValue(buildChild());
      const withEmptyRows = {
        ...loaded,
        parents: [...loaded.parents, emptyParent('father')],
        contacts: [...loaded.contacts, emptyContact(), { ...emptyContact(), phone: '  ' }],
      };
      expect(comparableValue(withEmptyRows)).toBe(comparableValue(loaded));
    });

    it('sees a filled-in, removed or modified row', () => {
      const loaded = toFormValue(buildChild());
      const filled = {
        ...loaded,
        contacts: [...loaded.contacts, { ...emptyContact(), firstName: 'Paul' }],
      };
      const removed = { ...loaded, contacts: [] };
      const relationship = {
        ...loaded,
        parents: [{ ...loaded.parents[0], relationship: 'guardian' as const }],
      };
      for (const changed of [filled, removed, relationship]) {
        expect(comparableValue(changed)).not.toBe(comparableValue(loaded));
      }
    });
  });

  it('distinctEmailsValidator ignores case, spaces and empty emails', () => {
    const parents = (...emails: string[]) =>
      new FormArray(emails.map((email) => new FormGroup({ email: new FormControl(email) })));
    expect(distinctEmailsValidator(parents('a@x.fr', 'b@x.fr', '', ''))).toBe(null);
    expect(distinctEmailsValidator(parents('a@x.fr', ' A@X.fr '))).toEqual({
      duplicateEmail: true,
    });
  });
});
