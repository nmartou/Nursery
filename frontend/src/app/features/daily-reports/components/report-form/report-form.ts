import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  output,
} from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import {
  type FormArray,
  NonNullableFormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { ErrorMessagePipe } from '../../../../shared/pipes/error-message.pipe';
import { currentTime, formatLongDate, formatTime } from '../../../../shared/utils/date.utils';
import type { DailyReport, DailyReportPayload, StoolStatus } from '../../models/daily-report.model';
import { PLANNED_ABSENCE_LABELS } from '../../constants/report-status.constants';
import { toFormValue, toPayload } from '../../utils/report-form.utils';
import { ReportStatusBadge } from '../report-status-badge/report-status-badge';

@Component({
  selector: 'app-report-form',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, ReportStatusBadge, ErrorMessagePipe],
  templateUrl: './report-form.html',
  styleUrl: './report-form.scss',
})
export class ReportForm {
  private readonly fb = inject(NonNullableFormBuilder);

  readonly report = input.required<DailyReport>();
  readonly saving = input(false);
  readonly saveError = input<string | null>(null);
  readonly saveReport = output<DailyReportPayload>();
  readonly closeForm = output<void>();

  readonly form = this.fb.group({
    absent: false,
    absenceComment: ['', Validators.maxLength(500)],
    arrivalTime: '',
    departureTime: '',
    meals: this.fb.array([this.createMeal()]),
    bottles: this.fb.array([this.createBottle()]),
    mealComment: ['', Validators.maxLength(500)],
    naps: this.fb.array([this.createNap()]),
    noNap: false,
    napComment: ['', Validators.maxLength(500)],
    stoolStatus: this.fb.control<StoolStatus>('normal'),
    stoolComment: ['', Validators.maxLength(500)],
    parentNote: ['', Validators.maxLength(1000)],
  });

  protected readonly absent = toSignal(this.form.controls.absent.valueChanges, {
    initialValue: false,
  });
  protected readonly noNap = toSignal(this.form.controls.noNap.valueChanges, {
    initialValue: false,
  });
  protected readonly stoolStatus = toSignal(this.form.controls.stoolStatus.valueChanges, {
    initialValue: 'normal',
  });

  protected readonly plannedLabels = PLANNED_ABSENCE_LABELS;
  protected readonly longDate = computed(() => formatLongDate(this.report().date));
  protected readonly lastSaved = computed(() => formatTime(this.report().updatedAt));

  constructor() {
    // The stool comment becomes mandatory only when stools are not normal.
    this.form.controls.stoolStatus.valueChanges.pipe(takeUntilDestroyed()).subscribe((status) => {
      const comment = this.form.controls.stoolComment;
      comment.setValidators(
        status === 'other'
          ? [Validators.required, Validators.maxLength(500)]
          : Validators.maxLength(500),
      );
      comment.updateValueAndValidity();
    });

    // Reload the form whenever another report (or the saved version) comes in.
    effect(() => this.load(this.report()));
  }

  get meals(): FormArray {
    return this.form.controls.meals;
  }

  get bottles(): FormArray {
    return this.form.controls.bottles;
  }

  get naps(): FormArray {
    return this.form.controls.naps;
  }

  isDirty(): boolean {
    return this.form.dirty;
  }

  protected toggleAbsent(): void {
    const control = this.form.controls.absent;
    control.setValue(!control.value);
    control.markAsDirty();
  }

  protected addMeal(): void {
    this.form.controls.meals.push(this.createMeal());
    this.form.markAsDirty();
  }

  protected addBottle(): void {
    this.form.controls.bottles.push(this.createBottle(currentTime()));
    this.form.markAsDirty();
  }

  protected addNap(): void {
    this.form.controls.naps.push(this.createNap(currentTime()));
    this.form.markAsDirty();
  }

  protected remove(array: FormArray, index: number): void {
    array.removeAt(index);
    this.form.markAsDirty();
  }

  protected submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.saveReport.emit(toPayload(this.form.getRawValue()));
  }

  protected isInvalid(path: string): boolean {
    const control = this.form.get(path);
    return !!control && control.invalid && (control.touched || control.dirty);
  }

  private load(report: DailyReport): void {
    const value = toFormValue(report);
    this.form.setControl(
      'meals',
      this.fb.array(value.meals.map((meal) => this.createMeal(meal.label, meal.quantityGrams))),
    );
    this.form.setControl(
      'bottles',
      this.fb.array(
        value.bottles.map((bottle) => this.createBottle(bottle.time, bottle.quantityMl)),
      ),
    );
    this.form.setControl(
      'naps',
      this.fb.array(value.naps.map((nap) => this.createNap(nap.startTime, nap.endTime))),
    );
    this.form.reset(value);
  }

  private createMeal(label = '', quantityGrams: number | null = null) {
    return this.fb.group({
      label: [label, [Validators.required, Validators.maxLength(100)]],
      quantityGrams: this.fb.control<number | null>(quantityGrams, Validators.min(0)),
    });
  }

  private createBottle(time = '', quantityMl: number | null = null) {
    return this.fb.group({
      time: [time, Validators.required],
      quantityMl: this.fb.control<number | null>(quantityMl, Validators.min(0)),
    });
  }

  private createNap(startTime = '', endTime = '') {
    return this.fb.group({
      startTime: [startTime, Validators.required],
      endTime,
    });
  }
}
