import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import {
  type FormArray,
  NonNullableFormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import {
  MAX_CONTACTS,
  MAX_PARENTS,
  PARENT_RELATIONSHIP_LABELS,
  PHONE_PATTERN,
} from '../../constants/child.constants';
import type { Child, ChildPayload, ParentRelationship } from '../../models/child.model';
import {
  type ChildFormValue,
  comparableValue,
  type ContactFormValue,
  distinctEmailsValidator,
  emptyContact,
  emptyFormValue,
  emptyParent,
  enrollmentDatesValidator,
  type ParentFormValue,
  toFormValue,
  toPayload,
} from '../../utils/child-form.utils';
import { RouterLink } from '@angular/router';
import { todayIsoDate } from '../../../../shared/utils/date.utils';
import {
  absenceLabel,
  absenceSource,
  formatPeriod,
  groupAbsences,
} from '../../utils/absence.utils';
import { EnrollmentBadge } from '../enrollment-badge/enrollment-badge';

function parentGroup(fb: NonNullableFormBuilder, value: ParentFormValue) {
  return fb.group({
    relationship: fb.control<ParentRelationship>(value.relationship),
    firstName: [value.firstName, [Validators.required, Validators.maxLength(100)]],
    lastName: [value.lastName, [Validators.required, Validators.maxLength(100)]],
    email: [value.email, [Validators.required, Validators.email, Validators.maxLength(255)]],
    phone: [value.phone, [Validators.required, Validators.pattern(PHONE_PATTERN)]],
  });
}

function contactGroup(fb: NonNullableFormBuilder, value: ContactFormValue) {
  return fb.group({
    firstName: [value.firstName, [Validators.required, Validators.maxLength(100)]],
    lastName: [value.lastName, [Validators.required, Validators.maxLength(100)]],
    relationship: [value.relationship, [Validators.required, Validators.maxLength(50)]],
    phone: [value.phone, [Validators.required, Validators.pattern(PHONE_PATTERN)]],
  });
}

const PARENTS_VALIDATORS = [Validators.minLength(1), distinctEmailsValidator];

/** Registration of a new child (`child` null) or edition of an existing one. */
@Component({
  selector: 'app-child-form',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, EnrollmentBadge, RouterLink],
  templateUrl: './child-form.html',
  styleUrl: './child-form.scss',
})
export class ChildForm {
  private readonly fb = inject(NonNullableFormBuilder);

  readonly child = input<Child | null>(null);
  readonly saving = input(false);
  readonly saveError = input<string | null>(null);
  readonly saveChild = output<ChildPayload>();
  readonly cancelForm = output<void>();

  readonly form = this.fb.group(
    {
      firstName: ['', [Validators.required, Validators.maxLength(100)]],
      lastName: ['', [Validators.required, Validators.maxLength(100)]],
      birthDate: ['', Validators.required],
      enrollmentStart: ['', Validators.required],
      enrollmentEnd: '',
      parents: this.fb.array([parentGroup(this.fb, emptyParent())], {
        validators: PARENTS_VALIDATORS,
      }),
      contacts: this.fb.array<ReturnType<typeof contactGroup>>([]),
    },
    { validators: enrollmentDatesValidator },
  );

  protected readonly isNew = computed(() => this.child() === null);
  /** The summary of the errors only appears once the user tried to save. */
  protected readonly submitted = signal(false);
  /** `comparableValue` of the form as loaded, to detect unsaved changes. */
  private loadedValue = '';
  protected readonly relationships = Object.entries(PARENT_RELATIONSHIP_LABELS) as [
    ParentRelationship,
    string,
  ][];
  protected readonly maxParents = MAX_PARENTS;
  protected readonly maxContacts = MAX_CONTACTS;
  protected readonly absenceLabel = absenceLabel;
  protected readonly absenceSource = absenceSource;
  protected readonly formatPeriod = formatPeriod;

  /** The child's absences around today; nothing for a new registration. */
  protected readonly absenceGroups = computed(() => {
    const child = this.child();
    if (!child) {
      return null;
    }
    const groups = groupAbsences(child.absences, todayIsoDate());
    return [
      {
        key: 'current',
        title: 'En cours',
        absences: groups.current,
        empty: "Pas d'absence aujourd'hui.",
      },
      {
        key: 'upcoming',
        title: 'À venir',
        absences: groups.upcoming,
        empty: 'Aucune absence prévue.',
      },
      { key: 'past', title: 'Passées', absences: groups.past, empty: 'Aucune absence passée.' },
    ];
  });

  constructor() {
    // Reload the form whenever another child (or the saved version) comes in.
    effect(() => {
      const child = this.child();
      this.load(child ? toFormValue(child) : emptyFormValue());
    });
  }

  get parents(): FormArray {
    return this.form.controls.parents;
  }

  get contacts(): FormArray {
    return this.form.controls.contacts;
  }

  /** True once the content differs from what was loaded (empty added rows excepted). */
  isDirty(): boolean {
    return comparableValue(this.form.getRawValue()) !== this.loadedValue;
  }

  protected addParent(): void {
    // A second parent is most often the father; the staff can change it.
    this.form.controls.parents.push(
      parentGroup(this.fb, emptyParent(this.parents.length === 0 ? 'mother' : 'father')),
    );
  }

  protected addContact(): void {
    this.form.controls.contacts.push(contactGroup(this.fb, emptyContact()));
  }

  protected remove(array: FormArray, index: number): void {
    array.removeAt(index);
  }

  protected submit(): void {
    this.submitted.set(true);
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.saveChild.emit(toPayload(this.form.getRawValue()));
  }

  /** Shown once the user touched the field (or tried to save). */
  protected isInvalid(path: string): boolean {
    const control = this.form.get(path);
    return !!control && control.invalid && (control.touched || control.dirty);
  }

  protected hasError(path: string, error: string): boolean {
    const control = this.form.get(path);
    return !!control && control.hasError(error) && (control.touched || control.dirty);
  }

  /** Errors set by the group validator, shown once one of the dates was touched. */
  protected hasDateError(error: 'startBeforeBirth' | 'endBeforeStart'): boolean {
    const { birthDate, enrollmentStart, enrollmentEnd } = this.form.controls;
    const touched = [birthDate, enrollmentStart, enrollmentEnd].some(
      (control) => control.touched || control.dirty,
    );
    return touched && this.form.hasError(error);
  }

  private load(value: ChildFormValue): void {
    this.submitted.set(false);
    this.form.setControl(
      'parents',
      this.fb.array(
        value.parents.map((parent) => parentGroup(this.fb, parent)),
        { validators: PARENTS_VALIDATORS },
      ),
    );
    this.form.setControl(
      'contacts',
      this.fb.array(value.contacts.map((contact) => contactGroup(this.fb, contact))),
    );
    this.form.reset(value);
    this.loadedValue = comparableValue(this.form.getRawValue());
  }
}
