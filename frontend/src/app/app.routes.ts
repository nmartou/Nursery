import type { Routes } from '@angular/router';
import { MainLayout } from './core/layout/main-layout/main-layout';

export const routes: Routes = [
  {
    path: '',
    component: MainLayout,
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'accueil' },
      {
        path: 'accueil',
        title: 'Accueil · Nursery',
        loadComponent: () =>
          import('./features/dashboard/pages/dashboard-page/dashboard-page').then(
            (m) => m.DashboardPage,
          ),
      },
      {
        path: 'rapports',
        title: 'Rapports du jour · Nursery',
        loadComponent: () =>
          import('./features/daily-reports/pages/daily-reports-page/daily-reports-page').then(
            (m) => m.DailyReportsPage,
          ),
      },
    ],
  },
  { path: '**', redirectTo: '' },
];
