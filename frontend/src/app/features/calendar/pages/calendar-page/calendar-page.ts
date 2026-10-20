import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
  viewChild,
  type OnInit,
} from '@angular/core';
import type { Observable } from 'rxjs';
import { ModalDialog } from '../../../../shared/components/modal-dialog/modal-dialog';
import {
  firstOfMonth,
  formatMonth,
  shiftMonth,
  todayIsoDate,
} from '../../../../shared/utils/date.utils';
import { httpErrorMessage } from '../../../../shared/utils/http-error.utils';
import { AbsenceForm } from '../../components/absence-form/absence-form';
import { AgendaView } from '../../components/agenda-view/agenda-view';
import { ClosureForm } from '../../components/closure-form/closure-form';
import { MonthView } from '../../components/month-view/month-view';
import { EVENT_FILTERS } from '../../constants/calendar.constants';
import type {
  Absence,
  AbsencePayload,
  CalendarEvent,
  ChildOption,
  Closure,
  ClosurePayload,
  EventFilter,
} from '../../models/calendar.model';
import { CalendarService } from '../../services/calendar.service';
import { monthWeeks } from '../../utils/calendar.utils';

/** What the dialog shows: a closure or an absence, new (`item` null) or edited. */
type Editing =
  { kind: 'closure'; item: Closure | null } | { kind: 'absence'; item: Absence | null };

const UNSAVED_CHANGES_MESSAGE =
  'Des modifications ne sont pas enregistrées et seront perdues. Continuer ?';

@Component({
  selector: 'app-calendar-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MonthView, AgendaView, ModalDialog, ClosureForm, AbsenceForm],
  templateUrl: './calendar-page.html',
  styleUrl: './calendar-page.scss',
})
export class CalendarPage implements OnInit {
  private readonly calendarService = inject(CalendarService);
  private readonly closureForm = viewChild(ClosureForm);
  private readonly absenceForm = viewChild(AbsenceForm);

  protected readonly today = todayIsoDate();
  /** First day of the month shown. */
  protected readonly month = signal(firstOfMonth(this.today));
  protected readonly events = signal<CalendarEvent[]>([]);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly notice = signal<string | null>(null);
  protected readonly hidden = signal<ReadonlySet<EventFilter>>(new Set());

  protected readonly children = signal<ChildOption[]>([]);
  protected readonly editing = signal<Editing | null>(null);
  protected readonly saving = signal(false);
  protected readonly saveError = signal<string | null>(null);

  protected readonly filters = EVENT_FILTERS;
  protected readonly monthLabel = computed(() => formatMonth(this.month()));
  protected readonly weeks = computed(() => monthWeeks(this.month(), this.today));
  protected readonly days = computed(() => this.weeks().flat());

  protected readonly visibleEvents = computed(() => {
    const hiddenTypes = EVENT_FILTERS.filter((filter) => this.hidden().has(filter.value)).flatMap(
      (filter) => filter.types,
    );
    return this.events().filter((event) => !hiddenTypes.includes(event.type));
  });

  /** Children an absence can still be declared for (plus the one being edited). */
  protected readonly absenceChildren = computed(() => {
    const editing = this.editing();
    const editedChildId = editing?.kind === 'absence' ? editing.item?.childId : undefined;
    return this.children().filter(
      (child) => child.enrollmentStatus !== 'ended' || child.id === editedChildId,
    );
  });

  ngOnInit(): void {
    this.load();
  }

  protected showMonth(delta: number): void {
    this.month.set(shiftMonth(this.month(), delta));
    this.load();
  }

  protected showToday(): void {
    this.month.set(firstOfMonth(this.today));
    this.load();
  }

  protected toggleFilter(filter: EventFilter): void {
    const hidden = new Set(this.hidden());
    if (!hidden.delete(filter)) {
      hidden.add(filter);
    }
    this.hidden.set(hidden);
  }

  protected newClosure(): void {
    this.open({ kind: 'closure', item: null });
  }

  protected newAbsence(): void {
    this.loadChildren();
    this.open({ kind: 'absence', item: null });
  }

  /** A click on an editable event (closure or absence) opens its form. */
  protected openEvent(event: CalendarEvent): void {
    if (event.sourceId === null) {
      return;
    }
    if (event.type === 'closure') {
      this.open({
        kind: 'closure',
        item: {
          id: event.sourceId,
          label: event.label,
          startDate: event.startDate,
          endDate: event.endDate,
        },
      });
    } else if (event.type === 'absence' && event.childId !== null) {
      const [childFirstName, ...rest] = event.label.split(' ');
      this.loadChildren();
      this.open({
        kind: 'absence',
        item: {
          id: event.sourceId,
          childId: event.childId,
          childFirstName,
          childLastName: rest.join(' '),
          startDate: event.startDate,
          endDate: event.endDate,
          kind: event.absenceKind ?? 'other',
          comment: event.comment,
        },
      });
    }
  }

  protected requestClose(): void {
    const form = this.editing()?.kind === 'closure' ? this.closureForm() : this.absenceForm();
    if (!form?.isDirty() || window.confirm(UNSAVED_CHANGES_MESSAGE)) {
      this.editing.set(null);
    }
  }

  protected onClosed(): void {
    this.editing.set(null);
  }

  protected saveClosure(payload: ClosurePayload): void {
    const editing = this.editing();
    if (editing?.kind !== 'closure') {
      return;
    }
    const request = editing.item
      ? this.calendarService.updateClosure(editing.item.id, payload)
      : this.calendarService.createClosure(payload);
    this.submit(request, `Fermeture « ${payload.label} » enregistrée.`);
  }

  protected saveAbsence(payload: AbsencePayload): void {
    const editing = this.editing();
    if (editing?.kind !== 'absence') {
      return;
    }
    const request = editing.item
      ? this.calendarService.updateAbsence(editing.item.id, payload)
      : this.calendarService.createAbsence(payload);
    const child = this.children().find((option) => option.id === payload.childId);
    this.submit(request, `Absence de ${child?.firstName ?? "l'enfant"} enregistrée.`);
  }

  protected deleteCurrent(): void {
    const editing = this.editing();
    if (!editing?.item || !window.confirm('Supprimer définitivement cet élément du calendrier ?')) {
      return;
    }
    const request =
      editing.kind === 'closure'
        ? this.calendarService.deleteClosure(editing.item.id)
        : this.calendarService.deleteAbsence(editing.item.id);
    this.submit(
      request,
      editing.kind === 'closure' ? 'Fermeture supprimée.' : 'Absence supprimée.',
    );
  }

  private open(editing: Editing): void {
    this.saveError.set(null);
    this.notice.set(null);
    this.editing.set(editing);
  }

  /** Sends a change; on success closes the dialog and reloads the month. */
  private submit(request: Observable<unknown>, notice: string): void {
    this.saving.set(true);
    this.saveError.set(null);
    request.subscribe({
      next: () => {
        this.saving.set(false);
        this.editing.set(null);
        this.notice.set(notice);
        this.load();
      },
      error: (error: unknown) => {
        this.saving.set(false);
        this.saveError.set(httpErrorMessage(error, 'api.saveFailed'));
      },
    });
  }

  private load(): void {
    const weeks = this.weeks();
    const from = weeks[0][0].date;
    const to = weeks[weeks.length - 1][6].date;
    this.loading.set(true);
    this.error.set(null);
    this.calendarService.getEvents(from, to).subscribe({
      next: (calendar) => {
        this.events.set(calendar.events);
        this.loading.set(false);
      },
      error: (error: unknown) => {
        this.error.set(httpErrorMessage(error, 'calendar.loadFailed'));
        this.loading.set(false);
      },
    });
  }

  private loadChildren(): void {
    this.calendarService.listChildren().subscribe({
      next: (children) => this.children.set(children),
      error: (error: unknown) => this.saveError.set(httpErrorMessage(error, 'children.loadFailed')),
    });
  }
}
