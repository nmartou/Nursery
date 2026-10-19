import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { formatLongDate } from '../../../../shared/utils/date.utils';
import type { CalendarDay, CalendarEvent } from '../../models/calendar.model';
import { eventsOn } from '../../utils/calendar.utils';
import { EventChip } from '../event-chip/event-chip';

/** The days of the month that have events, as a list (small screens). */
@Component({
  selector: 'app-agenda-view',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [EventChip],
  templateUrl: './agenda-view.html',
  styleUrl: './agenda-view.scss',
})
export class AgendaView {
  readonly days = input.required<CalendarDay[]>();
  readonly events = input.required<CalendarEvent[]>();
  readonly openEvent = output<CalendarEvent>();

  protected readonly busyDays = computed(() =>
    this.days()
      .filter((day) => day.inMonth)
      .map((day) => ({
        ...day,
        label: formatLongDate(day.date),
        events: eventsOn(this.events(), day.date),
      }))
      .filter((day) => day.events.length > 0),
  );
}
