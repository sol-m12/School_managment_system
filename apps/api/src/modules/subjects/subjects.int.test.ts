import { eq, is } from "drizzle-orm";
import { MySqlTable, getTableConfig } from "drizzle-orm/mysql-core";
import request from "supertest";
import { beforeAll, describe, expect, it } from "vitest";
import { db } from "../../db/index.js";
import * as schema from "../../db/schema/index.js";
import { groupsInfo, subjects, teacherAssignments } from "../../db/schema/index.js";
import { createAccessToken } from "../../lib/jwt.js";
import { PERMISSIONS, hasPermission } from "../../lib/permissions.js";
import { ROLES, type Role } from "../../lib/roles.js";
import { scoped } from "../../lib/tenant.js";
import { createTestApp } from "../../test/createTestApp.js";
import { describeTenantIsolation } from "../../test/describeTenantIsolation.js";
import { seedTwoTenants, type IsolationSeed } from "../../test/seed.js";
import {
  SUBJECT_REFERENCES,
  SubjectError,
  deleteSubject,
  getSubject,
  listSubjects,
  updateSubject,
} from "./subjects.service.js";

const app = createTestApp();

function bearer(tenantId: number, role: Role = "V_Principal"): string {
  return `Bearer ${createAccessToken({ userId: 1, tenantId, role })}`;
}

type Body = Record<string, unknown>;

function validBody(overrides: Body = {}): Body {
  return {
    subjectName: "ፊዚክስ",
    gradeLevel: 11,
    stream: "Natural",
    creditHours: 3,
    sortOrder: 1,
    isVocational: false,
    ...overrides,
  };
}

async function createViaApi(tenantId: number, body: Body): Promise<number> {
  const res = await request(app).post("/subjects").set("Authorization", bearer(tenantId)).send(body).expect(201);
  return res.body.subject.id as number;
}

async function rawSubject(tenantId: number, id: number) {
  const [row] = await db
    .select()
    .from(subjects)
    .where(scoped(subjects, tenantId, eq(subjects.subjectId, id)))
    .limit(1);
  return row;
}

describeTenantIsolation("subjects", {
  resourceId: (seed) => ({ aId: seed.tenantA.subjectId, bId: seed.tenantB.subjectId }),
  list: async (tenantId) => (await listSubjects(tenantId, 1, 100)).rows,
  get: async (tenantId, id) => {
    try {
      return await getSubject(tenantId, id);
    } catch (error) {
      if (error instanceof SubjectError && error.code === "SUBJECT_NOT_FOUND") return null;
      throw error;
    }
  },
  update: async (tenantId, id) => {
    await expect(
      updateSubject(tenantId, id, {
        subjectName: "Cross-tenant write attempt",
        gradeLevel: 11,
        stream: "Social",
        creditHours: 1,
        sortOrder: 1,
        isVocational: false,
      }),
    ).rejects.toMatchObject({ code: "SUBJECT_NOT_FOUND" });
  },
  delete: async (tenantId, id) => {
    await expect(deleteSubject(tenantId, id)).rejects.toMatchObject({ code: "SUBJECT_NOT_FOUND" });
  },
});

describe("subjects API: tenant from the token only", () => {
  let seed: IsolationSeed;

  beforeAll(async () => {
    seed = await seedTwoTenants();
  });

  it("cannot read, update or delete another tenant's subject over HTTP", async () => {
    const auth = bearer(seed.tenantA.id);
    const bId = seed.tenantB.subjectId;

    const list = await request(app).get("/subjects").set("Authorization", auth).expect(200);
    const ids = (list.body.rows as { id: number }[]).map((r) => r.id);
    expect(ids).toContain(seed.tenantA.subjectId);
    expect(ids).not.toContain(bId);

    await request(app).get(`/subjects/${bId}`).set("Authorization", auth).expect(404);
    await request(app).put(`/subjects/${bId}`).set("Authorization", auth).send(validBody()).expect(404);
    await request(app).delete(`/subjects/${bId}`).set("Authorization", auth).expect(404);

    const untouched = await rawSubject(seed.tenantB.id, bId);
    expect(untouched?.subjectName).toBe("Seed Subject");
  });

  it("ignores tenantId / tenant_id in body and query", async () => {
    const res = await request(app)
      .post("/subjects")
      .query({ tenantId: seed.tenantB.id, tenant_id: seed.tenantB.id })
      .set("Authorization", bearer(seed.tenantA.id))
      .send(validBody({ subjectName: "Tenant Body Test", tenantId: seed.tenantB.id, tenant_id: seed.tenantB.id }))
      .expect(201);
    const id = res.body.subject.id as number;
    expect((await rawSubject(seed.tenantA.id, id))?.tenantId).toBe(seed.tenantA.id);
    expect(await rawSubject(seed.tenantB.id, id)).toBeUndefined();
  });
});

describe("subjects API: permissions", () => {
  let seed: IsolationSeed;
  const allowed: readonly Role[] = ["V_Principal", "Admin"];
  const denied = ROLES.filter((role) => !allowed.includes(role));

  beforeAll(async () => {
    seed = await seedTwoTenants();
  });

  it("grants every subjects key to V_Principal and Admin only", () => {
    for (const role of ROLES) {
      for (const permission of PERMISSIONS) {
        expect(hasPermission(role, permission)).toBe(allowed.includes(role));
      }
    }
  });

  it("returns 401 without a token", async () => {
    await request(app).get("/subjects").expect(401);
    await request(app).post("/subjects").send(validBody()).expect(401);
  });

  it.each(denied)("returns 403 for %s on every endpoint", async (role) => {
    const auth = bearer(seed.tenantA.id, role);
    const id = seed.tenantA.subjectId;
    const calls = [
      request(app).get("/subjects").set("Authorization", auth),
      request(app).get(`/subjects/${id}`).set("Authorization", auth),
      request(app).post("/subjects").set("Authorization", auth).send(validBody({ subjectName: `X ${role}` })),
      request(app).put(`/subjects/${id}`).set("Authorization", auth).send(validBody()),
      request(app).delete(`/subjects/${id}`).set("Authorization", auth),
    ];
    for (const res of await Promise.all(calls)) {
      expect(res.status).toBe(403);
      expect(res.body).toEqual({ code: "AUTH_FORBIDDEN" });
    }
    expect((await rawSubject(seed.tenantA.id, id))?.subjectName).toBe("Seed Subject");
  });

  it.each(allowed)("lets %s create, read, update and delete", async (role) => {
    const auth = bearer(seed.tenantA.id, role);
    const created = await request(app)
      .post("/subjects")
      .set("Authorization", auth)
      .send(validBody({ subjectName: `Allowed ${role}` }))
      .expect(201);
    const id = created.body.subject.id as number;
    await request(app).get(`/subjects/${id}`).set("Authorization", auth).expect(200);
    await request(app)
      .put(`/subjects/${id}`)
      .set("Authorization", auth)
      .send(validBody({ subjectName: `Allowed ${role} 2` }))
      .expect(200);
    await request(app).delete(`/subjects/${id}`).set("Authorization", auth).expect(204);
  });

  it("GET /auth/me returns the permission keys", async () => {
    const login = await request(app)
      .post("/auth/login")
      .send({ tenantSlug: seed.tenantA.slug, username: seed.username, password: seed.password })
      .expect(200);
    expect(login.body.user.permissions).toEqual([...PERMISSIONS]);
    const me = await request(app)
      .get("/auth/me")
      .set("Authorization", `Bearer ${login.body.accessToken as string}`)
      .expect(200);
    expect(me.body.user.permissions).toEqual([...PERMISSIONS]);
  });
});

describe("subjects API: validation", () => {
  let seed: IsolationSeed;

  beforeAll(async () => {
    seed = await seedTwoTenants();
  });

  const invalid: [string, Body][] = [
    ["empty name", { subjectName: "" }],
    ["blank name", { subjectName: "   " }],
    ["name over 100 characters", { subjectName: "ሀ".repeat(101) }],
    ["missing name", { subjectName: undefined }],
    ["grade 8", { gradeLevel: 8 }],
    ["grade 13", { gradeLevel: 13 }],
    ["unknown stream", { stream: "Technical" }],
    ["credit -1", { creditHours: -1 }],
    ["credit 21", { creditHours: 21 }],
    ["credit 2.5", { creditHours: 2.5 }],
    ["empty credit", { creditHours: "" }],
    ["null credit", { creditHours: null }],
    ["missing credit", { creditHours: undefined }],
    ["credit as text", { creditHours: "3" }],
    ["order -1", { sortOrder: -1 }],
    ["order 1000", { sortOrder: 1000 }],
    ["order 1.5", { sortOrder: 1.5 }],
    ["missing order", { sortOrder: undefined }],
    ["vocational not boolean", { isVocational: "on" }],
  ];

  it.each(invalid)("rejects %s with VALIDATION_ERROR on create and edit", async (_label, overrides) => {
    const auth = bearer(seed.tenantA.id);
    const body = validBody({ subjectName: "Validation Target", ...overrides });
    const create = await request(app).post("/subjects").set("Authorization", auth).send(body);
    expect(create.status).toBe(400);
    expect(create.body).toEqual({ code: "VALIDATION_ERROR" });

    const edit = await request(app).put(`/subjects/${seed.tenantA.subjectId}`).set("Authorization", auth).send(body);
    expect(edit.status).toBe(400);
    expect(edit.body).toEqual({ code: "VALIDATION_ERROR" });
  });

  it("accepts the limits 0 and 20 credit, 0 and 999 order, and a 100-character Amharic name", async () => {
    await createViaApi(seed.tenantA.id, validBody({ subjectName: "Limit Low", creditHours: 0, sortOrder: 0 }));
    await createViaApi(seed.tenantA.id, validBody({ subjectName: "Limit High", creditHours: 20, sortOrder: 999 }));
    const id = await createViaApi(seed.tenantA.id, validBody({ subjectName: "ሀ".repeat(100) }));
    expect((await rawSubject(seed.tenantA.id, id))?.subjectName).toBe("ሀ".repeat(100));
  });

  it("trims the name before saving", async () => {
    const id = await createViaApi(seed.tenantA.id, validBody({ subjectName: "  ኬሚስትሪ  " }));
    expect((await rawSubject(seed.tenantA.id, id))?.subjectName).toBe("ኬሚስትሪ");
  });

  it("returns 404 for a non-numeric id", async () => {
    await request(app).get("/subjects/abc").set("Authorization", bearer(seed.tenantA.id)).expect(404);
  });
});

describe("subjects API: grade 9-10 stream rule", () => {
  let seed: IsolationSeed;

  beforeAll(async () => {
    seed = await seedTwoTenants();
  });

  it.each([
    [9, "Natural"],
    [9, "Social"],
    [10, "Natural"],
    [10, "Social"],
  ])("rejects grade %i with stream %s on create", async (gradeLevel, stream) => {
    const res = await request(app)
      .post("/subjects")
      .set("Authorization", bearer(seed.tenantA.id))
      .send(validBody({ gradeLevel, stream }));
    expect(res.status).toBe(400);
    expect(res.body).toEqual({ code: "SUBJECT_STREAM_INVALID" });
  });

  it("rejects moving a subject to grade 10 with a non-Common stream on edit", async () => {
    const id = await createViaApi(seed.tenantA.id, validBody({ subjectName: "Stream Edit", gradeLevel: 11 }));
    const res = await request(app)
      .put(`/subjects/${id}`)
      .set("Authorization", bearer(seed.tenantA.id))
      .send(validBody({ subjectName: "Stream Edit", gradeLevel: 10, stream: "Natural" }));
    expect(res.status).toBe(400);
    expect(res.body).toEqual({ code: "SUBJECT_STREAM_INVALID" });
    expect((await rawSubject(seed.tenantA.id, id))?.gradeLevel).toBe(11);
  });

  it.each([
    [9, "Common"],
    [10, "Common"],
    [11, "Common"],
    [11, "Natural"],
    [12, "Social"],
  ])("accepts grade %i with stream %s", async (gradeLevel, stream) => {
    await createViaApi(seed.tenantA.id, validBody({ subjectName: `Ok ${gradeLevel} ${stream}`, gradeLevel, stream }));
  });
});

describe("subjects API: duplicates and edit", () => {
  let seed: IsolationSeed;

  beforeAll(async () => {
    seed = await seedTwoTenants();
  });

  it("returns SUBJECT_DUPLICATE (409) for the same name, grade and stream on create", async () => {
    await createViaApi(seed.tenantA.id, validBody({ subjectName: "ባዮሎጂ" }));
    const res = await request(app)
      .post("/subjects")
      .set("Authorization", bearer(seed.tenantA.id))
      .send(validBody({ subjectName: " ባዮሎጂ ", creditHours: 5 }));
    expect(res.status).toBe(409);
    expect(res.body).toEqual({ code: "SUBJECT_DUPLICATE" });
  });

  it("parallel creates of the same subject give one 201 and SUBJECT_DUPLICATE for the rest (unique index, errno 1062)", async () => {
    const auth = bearer(seed.tenantA.id);
    const body = validBody({ subjectName: "Race Subject" });
    const results = await Promise.all(
      Array.from({ length: 6 }, () => request(app).post("/subjects").set("Authorization", auth).send(body)),
    );
    const statuses = results.map((r) => r.status).sort();
    expect(statuses.filter((s) => s === 201)).toHaveLength(1);
    expect(statuses.filter((s) => s === 409)).toHaveLength(5);
    for (const res of results.filter((r) => r.status === 409)) {
      expect(res.body).toEqual({ code: "SUBJECT_DUPLICATE" });
    }
  });

  it("allows the same name in another stream, grade or tenant", async () => {
    await createViaApi(seed.tenantA.id, validBody({ subjectName: "ባዮሎጂ", stream: "Social" }));
    await createViaApi(seed.tenantA.id, validBody({ subjectName: "ባዮሎጂ", gradeLevel: 12 }));
    await createViaApi(seed.tenantB.id, validBody({ subjectName: "ባዮሎጂ" }));
  });

  it("returns SUBJECT_DUPLICATE (409) when an edit collides with another subject", async () => {
    const id = await createViaApi(seed.tenantA.id, validBody({ subjectName: "ጂኦግራፊ" }));
    const res = await request(app)
      .put(`/subjects/${id}`)
      .set("Authorization", bearer(seed.tenantA.id))
      .send(validBody({ subjectName: "ባዮሎጂ" }));
    expect(res.status).toBe(409);
    expect(res.body).toEqual({ code: "SUBJECT_DUPLICATE" });
    expect((await rawSubject(seed.tenantA.id, id))?.subjectName).toBe("ጂኦግራፊ");
  });

  it("saving a subject with its own unchanged name is not a duplicate", async () => {
    const id = await createViaApi(seed.tenantA.id, validBody({ subjectName: "ታሪክ" }));
    await request(app)
      .put(`/subjects/${id}`)
      .set("Authorization", bearer(seed.tenantA.id))
      .send(validBody({ subjectName: "ታሪክ", creditHours: 4 }))
      .expect(200);
  });

  it("edit writes only the six form columns", async () => {
    const id = await createViaApi(seed.tenantA.id, validBody({ subjectName: "Keep Columns" }));
    const parentId = await createViaApi(seed.tenantA.id, validBody({ subjectName: "Keep Parent" }));
    await db
      .update(subjects)
      .set({ teacherId: 77, fullMark: "50.00", isOffered: 1, parentSubjectId: parentId })
      .where(scoped(subjects, seed.tenantA.id, eq(subjects.subjectId, id)));

    const res = await request(app)
      .put(`/subjects/${id}`)
      .set("Authorization", bearer(seed.tenantA.id))
      .send(validBody({ subjectName: "Kept", gradeLevel: 12, stream: "Social", creditHours: 6, sortOrder: 9, isVocational: true }))
      .expect(200);
    expect(res.body.subject).toEqual({
      id,
      subjectName: "Kept",
      gradeLevel: 12,
      stream: "Social",
      creditHours: 6,
      sortOrder: 9,
      isVocational: true,
    });

    const row = await rawSubject(seed.tenantA.id, id);
    expect(row).toMatchObject({ teacherId: 77, fullMark: "50.00", isOffered: 1, parentSubjectId: parentId });
  });
});

describe("subjects API: delete", () => {
  let seed: IsolationSeed;

  beforeAll(async () => {
    seed = await seedTwoTenants();
  });

  it("checks every column that references subjects in the generated schema", () => {
    const expected = new Set<string>();
    for (const value of Object.values(schema)) {
      if (!is(value, MySqlTable)) continue;
      const config = getTableConfig(value);
      for (const column of config.columns) {
        const isReference = column.name === "subject_id" || column.name === "parent_subject_id";
        if (isReference && !(config.name === "subjects" && column.name === "subject_id")) {
          expected.add(`${config.name}.${column.name}`);
        }
      }
    }
    const checked = new Set(SUBJECT_REFERENCES.map((ref) => `${getTableConfig(ref.table).name}.${ref.subjectId.name}`));
    expect(checked).toEqual(expected);
  });

  it("blocks delete when a table without a foreign key uses the subject (teacher_assignments)", async () => {
    const id = await createViaApi(seed.tenantA.id, validBody({ subjectName: "Used By Assignment" }));
    await db.insert(teacherAssignments).values({ staffId: 1, subjectId: id, gradeLevel: 11, section: "A", tenantId: seed.tenantA.id });

    const res = await request(app).delete(`/subjects/${id}`).set("Authorization", bearer(seed.tenantA.id));
    expect(res.status).toBe(409);
    expect(res.body).toEqual({ code: "SUBJECT_IN_USE" });
    expect(await rawSubject(seed.tenantA.id, id)).toBeDefined();
  });

  it("blocks delete when a table with a foreign key uses the subject (groups_info)", async () => {
    const id = await createViaApi(seed.tenantA.id, validBody({ subjectName: "Used By Group" }));
    await db.insert(groupsInfo).values({
      groupName: "Group 1",
      teacherId: seed.tenantA.userId,
      subjectId: id,
      gradeLevel: 11,
      section: "A",
      academicYear: "2017",
      tenantId: seed.tenantA.id,
    });

    const res = await request(app).delete(`/subjects/${id}`).set("Authorization", bearer(seed.tenantA.id));
    expect(res.status).toBe(409);
    expect(res.body).toEqual({ code: "SUBJECT_IN_USE" });
    expect(await rawSubject(seed.tenantA.id, id)).toBeDefined();
  });

  it("blocks delete of a parent subject", async () => {
    const parentId = await createViaApi(seed.tenantA.id, validBody({ subjectName: "Parent Subject" }));
    const childId = await createViaApi(seed.tenantA.id, validBody({ subjectName: "Child Subject" }));
    await db
      .update(subjects)
      .set({ parentSubjectId: parentId })
      .where(scoped(subjects, seed.tenantA.id, eq(subjects.subjectId, childId)));

    const res = await request(app).delete(`/subjects/${parentId}`).set("Authorization", bearer(seed.tenantA.id));
    expect(res.status).toBe(409);
    expect(res.body).toEqual({ code: "SUBJECT_IN_USE" });
  });

  it("deletes a subject that is not used", async () => {
    const id = await createViaApi(seed.tenantA.id, validBody({ subjectName: "Unused Subject" }));
    await request(app).delete(`/subjects/${id}`).set("Authorization", bearer(seed.tenantA.id)).expect(204);
    expect(await rawSubject(seed.tenantA.id, id)).toBeUndefined();
    await request(app).delete(`/subjects/${id}`).set("Authorization", bearer(seed.tenantA.id)).expect(404);
  });
});

describe("subjects API: pagination with a few hundred rows", () => {
  let seed: IsolationSeed;
  const TENANT_A_EXTRA = 400;
  const TENANT_B_EXTRA = 150;
  const STREAMS = ["Common", "Natural", "Social"] as const;

  function bulkRows(tenantId: number, count: number, prefix: string) {
    return Array.from({ length: count }, (_, i) => {
      const gradeLevel = 9 + (i % 4);
      return {
        subjectName: `${prefix} ${String(i).padStart(3, "0")}`,
        gradeLevel,
        stream: gradeLevel <= 10 ? ("Common" as const) : STREAMS[i % 3],
        creditHours: i % 21,
        sortOrder: (i * 7) % 15,
        isVocational: i % 5 === 0 ? 1 : 0,
        tenantId,
      };
    });
  }

  beforeAll(async () => {
    seed = await seedTwoTenants();
    await db.insert(subjects).values(bulkRows(seed.tenantA.id, TENANT_A_EXTRA, "Bulk A"));
    await db.insert(subjects).values(bulkRows(seed.tenantB.id, TENANT_B_EXTRA, "Bulk B"));
  });

  it("returns one page at a time with the server total", async () => {
    const started = Date.now();
    const res = await request(app)
      .get("/subjects")
      .query({ page: 1, pageSize: 25 })
      .set("Authorization", bearer(seed.tenantA.id))
      .expect(200);
    expect(Date.now() - started).toBeLessThan(2000);
    expect(res.body.rows).toHaveLength(25);
    expect(res.body.total).toBe(TENANT_A_EXTRA + 2);
    expect(res.body).toMatchObject({ page: 1, pageSize: 25 });
  });

  it("walks every page, sorted by grade, sort order, then name, with no other-tenant rows", async () => {
    const auth = bearer(seed.tenantA.id);
    const rows: { id: number; subjectName: string; gradeLevel: number; sortOrder: number | null }[] = [];
    for (let page = 1; page <= 5; page += 1) {
      const res = await request(app).get("/subjects").query({ page, pageSize: 100 }).set("Authorization", auth).expect(200);
      rows.push(...res.body.rows);
    }
    expect(rows).toHaveLength(TENANT_A_EXTRA + 2);
    expect(new Set(rows.map((r) => r.id)).size).toBe(rows.length);
    expect(rows.some((r) => r.subjectName.startsWith("Bulk B"))).toBe(false);
    expect(rows.map((r) => r.id)).not.toContain(seed.tenantB.subjectId);

    for (let i = 1; i < rows.length; i += 1) {
      const prev = rows[i - 1];
      const cur = rows[i];
      const order = [prev.gradeLevel - cur.gradeLevel, (prev.sortOrder ?? 0) - (cur.sortOrder ?? 0)];
      const firstDifference = order.find((d) => d !== 0);
      if (firstDifference !== undefined) {
        expect(firstDifference).toBeLessThan(0);
      } else {
        expect(prev.subjectName.toLowerCase() <= cur.subjectName.toLowerCase()).toBe(true);
      }
    }
  });

  it("returns an empty page past the end and keeps the total", async () => {
    const res = await request(app)
      .get("/subjects")
      .query({ page: 99, pageSize: 25 })
      .set("Authorization", bearer(seed.tenantA.id))
      .expect(200);
    expect(res.body.rows).toEqual([]);
    expect(res.body.total).toBe(TENANT_A_EXTRA + 2);
  });

  it.each([
    [{ page: 0 }],
    [{ pageSize: 0 }],
    [{ pageSize: 101 }],
    [{ page: "x" }],
  ])("rejects bad paging %j", async (query) => {
    const res = await request(app).get("/subjects").query(query).set("Authorization", bearer(seed.tenantA.id));
    expect(res.status).toBe(400);
    expect(res.body).toEqual({ code: "VALIDATION_ERROR" });
  });

  it("tenant B sees only its own total", async () => {
    const res = await request(app).get("/subjects").set("Authorization", bearer(seed.tenantB.id)).expect(200);
    expect(res.body.total).toBe(TENANT_B_EXTRA + 1);
  });
});
