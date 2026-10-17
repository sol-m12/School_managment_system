/**
 * Parent tables from migration 20261018_parent_role.sql.
 * Re-run `npm run db:migrate-sql` then `npm run db:introspect` when MySQL is up;
 * after introspect picks these up in generated/, this file can be removed and
 * index.ts can export generated only again.
 */
import {
  char,
  date,
  index,
  int,
  mysqlEnum,
  mysqlTable,
  timestamp,
  unique,
  varchar,
} from "drizzle-orm/mysql-core";
import { tenants } from "./generated/schema.js";

export const parentIdentities = mysqlTable(
  "parent_identities",
  {
    parentId: int("parent_id").autoincrement().notNull(),
    parentCode: varchar("parent_code", { length: 32 }).notNull(),
    displayName: varchar("display_name", { length: 200 }).notNull(),
    createdAt: timestamp("created_at", { mode: "string" }).default("CURRENT_TIMESTAMP").notNull(),
  },
  (table) => [unique("uq_parent_identities_code").on(table.parentCode)],
);

export const parentStudentLinks = mysqlTable(
  "parent_student_links",
  {
    linkId: int("link_id").autoincrement().notNull(),
    parentId: int("parent_id").notNull(),
    studentId: int("student_id").notNull(),
    tenantId: int("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "restrict", onUpdate: "restrict" }),
    linkedBy: int("linked_by").notNull(),
    createdAt: timestamp("created_at", { mode: "string" }).default("CURRENT_TIMESTAMP").notNull(),
  },
  (table) => [
    unique("uq_parent_student_links_pair").on(table.parentId, table.studentId),
    index("idx_parent_student_links_tenant_id").on(table.tenantId),
    index("idx_parent_student_links_parent_id").on(table.parentId),
    index("idx_parent_student_links_student_id").on(table.studentId),
  ],
);

export const parentAppointmentRequests = mysqlTable(
  "parent_appointment_requests",
  {
    requestId: int("request_id").autoincrement().notNull(),
    tenantId: int("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "restrict", onUpdate: "restrict" }),
    parentUserId: int("parent_user_id").notNull(),
    parentId: int("parent_id").notNull(),
    studentId: int("student_id").notNull(),
    withRole: mysqlEnum("with_role", ["Principal", "V_Principal"]).notNull(),
    purpose: varchar({ length: 500 }).notNull(),
    preferredDate: date("preferred_date", { mode: "string" }).notNull(),
    preferredTime: char("preferred_time", { length: 5 }),
    status: mysqlEnum(["Pending", "Accepted", "Declined", "Cancelled"]).default("Pending").notNull(),
    createdAt: timestamp("created_at", { mode: "string" }).default("CURRENT_TIMESTAMP").notNull(),
  },
  (table) => [
    index("idx_par_appt_tenant_id").on(table.tenantId),
    index("idx_par_appt_parent_id").on(table.parentId),
    index("idx_par_appt_student_id").on(table.studentId),
  ],
);

export const parentMessages = mysqlTable(
  "parent_messages",
  {
    messageId: int("message_id").autoincrement().notNull(),
    tenantId: int("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "restrict", onUpdate: "restrict" }),
    parentUserId: int("parent_user_id").notNull(),
    parentId: int("parent_id").notNull(),
    studentId: int("student_id").notNull(),
    withRole: mysqlEnum("with_role", ["Principal", "V_Principal", "Homeroom", "Subject"]).notNull(),
    subjectName: varchar("subject_name", { length: 120 }),
    body: varchar({ length: 2000 }).notNull(),
    direction: mysqlEnum(["out", "in"]).default("out").notNull(),
    createdAt: timestamp("created_at", { mode: "string" }).default("CURRENT_TIMESTAMP").notNull(),
  },
  (table) => [
    index("idx_par_msg_tenant_id").on(table.tenantId),
    index("idx_par_msg_parent_id").on(table.parentId),
    index("idx_par_msg_student_id").on(table.studentId),
  ],
);
