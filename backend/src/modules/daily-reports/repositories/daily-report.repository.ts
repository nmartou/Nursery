import { Inject, Injectable } from '@nestjs/common';
import { eq, sql } from 'drizzle-orm';
import { DRIZZLE } from '../../../common/constants/injection-tokens.js';
import type { Database } from '../../../common/database/database.module.js';
import {
  child,
  dailyReport,
  reportBottle,
  reportMeal,
  reportNap,
} from '../../../common/database/schema.js';
import { toHourMinute } from '../../../common/utils/date.util.js';
import type {
  DailyReport,
  DailyReportContent,
} from '../models/daily-report.model.js';

/** Everything a report needs, loaded in one relational query. */
const WITH_DETAILS = {
  child: { columns: { firstName: true, lastName: true } },
  meals: {
    columns: { label: true, quantityGrams: true },
    orderBy: reportMeal.position,
  },
  bottles: {
    columns: { time: true, quantityMl: true },
    orderBy: reportBottle.time,
  },
  naps: {
    columns: { startTime: true, endTime: true },
    orderBy: reportNap.startTime,
  },
} as const;

/** Shape returned by the relational queries using `WITH_DETAILS`. */
type ReportWithDetails = typeof dailyReport.$inferSelect & {
  child: Pick<typeof child.$inferSelect, 'firstName' | 'lastName'>;
  meals: Pick<typeof reportMeal.$inferSelect, 'label' | 'quantityGrams'>[];
  bottles: Pick<typeof reportBottle.$inferSelect, 'time' | 'quantityMl'>[];
  naps: Pick<typeof reportNap.$inferSelect, 'startTime' | 'endTime'>[];
};

@Injectable()
export class DailyReportRepository {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  /** Creates an empty report for every active child that has none on that date. */
  async ensureReportsForDate(date: string): Promise<void> {
    const children = await this.db
      .select({ id: child.id })
      .from(child)
      .where(eq(child.active, true));
    if (children.length === 0) {
      return;
    }
    // The unique (child, date) constraint makes concurrent calls harmless.
    await this.db
      .insert(dailyReport)
      .values(children.map(({ id }) => ({ childId: id, reportDate: date })))
      .onConflictDoNothing();
  }

  /** Reports of the day, sorted by child last name then first name. */
  async findByDate(date: string): Promise<DailyReport[]> {
    const reports = await this.db.query.dailyReport.findMany({
      where: eq(dailyReport.reportDate, date),
      with: WITH_DETAILS,
    });
    return reports
      .map((report) => this.toModel(report))
      .sort((a, b) => {
        const byLastName = a.childLastName.localeCompare(b.childLastName);
        return byLastName !== 0
          ? byLastName
          : a.childFirstName.localeCompare(b.childFirstName);
      });
  }

  async findById(id: string): Promise<DailyReport | null> {
    const report = await this.findOneWithDetails(id);
    return report ? this.toModel(report) : null;
  }

  /** Replaces the editable content of a report; returns null when it does not exist. */
  async update(
    id: string,
    content: DailyReportContent,
  ): Promise<DailyReport | null> {
    const found = await this.db.transaction(async (tx) => {
      const updated = await tx
        .update(dailyReport)
        .set({
          absent: content.absent,
          absenceComment: content.absenceComment,
          arrivalTime: content.arrivalTime,
          departureTime: content.departureTime,
          mealComment: content.mealComment,
          noNap: content.noNap,
          napComment: content.napComment,
          stoolStatus: content.stoolStatus,
          stoolComment: content.stoolComment,
          parentNote: content.parentNote,
          updatedAt: sql`now()`,
        })
        .where(eq(dailyReport.id, id))
        .returning({ id: dailyReport.id });
      if (updated.length === 0) {
        return false;
      }

      await tx.delete(reportMeal).where(eq(reportMeal.reportId, id));
      await tx.delete(reportBottle).where(eq(reportBottle.reportId, id));
      await tx.delete(reportNap).where(eq(reportNap.reportId, id));

      if (content.meals.length > 0) {
        await tx.insert(reportMeal).values(
          content.meals.map((meal, position) => ({
            reportId: id,
            position,
            label: meal.label,
            quantityGrams: meal.quantityGrams,
          })),
        );
      }
      if (content.bottles.length > 0) {
        await tx
          .insert(reportBottle)
          .values(
            content.bottles.map((bottle) => ({ reportId: id, ...bottle })),
          );
      }
      if (content.naps.length > 0) {
        await tx
          .insert(reportNap)
          .values(content.naps.map((nap) => ({ reportId: id, ...nap })));
      }
      return true;
    });

    return found ? this.findById(id) : null;
  }

  private findOneWithDetails(id: string) {
    return this.db.query.dailyReport.findFirst({
      where: eq(dailyReport.id, id),
      with: WITH_DETAILS,
    });
  }

  private toModel(report: ReportWithDetails): DailyReport {
    return {
      id: report.id,
      childId: report.childId,
      childFirstName: report.child.firstName,
      childLastName: report.child.lastName,
      date: report.reportDate,
      absent: report.absent,
      absenceComment: report.absenceComment,
      arrivalTime: report.arrivalTime && toHourMinute(report.arrivalTime),
      departureTime: report.departureTime && toHourMinute(report.departureTime),
      meals: report.meals,
      bottles: report.bottles.map((bottle) => ({
        time: toHourMinute(bottle.time),
        quantityMl: bottle.quantityMl,
      })),
      mealComment: report.mealComment,
      naps: report.naps.map((nap) => ({
        startTime: toHourMinute(nap.startTime),
        endTime: nap.endTime && toHourMinute(nap.endTime),
      })),
      noNap: report.noNap,
      napComment: report.napComment,
      stoolStatus: report.stoolStatus,
      stoolComment: report.stoolComment,
      parentNote: report.parentNote,
      createdAt: report.createdAt,
      updatedAt: report.updatedAt,
    };
  }
}
