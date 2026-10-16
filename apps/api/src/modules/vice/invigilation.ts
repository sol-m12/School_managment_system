export type ExamSlot = {
  id: number;
  date: string;
  start: string;
  end: string;
  needed: number;
};

export type TakenDuty = {
  sessionId: number;
  staffId: number;
  duty: "lead" | "assistant";
};

export type PlannedDuty = {
  sessionId: number;
  staffId: number;
  duty: "lead" | "assistant";
};

export type InvigilationPlan = {
  planned: PlannedDuty[];
  gaps: { sessionId: number; missing: number }[];
};

export function clocksOverlap(
  left: Pick<ExamSlot, "date" | "start" | "end">,
  right: Pick<ExamSlot, "date" | "start" | "end">,
): boolean {
  return left.date === right.date && left.start < right.end && right.start < left.end;
}

/**
 * Fill empty invigilation seats.
 * A teacher is never placed on two sessions that overlap.
 * The lightest load is chosen first, then the smaller staff id.
 * The first person on an empty session is the lead.
 */
export function planInvigilation(
  slots: ExamSlot[],
  staffIds: number[],
  taken: TakenDuty[],
  blocked: { sessionId: number; staffId: number }[] = [],
): InvigilationPlan {
  const byId = new Map(slots.map((slot) => [slot.id, slot]));
  const load = new Map<number, number>();
  for (const staffId of staffIds) load.set(staffId, 0);

  const occupied = taken.map((row) => ({ ...row }));
  for (const row of occupied) {
    if (load.has(row.staffId)) load.set(row.staffId, (load.get(row.staffId) ?? 0) + 1);
  }

  const ordered = [...slots].sort((left, right) => {
    if (left.date !== right.date) return left.date < right.date ? -1 : 1;
    if (left.start !== right.start) return left.start < right.start ? -1 : 1;
    return left.id - right.id;
  });

  const planned: PlannedDuty[] = [];

  function clashes(staffId: number, slot: ExamSlot): boolean {
    for (const row of occupied) {
      if (row.staffId !== staffId) continue;
      if (row.sessionId === slot.id) return true;
      const other = byId.get(row.sessionId);
      if (other && clocksOverlap(slot, other)) return true;
    }
    return false;
  }

  for (const slot of ordered) {
    const seated = occupied.filter((row) => row.sessionId === slot.id);
    let open = Math.max(0, slot.needed - seated.length);
    let leadTaken = seated.some((row) => row.duty === "lead");

    const take = (allowBlocked: boolean) => {
      const candidates = [...staffIds].sort((left, right) => {
        const gap = (load.get(left) ?? 0) - (load.get(right) ?? 0);
        return gap !== 0 ? gap : left - right;
      });
      for (const staffId of candidates) {
        if (open === 0) break;
        if (clashes(staffId, slot)) continue;
        const heldBack = blocked.some((row) => row.sessionId === slot.id && row.staffId === staffId);
        if (heldBack && !allowBlocked) continue;
        const duty: PlannedDuty["duty"] = leadTaken ? "assistant" : "lead";
        const row: TakenDuty = { sessionId: slot.id, staffId, duty };
        occupied.push(row);
        planned.push(row);
        load.set(staffId, (load.get(staffId) ?? 0) + 1);
        leadTaken = true;
        open -= 1;
      }
    };

    take(false);
    take(true);
  }

  const gaps = ordered
    .map((slot) => {
      const seated = occupied.filter((row) => row.sessionId === slot.id).length;
      return { sessionId: slot.id, missing: Math.max(0, slot.needed - seated) };
    })
    .filter((gap) => gap.missing > 0);

  return { planned, gaps };
}
