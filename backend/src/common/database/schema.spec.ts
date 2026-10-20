import { getTableName } from 'drizzle-orm';
import { getTableConfig, type PgTable } from 'drizzle-orm/pg-core';
import {
  child,
  childAbsence,
  childContact,
  childParent,
  closure,
  dailyReport,
  nursery,
  parent,
  reportBottle,
  reportMeal,
  reportNap,
} from './schema.js';

/** `column -> table.column (on delete)` for each foreign key of the table. */
function foreignKeys(table: PgTable): string[] {
  return getTableConfig(table).foreignKeys.map((fk) => {
    const { columns, foreignColumns, foreignTable } = fk.reference();
    return `${columns[0].name} -> ${getTableName(foreignTable)}.${foreignColumns[0].name} (${fk.onDelete})`;
  });
}

describe('schema', () => {
  it('deletes the data of a child with the child, and the child with the nursery', () => {
    expect(foreignKeys(child)).toEqual(['nursery_id -> nursery.id (cascade)']);
    for (const table of [childContact, childAbsence, dailyReport]) {
      expect(foreignKeys(table)).toEqual(['child_id -> child.id (cascade)']);
    }
    expect(foreignKeys(childParent).sort()).toEqual([
      'child_id -> child.id (cascade)',
      'parent_id -> parent.id (cascade)',
    ]);
  });

  it('deletes the meals, bottles and naps with their report', () => {
    for (const table of [reportMeal, reportBottle, reportNap]) {
      expect(foreignKeys(table)).toEqual([
        'report_id -> daily_report.id (cascade)',
      ]);
    }
  });

  it('keeps the nursery, the parents and the closures independent', () => {
    for (const table of [nursery, parent, closure]) {
      expect(foreignKeys(table)).toEqual([]);
    }
  });
});
