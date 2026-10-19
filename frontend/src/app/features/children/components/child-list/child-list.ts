import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { formatAge, formatShortDate } from '../../../../shared/utils/date.utils';
import { PARENT_RELATIONSHIP_LABELS } from '../../constants/child.constants';
import type { ChildSummary } from '../../models/child.model';
import { absenceLabel } from '../../utils/absence.utils';
import { EnrollmentBadge } from '../enrollment-badge/enrollment-badge';

/** Registered children; clicking a row opens its registration form. */
@Component({
  selector: 'app-child-list',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [EnrollmentBadge],
  templateUrl: './child-list.html',
  styleUrl: './child-list.scss',
})
export class ChildList {
  readonly children = input.required<ChildSummary[]>();
  /** `YYYY-MM-DD`, to compute the ages. */
  readonly today = input.required<string>();
  readonly selectChild = output<string>();

  protected readonly formatAge = formatAge;
  protected readonly formatShortDate = formatShortDate;
  protected readonly relationshipLabels = PARENT_RELATIONSHIP_LABELS;
  protected readonly absenceLabel = absenceLabel;
}
