// Database schema, source of truth for the migrations (`npm run db:generate`).
// Column names are explicit snake_case; TypeScript properties are camelCase.
import { relations, sql } from 'drizzle-orm';
import {
  boolean,
  check,
  date,
  index,
  integer,
  pgTable,
  primaryKey,
  smallint,
  time,
  timestamp,
  unique,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';

const createdAt = () =>
  timestamp('created_at', { withTimezone: true }).notNull().defaultNow();

// ---------------------------------------------------------------------------
// Nurseries, children and parents
// ---------------------------------------------------------------------------

export const nursery = pgTable(
  'nursery',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: varchar('name', { length: 150 }).notNull(),
    address: varchar('address', { length: 255 }).notNull(),
    capacity: integer('capacity').notNull(),
    createdAt: createdAt(),
  },
  (t) => [check('ck_nursery_capacity', sql`${t.capacity} > 0`)],
);

export const child = pgTable(
  'child',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    nurseryId: uuid('nursery_id')
      .notNull()
      .references(() => nursery.id, { onDelete: 'cascade' }),
    firstName: varchar('first_name', { length: 100 }).notNull(),
    lastName: varchar('last_name', { length: 100 }).notNull(),
    birthDate: date('birth_date', { mode: 'string' }).notNull(),
    /** First day the child is enrolled (attends the nursery). */
    enrollmentStart: date('enrollment_start', { mode: 'string' }).notNull(),
    /** Last day the child is enrolled; null while the end is not known. */
    enrollmentEnd: date('enrollment_end', { mode: 'string' }),
    createdAt: createdAt(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index('idx_child_nursery').on(t.nurseryId),
    index('idx_child_enrollment').on(t.enrollmentStart, t.enrollmentEnd),
    check(
      'ck_child_enrollment_after_birth',
      sql`${t.enrollmentStart} >= ${t.birthDate}`,
    ),
    check(
      'ck_child_enrollment_period',
      sql`${t.enrollmentEnd} is null or ${t.enrollmentEnd} >= ${t.enrollmentStart}`,
    ),
  ],
);

export const parent = pgTable('parent', {
  id: uuid('id').primaryKey().defaultRandom(),
  firstName: varchar('first_name', { length: 100 }).notNull(),
  lastName: varchar('last_name', { length: 100 }).notNull(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  phone: varchar('phone', { length: 30 }),
  createdAt: createdAt(),
});

/** A child can have several parents/guardians and a parent several children. */
export const childParent = pgTable(
  'child_parent',
  {
    childId: uuid('child_id')
      .notNull()
      .references(() => child.id, { onDelete: 'cascade' }),
    parentId: uuid('parent_id')
      .notNull()
      .references(() => parent.id, { onDelete: 'cascade' }),
    /** mother, father, guardian... */
    relationship: varchar('relationship', { length: 30 })
      .notNull()
      .default('parent'),
    /** Display order of the parents of a child (0 = first contact). */
    position: smallint('position').notNull().default(0),
  },
  (t) => [
    primaryKey({ columns: [t.childId, t.parentId] }),
    index('idx_child_parent_parent').on(t.parentId),
  ],
);

/** Additional people to call (grandparents, neighbours...), per child. */
export const childContact = pgTable(
  'child_contact',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    childId: uuid('child_id')
      .notNull()
      .references(() => child.id, { onDelete: 'cascade' }),
    position: smallint('position').notNull().default(0),
    firstName: varchar('first_name', { length: 100 }).notNull(),
    lastName: varchar('last_name', { length: 100 }).notNull(),
    /** Free text: grandmother, neighbour, nanny... */
    relationship: varchar('relationship', { length: 50 }).notNull(),
    phone: varchar('phone', { length: 30 }).notNull(),
  },
  (t) => [index('idx_child_contact_child').on(t.childId)],
);

// ---------------------------------------------------------------------------
// Daily reports (one per child per weekday)
// ---------------------------------------------------------------------------

export const dailyReport = pgTable(
  'daily_report',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    childId: uuid('child_id')
      .notNull()
      .references(() => child.id, { onDelete: 'cascade' }),
    reportDate: date('report_date', { mode: 'string' }).notNull(),
    absent: boolean('absent').notNull().default(false),
    absenceComment: varchar('absence_comment', { length: 500 }),
    arrivalTime: time('arrival_time'),
    departureTime: time('departure_time'),
    mealComment: varchar('meal_comment', { length: 500 }),
    noNap: boolean('no_nap').notNull().default(false),
    napComment: varchar('nap_comment', { length: 500 }),
    stoolStatus: varchar('stool_status', { length: 10 })
      .$type<'normal' | 'other'>()
      .notNull()
      .default('normal'),
    stoolComment: varchar('stool_comment', { length: 500 }),
    parentNote: varchar('parent_note', { length: 1000 }),
    createdAt: createdAt(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    unique('uq_daily_report_child_date').on(t.childId, t.reportDate),
    index('idx_daily_report_date').on(t.reportDate),
    check(
      'ck_daily_report_weekday',
      sql`extract(isodow from ${t.reportDate}) < 6`,
    ),
    check(
      'ck_daily_report_stool_status',
      sql`${t.stoolStatus} in ('normal', 'other')`,
    ),
    check(
      'ck_daily_report_stool_comment',
      sql`${t.stoolStatus} = 'normal' or ${t.stoolComment} is not null`,
    ),
  ],
);

/** Solid meals, with quantity in grams. */
export const reportMeal = pgTable(
  'report_meal',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    reportId: uuid('report_id')
      .notNull()
      .references(() => dailyReport.id, { onDelete: 'cascade' }),
    position: smallint('position').notNull().default(0),
    label: varchar('label', { length: 100 }).notNull(),
    quantityGrams: integer('quantity_grams'),
  },
  (t) => [
    index('idx_report_meal_report').on(t.reportId),
    check('ck_report_meal_quantity', sql`${t.quantityGrams} >= 0`),
  ],
);

/** Bottles, each with its own time and quantity in ml. */
export const reportBottle = pgTable(
  'report_bottle',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    reportId: uuid('report_id')
      .notNull()
      .references(() => dailyReport.id, { onDelete: 'cascade' }),
    time: time('time').notNull(),
    quantityMl: integer('quantity_ml'),
  },
  (t) => [
    index('idx_report_bottle_report').on(t.reportId),
    check('ck_report_bottle_quantity', sql`${t.quantityMl} >= 0`),
  ],
);

export const reportNap = pgTable(
  'report_nap',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    reportId: uuid('report_id')
      .notNull()
      .references(() => dailyReport.id, { onDelete: 'cascade' }),
    startTime: time('start_time').notNull(),
    endTime: time('end_time'),
  },
  (t) => [
    index('idx_report_nap_report').on(t.reportId),
    check(
      'ck_report_nap_end_after_start',
      sql`${t.endTime} is null or ${t.endTime} > ${t.startTime}`,
    ),
  ],
);

// ---------------------------------------------------------------------------
// Calendar: nursery closures and planned absences of the children
// (French public holidays are computed, see common/utils/public-holidays.util.ts)
// ---------------------------------------------------------------------------

/** Days the nursery is closed (holidays, bridges...), bounds included. */
export const closure = pgTable(
  'closure',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    startDate: date('start_date', { mode: 'string' }).notNull(),
    endDate: date('end_date', { mode: 'string' }).notNull(),
    label: varchar('label', { length: 100 }).notNull(),
    createdAt: createdAt(),
  },
  (t) => [
    index('idx_closure_period').on(t.startDate, t.endDate),
    check('ck_closure_period', sql`${t.endDate} >= ${t.startDate}`),
  ],
);

/** A child's planned absence (vacation, sickness...), bounds included. */
export const childAbsence = pgTable(
  'child_absence',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    childId: uuid('child_id')
      .notNull()
      .references(() => child.id, { onDelete: 'cascade' }),
    startDate: date('start_date', { mode: 'string' }).notNull(),
    endDate: date('end_date', { mode: 'string' }).notNull(),
    kind: varchar('kind', { length: 20 })
      .$type<'vacation' | 'sickness' | 'other'>()
      .notNull(),
    comment: varchar('comment', { length: 500 }),
    createdAt: createdAt(),
  },
  (t) => [
    index('idx_child_absence_child').on(t.childId),
    index('idx_child_absence_period').on(t.startDate, t.endDate),
    check('ck_child_absence_period', sql`${t.endDate} >= ${t.startDate}`),
    check(
      'ck_child_absence_kind',
      sql`${t.kind} in ('vacation', 'sickness', 'other')`,
    ),
  ],
);

// ---------------------------------------------------------------------------
// Relations (used by the relational query API: `db.query.<table>`)
// ---------------------------------------------------------------------------

export const childRelations = relations(child, ({ one, many }) => ({
  nursery: one(nursery, {
    fields: [child.nurseryId],
    references: [nursery.id],
  }),
  reports: many(dailyReport),
  parents: many(childParent),
  contacts: many(childContact),
  absences: many(childAbsence),
}));

export const childAbsenceRelations = relations(childAbsence, ({ one }) => ({
  child: one(child, { fields: [childAbsence.childId], references: [child.id] }),
}));

export const parentRelations = relations(parent, ({ many }) => ({
  children: many(childParent),
}));

export const childParentRelations = relations(childParent, ({ one }) => ({
  child: one(child, { fields: [childParent.childId], references: [child.id] }),
  parent: one(parent, {
    fields: [childParent.parentId],
    references: [parent.id],
  }),
}));

export const childContactRelations = relations(childContact, ({ one }) => ({
  child: one(child, { fields: [childContact.childId], references: [child.id] }),
}));

export const dailyReportRelations = relations(dailyReport, ({ one, many }) => ({
  child: one(child, { fields: [dailyReport.childId], references: [child.id] }),
  meals: many(reportMeal),
  bottles: many(reportBottle),
  naps: many(reportNap),
}));

export const reportMealRelations = relations(reportMeal, ({ one }) => ({
  report: one(dailyReport, {
    fields: [reportMeal.reportId],
    references: [dailyReport.id],
  }),
}));

export const reportBottleRelations = relations(reportBottle, ({ one }) => ({
  report: one(dailyReport, {
    fields: [reportBottle.reportId],
    references: [dailyReport.id],
  }),
}));

export const reportNapRelations = relations(reportNap, ({ one }) => ({
  report: one(dailyReport, {
    fields: [reportNap.reportId],
    references: [dailyReport.id],
  }),
}));
