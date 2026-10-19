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
    active: boolean('active').notNull().default(true),
    createdAt: createdAt(),
  },
  (t) => [index('idx_child_nursery').on(t.nurseryId)],
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
  },
  (t) => [primaryKey({ columns: [t.childId, t.parentId] })],
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
// Relations (used by the relational query API: `db.query.<table>`)
// ---------------------------------------------------------------------------

export const childRelations = relations(child, ({ one, many }) => ({
  nursery: one(nursery, {
    fields: [child.nurseryId],
    references: [nursery.id],
  }),
  reports: many(dailyReport),
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
