import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import type { CalendarEvent } from '../../models/calendar.model';
import { eventText, isEditable } from '../../utils/calendar.utils';

/** One event on a day; closures and absences open their form when clicked. */
@Component({
  selector: 'app-event-chip',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './event-chip.html',
  styleUrl: './event-chip.scss',
})
export class EventChip {
  readonly event = input.required<CalendarEvent>();
  readonly openEvent = output<CalendarEvent>();

  protected readonly text = computed(() => eventText(this.event()));
  protected readonly editable = computed(() => isEditable(this.event()));
  /** Shown on hover: the full text (chips are truncated) and the comment. */
  protected readonly tooltip = computed(() => {
    const comment = this.event().comment;
    return comment ? `${this.text()} — ${comment}` : this.text();
  });
  /** CSS modifier: the type, refined by the kind for absences. */
  protected readonly variant = computed(() => {
    const event = this.event();
    return event.type === 'absence' ? `absence-${event.absenceKind ?? 'other'}` : event.type;
  });
}
