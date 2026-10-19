/** Raw rows returned by the PostgreSQL queries (snake_case columns). */

export interface DailyReportRow {
  id: string;
  child_id: string;
  child_first_name: string;
  child_last_name: string;
  report_date: string;
  absent: boolean;
  absence_comment: string | null;
  arrival_time: string | null;
  departure_time: string | null;
  meal_comment: string | null;
  no_nap: boolean;
  nap_comment: string | null;
  stool_status: 'normal' | 'other';
  stool_comment: string | null;
  parent_note: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface MealRow {
  report_id: string;
  label: string;
  quantity_grams: number | null;
}

export interface BottleRow {
  report_id: string;
  time: string;
  quantity_ml: number | null;
}

export interface NapRow {
  report_id: string;
  start_time: string;
  end_time: string | null;
}
