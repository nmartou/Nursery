import { Inject, Injectable } from '@nestjs/common';
import { and, asc, eq, gte, lte, ne, notExists } from 'drizzle-orm';
import { DRIZZLE } from '../../../common/constants/injection-tokens.js';
import type { Database } from '../../../common/database/database.module.js';
import {
  child,
  childAbsence,
  closure,
  dailyReport,
} from '../../../common/database/schema.js';
import type {
  Absence,
  AbsenceInput,
  Closure,
  ClosureInput,
  EnrollmentBound,
  ReportedAbsence,
} from '../models/calendar.model.js';

/** Columns of an absence with the name of its child. */
const ABSENCE_COLUMNS = {
  id: childAbsence.id,
  childId: childAbsence.childId,
  childFirstName: child.firstName,
  childLastName: child.lastName,
  startDate: childAbsence.startDate,
  endDate: childAbsence.endDate,
  kind: childAbsence.kind,
  comment: childAbsence.comment,
};

const CLOSURE_COLUMNS = {
  id: closure.id,
  startDate: closure.startDate,
  endDate: closure.endDate,
  label: closure.label,
};

@Injectable()
export class CalendarRepository {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  // --- Reading a period -----------------------------------------------------

  /** Closures overlapping the period (bounds included). */
  findClosuresBetween(from: string, to: string): Promise<Closure[]> {
    return this.db
      .select(CLOSURE_COLUMNS)
      .from(closure)
      .where(and(lte(closure.startDate, to), gte(closure.endDate, from)))
      .orderBy(asc(closure.startDate));
  }

  /** Absences overlapping the period, with the names of the children. */
  findAbsencesBetween(from: string, to: string): Promise<Absence[]> {
    return this.db
      .select(ABSENCE_COLUMNS)
      .from(childAbsence)
      .innerJoin(child, eq(child.id, childAbsence.childId))
      .where(
        and(lte(childAbsence.startDate, to), gte(childAbsence.endDate, from)),
      )
      .orderBy(asc(childAbsence.startDate), asc(child.lastName));
  }

  /**
   * Days children were marked absent in their daily report, within the period.
   * Days already covered by a planned absence of the child are left out: the
   * planned absence says it already.
   */
  findReportedAbsencesBetween(
    from: string,
    to: string,
  ): Promise<ReportedAbsence[]> {
    return this.db
      .select({
        reportId: dailyReport.id,
        childId: dailyReport.childId,
        childFirstName: child.firstName,
        childLastName: child.lastName,
        date: dailyReport.reportDate,
        comment: dailyReport.absenceComment,
      })
      .from(dailyReport)
      .innerJoin(child, eq(child.id, dailyReport.childId))
      .where(
        and(
          eq(dailyReport.absent, true),
          gte(dailyReport.reportDate, from),
          lte(dailyReport.reportDate, to),
          notExists(
            this.db
              .select({ id: childAbsence.id })
              .from(childAbsence)
              .where(
                and(
                  eq(childAbsence.childId, dailyReport.childId),
                  lte(childAbsence.startDate, dailyReport.reportDate),
                  gte(childAbsence.endDate, dailyReport.reportDate),
                ),
              ),
          ),
        ),
      )
      .orderBy(asc(dailyReport.reportDate), asc(child.lastName));
  }

  /** First days of enrollment within the period. */
  findEnrollmentStartsBetween(
    from: string,
    to: string,
  ): Promise<EnrollmentBound[]> {
    return this.db
      .select({
        childId: child.id,
        childFirstName: child.firstName,
        childLastName: child.lastName,
        date: child.enrollmentStart,
      })
      .from(child)
      .where(
        and(gte(child.enrollmentStart, from), lte(child.enrollmentStart, to)),
      )
      .orderBy(asc(child.enrollmentStart), asc(child.lastName));
  }

  /** Last days of enrollment within the period. */
  async findEnrollmentEndsBetween(
    from: string,
    to: string,
  ): Promise<EnrollmentBound[]> {
    const ends = await this.db
      .select({
        childId: child.id,
        childFirstName: child.firstName,
        childLastName: child.lastName,
        date: child.enrollmentEnd,
      })
      .from(child)
      .where(and(gte(child.enrollmentEnd, from), lte(child.enrollmentEnd, to)))
      .orderBy(asc(child.enrollmentEnd), asc(child.lastName));
    // The where clause excludes open-ended enrollments (null end).
    return ends.map((end) => ({ ...end, date: end.date as string }));
  }

  // --- Closures ------------------------------------------------------------

  async createClosure(input: ClosureInput): Promise<Closure> {
    const [created] = await this.db
      .insert(closure)
      .values(input)
      .returning(CLOSURE_COLUMNS);
    return created;
  }

  async updateClosure(
    id: string,
    input: ClosureInput,
  ): Promise<Closure | null> {
    const updated = await this.db
      .update(closure)
      .set(input)
      .where(eq(closure.id, id))
      .returning(CLOSURE_COLUMNS);
    return updated.at(0) ?? null;
  }

  async deleteClosure(id: string): Promise<boolean> {
    const deleted = await this.db
      .delete(closure)
      .where(eq(closure.id, id))
      .returning({ id: closure.id });
    return deleted.length > 0;
  }

  // --- Absences --------------------------------------------------------------

  async findAbsenceById(id: string): Promise<Absence | null> {
    const found = await this.db
      .select(ABSENCE_COLUMNS)
      .from(childAbsence)
      .innerJoin(child, eq(child.id, childAbsence.childId))
      .where(eq(childAbsence.id, id));
    return found.at(0) ?? null;
  }

  /** The enrollment period of a child, or null when the child does not exist. */
  async findEnrollment(
    childId: string,
  ): Promise<{ start: string; end: string | null } | null> {
    const found = await this.db
      .select({ start: child.enrollmentStart, end: child.enrollmentEnd })
      .from(child)
      .where(eq(child.id, childId));
    return found.at(0) ?? null;
  }

  /** Whether another absence of the child overlaps the period. */
  async hasOverlappingAbsence(
    input: Pick<AbsenceInput, 'childId' | 'startDate' | 'endDate'>,
    exceptId?: string,
  ): Promise<boolean> {
    const conditions = [
      eq(childAbsence.childId, input.childId),
      lte(childAbsence.startDate, input.endDate),
      gte(childAbsence.endDate, input.startDate),
    ];
    if (exceptId) {
      conditions.push(ne(childAbsence.id, exceptId));
    }
    const found = await this.db
      .select({ id: childAbsence.id })
      .from(childAbsence)
      .where(and(...conditions))
      .limit(1);
    return found.length > 0;
  }

  async createAbsence(input: AbsenceInput): Promise<Absence> {
    const [created] = await this.db
      .insert(childAbsence)
      .values(input)
      .returning({ id: childAbsence.id });
    return (await this.findAbsenceById(created.id)) as Absence;
  }

  async updateAbsence(
    id: string,
    input: AbsenceInput,
  ): Promise<Absence | null> {
    const updated = await this.db
      .update(childAbsence)
      .set(input)
      .where(eq(childAbsence.id, id))
      .returning({ id: childAbsence.id });
    return updated.length > 0 ? this.findAbsenceById(id) : null;
  }

  async deleteAbsence(id: string): Promise<boolean> {
    const deleted = await this.db
      .delete(childAbsence)
      .where(eq(childAbsence.id, id))
      .returning({ id: childAbsence.id });
    return deleted.length > 0;
  }
}
