import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { WEEKDAY_LABELS } from '../../constants/calendar.constants';
import type { CalendarDay, CalendarEvent } from '../../models/calendar.model';
import { eventsOn } from '../../utils/calendar.utils';
import { EventChip } from '../event-chip/event-chip';

/** Month grid, Monday to Sunday (large screens). */
@Component({
  selector: 'app-month-view',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [EventChip],
  templateUrl: './month-view.html',
  styleUrl: './month-view.scss',
})
export class MonthView {
  readonly weeks = input.required<CalendarDay[][]>();
  readonly events = input.required<CalendarEvent[]>();
  readonly openEvent = output<CalendarEvent>();

  protected readonly weekdays = WEEKDAY_LABELS;
  protected readonly eventsOn = eventsOn;
}
