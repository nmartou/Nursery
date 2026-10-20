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
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  type AbstractControl,
  NonNullableFormBuilder,
  ReactiveFormsModule,
  type ValidationErrors,
  Validators,
} from '@angular/forms';
import { ErrorMessagePipe } from '../../../../shared/pipes/error-message.pipe';
import type { Closure, ClosurePayload } from '../../models/calendar.model';

/** The last day cannot precede the first (same rule as the API). */
function periodValidator(group: AbstractControl): ValidationErrors | null {
  const { startDate, endDate } = group.getRawValue() as ClosurePayload;
  return startDate !== '' && endDate !== '' && endDate < startDate
    ? { endBeforeStart: true }
    : null;
}

/** A period the nursery is closed: new (`closure` null) or edited. */
@Component({
  selector: 'app-closure-form',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, ErrorMessagePipe],
  templateUrl: './closure-form.html',
  styleUrl: './closure-form.scss',
})
export class ClosureForm {
  private readonly fb = inject(NonNullableFormBuilder);

  readonly closure = input<Closure | null>(null);
  readonly saving = input(false);
  readonly saveError = input<string | null>(null);
  readonly saveClosure = output<ClosurePayload>();
  readonly deleteClosure = output<void>();
  readonly cancelForm = output<void>();

  readonly form = this.fb.group(
    {
      label: ['', [Validators.required, Validators.maxLength(100)]],
      startDate: ['', Validators.required],
      endDate: ['', Validators.required],
    },
    { validators: periodValidator },
  );

  protected readonly isNew = computed(() => this.closure() === null);
  protected readonly submitted = signal(false);

  constructor() {
    effect(() => {
      const closure = this.closure();
      this.submitted.set(false);
      this.form.reset(
        closure
          ? { label: closure.label, startDate: closure.startDate, endDate: closure.endDate }
          : { label: '', startDate: '', endDate: '' },
      );
    });

    // A one-day closure is the most common case: the last day follows the first.
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
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const value = this.form.getRawValue();
    this.saveClosure.emit({ ...value, label: value.label.trim() });
  }

  protected isInvalid(name: 'label' | 'startDate' | 'endDate'): boolean {
    const control = this.form.controls[name];
    return control.invalid && (control.touched || control.dirty || this.submitted());
  }
}
