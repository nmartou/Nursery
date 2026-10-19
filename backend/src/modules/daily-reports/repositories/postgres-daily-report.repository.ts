import { Inject, Injectable } from '@nestjs/common';
import type { Pool, PoolClient } from 'pg';
import { PG_POOL } from '../../../common/constants/injection-tokens.js';
import {
  DailyReport,
  DailyReportContent,
} from '../models/daily-report.model.js';
import { DailyReportRepository } from './daily-report.repository.js';
import {
  BottleRow,
  DailyReportRow,
  MealRow,
  NapRow,
} from './rows/daily-report.rows.js';

const SELECT_REPORT = `
  SELECT r.id,
         r.child_id,
         c.first_name AS child_first_name,
         c.last_name  AS child_last_name,
         to_char(r.report_date, 'YYYY-MM-DD')   AS report_date,
         r.absent,
         r.absence_comment,
         to_char(r.arrival_time, 'HH24:MI')     AS arrival_time,
         to_char(r.departure_time, 'HH24:MI')   AS departure_time,
         r.meal_comment,
         r.no_nap,
         r.nap_comment,
         r.stool_status,
         r.stool_comment,
         r.parent_note,
         r.created_at,
         r.updated_at
    FROM daily_report r
    JOIN child c ON c.id = r.child_id`;

@Injectable()
export class PostgresDailyReportRepository implements DailyReportRepository {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  async ensureReportsForDate(date: string): Promise<void> {
    await this.pool.query(
      `INSERT INTO daily_report (child_id, report_date)
       SELECT c.id, $1::date FROM child c WHERE c.active
       ON CONFLICT (child_id, report_date) DO NOTHING`,
      [date],
    );
  }

  async findByDate(date: string): Promise<DailyReport[]> {
    const { rows } = await this.pool.query<DailyReportRow>(
      `${SELECT_REPORT}
       WHERE r.report_date = $1::date
       ORDER BY c.last_name, c.first_name`,
      [date],
    );
    return this.withDetails(rows);
  }

  async findById(id: string): Promise<DailyReport | null> {
    const { rows } = await this.pool.query<DailyReportRow>(
      `${SELECT_REPORT} WHERE r.id = $1`,
      [id],
    );
    const [report] = await this.withDetails(rows);
    return report ?? null;
  }

  async update(
    id: string,
    content: DailyReportContent,
  ): Promise<DailyReport | null> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const result = await client.query(
        `UPDATE daily_report
            SET absent = $2, absence_comment = $3, arrival_time = $4, departure_time = $5,
                meal_comment = $6, no_nap = $7, nap_comment = $8, stool_status = $9,
                stool_comment = $10, parent_note = $11, updated_at = now()
          WHERE id = $1`,
        [
          id,
          content.absent,
          content.absenceComment,
          content.arrivalTime,
          content.departureTime,
          content.mealComment,
          content.noNap,
          content.napComment,
          content.stoolStatus,
          content.stoolComment,
          content.parentNote,
        ],
      );
      if (result.rowCount === 0) {
        await client.query('ROLLBACK');
        return null;
      }
      await this.replaceDetails(client, id, content);
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
    return this.findById(id);
  }

  private async replaceDetails(
    client: PoolClient,
    id: string,
    content: DailyReportContent,
  ): Promise<void> {
    await client.query('DELETE FROM report_meal WHERE report_id = $1', [id]);
    await client.query('DELETE FROM report_bottle WHERE report_id = $1', [id]);
    await client.query('DELETE FROM report_nap WHERE report_id = $1', [id]);

    for (const [position, meal] of content.meals.entries()) {
      await client.query(
        'INSERT INTO report_meal (report_id, position, label, quantity_grams) VALUES ($1, $2, $3, $4)',
        [id, position, meal.label, meal.quantityGrams],
      );
    }
    for (const bottle of content.bottles) {
      await client.query(
        'INSERT INTO report_bottle (report_id, time, quantity_ml) VALUES ($1, $2, $3)',
        [id, bottle.time, bottle.quantityMl],
      );
    }
    for (const nap of content.naps) {
      await client.query(
        'INSERT INTO report_nap (report_id, start_time, end_time) VALUES ($1, $2, $3)',
        [id, nap.startTime, nap.endTime],
      );
    }
  }

  private async withDetails(rows: DailyReportRow[]): Promise<DailyReport[]> {
    if (rows.length === 0) {
      return [];
    }
    const ids = rows.map((row) => row.id);
    const [meals, bottles, naps] = await Promise.all([
      this.pool.query<MealRow>(
        `SELECT report_id, label, quantity_grams FROM report_meal
          WHERE report_id = ANY($1::uuid[]) ORDER BY position`,
        [ids],
      ),
      this.pool.query<BottleRow>(
        `SELECT report_id, to_char(time, 'HH24:MI') AS time, quantity_ml FROM report_bottle
          WHERE report_id = ANY($1::uuid[]) ORDER BY time`,
        [ids],
      ),
      this.pool.query<NapRow>(
        `SELECT report_id, to_char(start_time, 'HH24:MI') AS start_time,
                to_char(end_time, 'HH24:MI') AS end_time
           FROM report_nap WHERE report_id = ANY($1::uuid[]) ORDER BY start_time`,
        [ids],
      ),
    ]);

    return rows.map((row) => ({
      id: row.id,
      childId: row.child_id,
      childFirstName: row.child_first_name,
      childLastName: row.child_last_name,
      date: row.report_date,
      absent: row.absent,
      absenceComment: row.absence_comment,
      arrivalTime: row.arrival_time,
      departureTime: row.departure_time,
      meals: meals.rows
        .filter((meal) => meal.report_id === row.id)
        .map((meal) => ({
          label: meal.label,
          quantityGrams: meal.quantity_grams,
        })),
      bottles: bottles.rows
        .filter((bottle) => bottle.report_id === row.id)
        .map((bottle) => ({
          time: bottle.time,
          quantityMl: bottle.quantity_ml,
        })),
      mealComment: row.meal_comment,
      naps: naps.rows
        .filter((nap) => nap.report_id === row.id)
        .map((nap) => ({ startTime: nap.start_time, endTime: nap.end_time })),
      noNap: row.no_nap,
      napComment: row.nap_comment,
      stoolStatus: row.stool_status,
      stoolComment: row.stool_comment,
      parentNote: row.parent_note,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
  }
}
