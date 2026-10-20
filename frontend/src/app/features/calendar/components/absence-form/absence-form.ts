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
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import {
  type AbstractControl,
  NonNullableFormBuilder,
  ReactiveFormsModule,
  type ValidationErrors,
  Validators,
} from '@angular/forms';
import { ErrorMessagePipe } from '../../../../shared/pipes/error-message.pipe';
import { formatShortDate } from '../../../../shared/utils/date.utils';
import { ABSENCE_KIND_LABELS } from '../../constants/calendar.constants';
import type {
  Absence,
  AbsenceKind,
  AbsencePayload,
  ChildOption,
} from '../../models/calendar.model';

interface AbsenceFormValue {
  childId: string;
  kind: AbsenceKind;
  startDate: string;
  endDate: string;
  comment: string;
}

/** The last day cannot precede the first (same rule as the API). */
function periodValidator(group: AbstractControl): ValidationErrors | null {
  const { startDate, endDate } = group.getRawValue() as AbsenceFormValue;
  return startDate !== '' && endDate !== '' && endDate < startDate
    ? { endBeforeStart: true }
    : null;
}

/** A child's planned absence (vacation, sickness...): new (`absence` null) or edited. */
@Component({
  selector: 'app-absence-form',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, ErrorMessagePipe],
  templateUrl: './absence-form.html',
  styleUrl: './absence-form.scss',
})
export class AbsenceForm {
  private readonly fb = inject(NonNullableFormBuilder);

  readonly absence = input<Absence | null>(null);
  /** Children the absence can be declared for. */
  readonly children = input.required<ChildOption[]>();
  readonly saving = input(false);
  readonly saveError = input<string | null>(null);
  readonly saveAbsence = output<AbsencePayload>();
  readonly deleteAbsence = output<void>();
  readonly cancelForm = output<void>();

  readonly form = this.fb.group(
    {
      childId: ['', Validators.required],
      kind: this.fb.control<AbsenceKind>('sickness'),
      startDate: ['', Validators.required],
      endDate: ['', Validators.required],
      comment: ['', Validators.maxLength(500)],
    },
    { validators: periodValidator },
  );

  protected readonly isNew = computed(() => this.absence() === null);
  protected readonly submitted = signal(false);
  protected readonly kinds = Object.entries(ABSENCE_KIND_LABELS) as [AbsenceKind, string][];

  private readonly value = toSignal(this.form.valueChanges, {
    initialValue: this.form.getRawValue(),
  });

  /** The selected child, to recall its enrollment period. */
  protected readonly child = computed(() =>
    this.children().find((child) => child.id === this.value().childId),
  );

  /** Same rule as the API: the absence lies within the child's enrollment. */
  protected readonly outsideEnrollment = computed(() => {
    const child = this.child();
    const { startDate = '', endDate = '' } = this.value();
    if (!child || startDate === '' || endDate === '') {
      return false;
    }
    return (
      startDate < child.enrollmentStart ||
      (child.enrollmentEnd !== null && endDate > child.enrollmentEnd)
    );
  });

  protected readonly enrollmentText = computed(() => {
    const child = this.child();
    if (!child) {
      return null;
    }
    const start = formatShortDate(child.enrollmentStart);
    return child.enrollmentEnd
      ? `inscrit(e) du ${start} au ${formatShortDate(child.enrollmentEnd)}`
      : `inscrit(e) depuis le ${start}`;
  });

  constructor() {
    effect(() => {
      const absence = this.absence();
      this.submitted.set(false);
      this.form.reset(
        absence
          ? {
              childId: absence.childId,
              kind: absence.kind,
              startDate: absence.startDate,
              endDate: absence.endDate,
              comment: absence.comment ?? '',
            }
          : { childId: '', kind: 'sickness', startDate: '', endDate: '', comment: '' },
      );
    });

    // Most absences last one day: the last day follows the first.
    this.form.controls.startDate.valueChanges.pipe(takeUntilDestroyed()).subscribe((startDate) => {
      const end = this.form.controls.endDate;
      if (startDate !== '' && (end.value === '' || end.value < startDate)) {
        end.setValue(startDate);
      }
    });
  }

  isDirty(): boolean {
    return this.form.dirty;
  }

  protected submit(): void {
    this.submitted.set(true);
    if (this.form.invalid || this.outsideEnrollment()) {
      this.form.markAllAsTouched();
      return;
    }
    const value = this.form.getRawValue();
    const comment = value.comment.trim();
    this.saveAbsence.emit({ ...value, comment: comment === '' ? null : comment });
  }

  protected isInvalid(name: keyof AbsenceFormValue): boolean {
    const control = this.form.controls[name];
    return control.invalid && (control.touched || control.dirty || this.submitted());
  }
}
