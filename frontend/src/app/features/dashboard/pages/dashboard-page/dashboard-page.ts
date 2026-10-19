import { ChangeDetectionStrategy, Component } from '@angular/core';
import { DailyReportsTile } from '../../components/daily-reports-tile/daily-reports-tile';

/**
 * Home page: a grid of independent tiles. Each tile loads its own data, so a
 * new one only needs a component (built on `DashboardTile`) added to the grid.
 */
@Component({
  selector: 'app-dashboard-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DailyReportsTile],
  templateUrl: './dashboard-page.html',
  styleUrl: './dashboard-page.scss',
})
export class DashboardPage {}
