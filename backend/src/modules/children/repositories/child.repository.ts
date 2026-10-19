import { Inject, Injectable } from '@nestjs/common';
import { asc, eq, notExists, sql } from 'drizzle-orm';
import { DRIZZLE } from '../../../common/constants/injection-tokens.js';
import type { Database } from '../../../common/database/database.module.js';
import {
  child,
  childContact,
  childParent,
  nursery,
  parent,
} from '../../../common/database/schema.js';
import type {
  Child,
  ChildInput,
  ParentRelationship,
} from '../models/child.model.js';

type Transaction = Parameters<Parameters<Database['transaction']>[0]>[0];

/** Parents and contacts, loaded with the child in one relational query. */
const WITH_RELATIONS = {
  parents: {
    columns: { relationship: true },
    orderBy: childParent.position,
    with: {
      parent: {
        columns: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
        },
      },
    },
  },
  contacts: {
    columns: {
      firstName: true,
      lastName: true,
      relationship: true,
      phone: true,
    },
    orderBy: childContact.position,
  },
} as const;

/** Shape returned by the relational queries using `WITH_RELATIONS`. */
type ChildWithRelations = typeof child.$inferSelect & {
  parents: {
    relationship: string;
    parent: Pick<
      typeof parent.$inferSelect,
      'id' | 'firstName' | 'lastName' | 'email' | 'phone'
    >;
  }[];
  contacts: Pick<
    typeof childContact.$inferSelect,
    'firstName' | 'lastName' | 'relationship' | 'phone'
  >[];
};

/** Placeholder until the nursery gets its own settings page. */
const DEFAULT_NURSERY = {
  name: 'Ma crèche',
  address: 'Adresse à renseigner',
  capacity: 1,
};

@Injectable()
export class ChildRepository {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  /** Every child, past and future enrollments included, sorted by name. */
  async findAll(): Promise<Child[]> {
    const children = await this.db.query.child.findMany({
      with: WITH_RELATIONS,
      orderBy: [asc(child.lastName), asc(child.firstName)],
    });
    return children.map((row) => this.toModel(row));
  }

  async findById(id: string): Promise<Child | null> {
    const row = await this.db.query.child.findFirst({
      where: eq(child.id, id),
      with: WITH_RELATIONS,
    });
    return row ? this.toModel(row) : null;
  }

  async create(input: ChildInput): Promise<Child> {
    const id = await this.db.transaction(async (tx) => {
      const nurseryId = await this.currentNurseryId(tx);
      const [created] = await tx
        .insert(child)
        .values({ nurseryId, ...this.childColumns(input) })
        .returning({ id: child.id });
      await this.saveRelations(tx, created.id, input);
      return created.id;
    });
    return (await this.findById(id)) as Child;
  }

  /** Replaces the child, its parents and contacts; null when it does not exist. */
  async update(id: string, input: ChildInput): Promise<Child | null> {
    const found = await this.db.transaction(async (tx) => {
      const updated = await tx
        .update(child)
        .set({ ...this.childColumns(input), updatedAt: sql`now()` })
        .where(eq(child.id, id))
        .returning({ id: child.id });
      if (updated.length === 0) {
        return false;
      }
      await tx.delete(childParent).where(eq(childParent.childId, id));
      await tx.delete(childContact).where(eq(childContact.childId, id));
      await this.saveRelations(tx, id, input);
      await this.deleteOrphanParents(tx);
      return true;
    });
    return found ? this.findById(id) : null;
  }

  private childColumns(input: ChildInput) {
    return {
      firstName: input.firstName,
      lastName: input.lastName,
      birthDate: input.birthDate,
      enrollmentStart: input.enrollmentStart,
      enrollmentEnd: input.enrollmentEnd,
    };
  }

  private async saveRelations(
    tx: Transaction,
    childId: string,
    input: ChildInput,
  ): Promise<void> {
    for (const [position, item] of input.parents.entries()) {
      // A parent already known by email (e.g. for a sibling) is reused and updated.
      const [saved] = await tx
        .insert(parent)
        .values({
          firstName: item.firstName,
          lastName: item.lastName,
          email: item.email,
          phone: item.phone,
        })
        .onConflictDoUpdate({
          target: parent.email,
          set: {
            firstName: item.firstName,
            lastName: item.lastName,
            phone: item.phone,
          },
        })
        .returning({ id: parent.id });
      await tx.insert(childParent).values({
        childId,
        parentId: saved.id,
        relationship: item.relationship,
        position,
      });
    }
    if (input.contacts.length > 0) {
      await tx.insert(childContact).values(
        input.contacts.map((contact, position) => ({
          childId,
          position,
          ...contact,
        })),
      );
    }
  }

  /** Parents no longer linked to any child are personal data to drop. */
  private async deleteOrphanParents(tx: Transaction): Promise<void> {
    await tx
      .delete(parent)
      .where(
        notExists(
          tx
            .select({ id: childParent.parentId })
            .from(childParent)
            .where(eq(childParent.parentId, parent.id)),
        ),
      );
  }

  /** The application serves a single nursery: the oldest one, created if needed. */
  private async currentNurseryId(tx: Transaction): Promise<string> {
    const existing = (
      await tx
        .select({ id: nursery.id })
        .from(nursery)
        .orderBy(asc(nursery.createdAt), asc(nursery.id))
        .limit(1)
    ).at(0);
    if (existing) {
      return existing.id;
    }
    const [created] = await tx
      .insert(nursery)
      .values(DEFAULT_NURSERY)
      .returning({ id: nursery.id });
    return created.id;
  }

  private toModel(row: ChildWithRelations): Child {
    return {
      id: row.id,
      firstName: row.firstName,
      lastName: row.lastName,
      birthDate: row.birthDate,
      enrollmentStart: row.enrollmentStart,
      enrollmentEnd: row.enrollmentEnd,
      parents: row.parents.map(({ relationship, parent: p }) => ({
        ...p,
        relationship: relationship as ParentRelationship,
      })),
      contacts: row.contacts,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }
}
