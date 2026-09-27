import {
  sqliteTable,
  text,
  integer,
  index,
  primaryKey,
  uniqueIndex,
} from 'drizzle-orm/sqlite-core';
export const records = sqliteTable(
  'records',
  {
    id: text('id').notNull(),
    owner: text('owner').notNull(),
    kind: text('kind').notNull(),
    data: text('data').notNull(),
    version: integer('version').notNull().default(1),
    updated: text('updated').notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.owner, t.id] }),
    index('records_owner_kind').on(t.owner, t.kind),
  ],
);
export const audit = sqliteTable(
  'audit',
  {
    id: text('id').primaryKey(),
    owner: text('owner').notNull(),
    actor: text('actor').notNull(),
    action: text('action').notNull(),
    record: text('record').notNull(),
    before: text('before'),
    after: text('after'),
    time: text('time').notNull(),
  },
  (t) => [index('audit_owner_time').on(t.owner, t.time)],
);
export const settings = sqliteTable('settings', {
  owner: text('owner').primaryKey(),
  data: text('data').notNull(),
});
export const teamWorkspace = sqliteTable('team_workspace', {
  id: integer('id').primaryKey(),
  owner: text('owner').notNull(),
});
export const teamMembers = sqliteTable(
  'team_members',
  {
    userId: text('userId').primaryKey(),
    email: text('email').notNull(),
    name: text('name').notNull(),
    role: text('role').notNull(),
    status: text('status').notNull(),
    studies: text('studies').notNull().default('[]'),
    participantId: text('participantId'),
    version: integer('version').notNull().default(1),
  },
  (t) => [uniqueIndex('team_participant_assignment').on(t.participantId)],
);
