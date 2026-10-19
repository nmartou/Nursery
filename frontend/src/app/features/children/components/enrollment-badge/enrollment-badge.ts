import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { ENROLLMENT_STATUS_LABELS } from '../../constants/child.constants';
import type { EnrollmentStatus } from '../../models/child.model';

@Component({
  selector: 'app-enrollment-badge',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <span [class]="'badge badge--' + status()">
      <span class="badge__dot" aria-hidden="true"></span>
      {{ label() }}
    </span>
  `,
  styleUrl: './enrollment-badge.scss',
})
export class EnrollmentBadge {
  readonly status = input.required<EnrollmentStatus>();
  protected readonly label = computed(() => ENROLLMENT_STATUS_LABELS[this.status()]);
}
