import { ChangeDetectionStrategy, Component, input } from '@angular/core';

let nextId = 0;

/**
 * Frame shared by every dashboard tile: a titled card whose body and footer are
 * projected (`<div tileFooter>` for the footer).
 */
@Component({
  selector: 'app-dashboard-tile',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './dashboard-tile.html',
  styleUrl: './dashboard-tile.scss',
})
export class DashboardTile {
  readonly heading = input.required<string>();
  readonly subtitle = input<string>();

  protected readonly titleId = `dashboard-tile-${nextId++}`;
}
