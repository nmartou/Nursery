import type { ReportStatus } from '../models/daily-report.model';

export interface ReportStatusDisplay {
  label: string;
  /** Short hint shown next to the label */
  hint: string;
}

export const REPORT_STATUS_DISPLAY: Record<ReportStatus, ReportStatusDisplay> = {
  todo: { label: 'À remplir', hint: 'Rien de saisi' },
  in_progress: { label: 'À compléter', hint: 'Partiellement rempli' },
  complete: { label: 'Complet', hint: 'Entièrement rempli' },
  absent: { label: 'Absent', hint: "L'enfant n'est pas venu" },
};
