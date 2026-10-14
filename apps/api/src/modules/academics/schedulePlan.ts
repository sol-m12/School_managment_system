/** Timetable search. Hard rules match the legacy generator. */

export const WEEKDAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"] as const;
export type Weekday = (typeof WEEKDAYS)[number];
export const MAX_TEACHER_DAILY = 5;

export type ScheduleTask = {
  assignmentId: number;
  classId: number;
  subjectId: number;
  staffId: number;
  credits: number;
  maxPerDay: number;
  teacherName: string;
  classLabel: string;
};

export type PlannedLesson = {
  assignmentId: number;
  classId: number;
  subjectId: number;
  staffId: number;
  day: Weekday;
  period: number;
};

export type ScheduleFailure = {
  code:
    | "SCHEDULE_NO_CLASS"
    | "SCHEDULE_OVER_CAPACITY"
    | "SCHEDULE_TEACHER_WEEK"
    | "SCHEDULE_TEACHER_DAILY"
    | "SCHEDULE_SUBJECT_DAYS"
    | "SCHEDULE_PACKING"
    | "SCHEDULE_UNSOLVED";
  teachers: { name: string; demand: number; cap: number }[];
  sessions: { label: string; demand: number; cap: number }[];
};

export type PeriodClock = { period: number; start: string; end: string };

type Unit = ScheduleTask & { unitId: number };

function parseClock(value: string): number {
  const [hour, minute] = value.split(":");
  return Number(hour) * 60 + Number(minute);
}

function formatClock(minutes: number): string {
  const hour = Math.floor(minutes / 60) % 24;
  const minute = minutes % 60;
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}:00`;
}

/** Rebuild period clocks. A 15-minute break is inserted after the middle period. */
export function buildPeriodClocks(count: number, start: string, durationMinutes: number): PeriodClock[] {
  let cursor = parseClock(start);
  const breakAfter = Math.ceil(count / 2);
  const rows: PeriodClock[] = [];
  for (let period = 1; period <= count; period += 1) {
    if (period === breakAfter + 1) cursor += 15;
    const end = cursor + durationMinutes;
    rows.push({ period, start: formatClock(cursor), end: formatClock(end) });
    cursor = end;
  }
  return rows;
}

function weeklyCap(periodCount: number): number {
  return 5 * periodCount;
}

export function checkSchedule(tasks: ScheduleTask[], periodCount: number): ScheduleFailure | null {
  if (tasks.length === 0) return { code: "SCHEDULE_NO_CLASS", teachers: [], sessions: [] };
  const week = weeklyCap(periodCount);
  const byClass = new Map<number, ScheduleTask[]>();
  const byTeacher = new Map<number, { name: string; demand: number }>();
  for (const task of tasks) {
    const list = byClass.get(task.classId) ?? [];
    list.push(task);
    byClass.set(task.classId, list);
    const teacher = byTeacher.get(task.staffId) ?? { name: task.teacherName, demand: 0 };
    teacher.demand += task.credits;
    byTeacher.set(task.staffId, teacher);
    if (task.credits > 5 * task.maxPerDay) {
      return { code: "SCHEDULE_SUBJECT_DAYS", teachers: [], sessions: [] };
    }
  }
  for (const list of byClass.values()) {
    const demand = list.reduce((sum, task) => sum + task.credits, 0);
    if (demand > week) {
      return {
        code: "SCHEDULE_OVER_CAPACITY",
        teachers: [],
        sessions: [{ label: list[0]?.classLabel ?? "", demand, cap: week }],
      };
    }
    for (let days = 1; days <= 5; days += 1) {
      const mustFit = Math.max(0, demand - (5 - days) * periodCount);
      const capacity = list.reduce((sum, task) => sum + Math.min(task.credits, days * task.maxPerDay), 0);
      if (capacity < mustFit) {
        return {
          code: "SCHEDULE_PACKING",
          teachers: [],
          sessions: [{ label: list[0]?.classLabel ?? "", demand: mustFit, cap: capacity }],
        };
      }
    }
  }
  const teacherCap = Math.min(week, MAX_TEACHER_DAILY * 5);
  for (const teacher of byTeacher.values()) {
    if (teacher.demand > week) {
      return { code: "SCHEDULE_TEACHER_WEEK", teachers: [{ name: teacher.name, demand: teacher.demand, cap: week }], sessions: [] };
    }
    if (teacher.demand > teacherCap) {
      return {
        code: "SCHEDULE_TEACHER_DAILY",
        teachers: [{ name: teacher.name, demand: teacher.demand, cap: teacherCap }],
        sessions: [],
      };
    }
  }
  return null;
}

function slotScore(
  dayLoadTeacher: number,
  dayLoadClass: number,
  subjectDay: number,
  teacherHasDay: boolean,
  classHasDay: boolean,
): number {
  let score = 0;
  score += teacherHasDay ? 5000 : -4500;
  if (dayLoadTeacher < 3) score += 900;
  else if (dayLoadTeacher < 5) score += 400;
  else score -= 700 * dayLoadTeacher;
  score += classHasDay ? -900 : 300;
  score -= 120 * dayLoadClass * dayLoadClass;
  score += subjectDay === 0 ? 800 : -2200;
  return score;
}

type SearchState = {
  classBusy: Set<string>;
  teacherBusy: Set<string>;
  subjectDay: Map<string, number>;
  teacherDay: Map<string, number>;
  classDay: Map<string, number>;
};

function key(day: string, period: number, id: number): string {
  return `${day}|${period}|${id}`;
}

function dayKey(day: string, id: number): string {
  return `${day}|${id}`;
}

/**
 * First complete plan wins. The search stops at the time budget or the node budget.
 */
export function solveSchedule(tasks: ScheduleTask[], periodCount: number, budgetMs = 8000): PlannedLesson[] | ScheduleFailure {
  const failure = checkSchedule(tasks, periodCount);
  if (failure) return failure;

  const units: Unit[] = [];
  let unitId = 0;
  for (const task of tasks) {
    for (let credit = 0; credit < task.credits; credit += 1) {
      units.push({ ...task, unitId });
      unitId += 1;
    }
  }
  const classDemand = new Map<number, number>();
  const teacherDemand = new Map<number, number>();
  for (const task of tasks) {
    classDemand.set(task.classId, (classDemand.get(task.classId) ?? 0) + task.credits);
    teacherDemand.set(task.staffId, (teacherDemand.get(task.staffId) ?? 0) + task.credits);
  }
  units.sort((left, right) => {
    const leftScore = (teacherDemand.get(left.staffId) ?? 0) * 1000 + (classDemand.get(left.classId) ?? 0) * 100 + left.credits * 10;
    const rightScore = (teacherDemand.get(right.staffId) ?? 0) * 1000 + (classDemand.get(right.classId) ?? 0) * 100 + right.credits * 10;
    if (leftScore !== rightScore) return rightScore - leftScore;
    if (left.classId !== right.classId) return left.classId - right.classId;
    if (left.staffId !== right.staffId) return left.staffId - right.staffId;
    return left.unitId - right.unitId;
  });

  const slots: { day: Weekday; period: number }[] = [];
  for (const day of WEEKDAYS) {
    for (let period = 1; period <= periodCount; period += 1) slots.push({ day, period });
  }

  const deadline = Date.now() + budgetMs;
  const state: SearchState = {
    classBusy: new Set(),
    teacherBusy: new Set(),
    subjectDay: new Map(),
    teacherDay: new Map(),
    classDay: new Map(),
  };
  const placed = new Map<number, { day: Weekday; period: number }>();
  let nodes = 0;
  const nodeCap = 200000;

  function legalSlots(unit: Unit): { day: Weekday; period: number; score: number }[] {
    const found: { day: Weekday; period: number; score: number }[] = [];
    for (const slot of slots) {
      if (state.classBusy.has(key(slot.day, slot.period, unit.classId))) continue;
      if (state.teacherBusy.has(key(slot.day, slot.period, unit.staffId))) continue;
      const teacherLoad = state.teacherDay.get(dayKey(slot.day, unit.staffId)) ?? 0;
      if (teacherLoad >= MAX_TEACHER_DAILY) continue;
      const subjectLoad = state.subjectDay.get(`${slot.day}|${unit.classId}|${unit.subjectId}`) ?? 0;
      if (subjectLoad >= unit.maxPerDay) continue;
      const classLoad = state.classDay.get(dayKey(slot.day, unit.classId)) ?? 0;
      found.push({
        ...slot,
        score: slotScore(teacherLoad, classLoad, subjectLoad, teacherLoad > 0, classLoad > 0),
      });
    }
    found.sort((left, right) => right.score - left.score || left.day.localeCompare(right.day) || left.period - right.period);
    return found;
  }

  function occupy(unit: Unit, day: Weekday, period: number, add: number): void {
    const classSlot = key(day, period, unit.classId);
    const teacherSlot = key(day, period, unit.staffId);
    const subject = `${day}|${unit.classId}|${unit.subjectId}`;
    const teacher = dayKey(day, unit.staffId);
    const room = dayKey(day, unit.classId);
    if (add > 0) {
      state.classBusy.add(classSlot);
      state.teacherBusy.add(teacherSlot);
    } else {
      state.classBusy.delete(classSlot);
      state.teacherBusy.delete(teacherSlot);
    }
    state.subjectDay.set(subject, (state.subjectDay.get(subject) ?? 0) + add);
    state.teacherDay.set(teacher, (state.teacherDay.get(teacher) ?? 0) + add);
    state.classDay.set(room, (state.classDay.get(room) ?? 0) + add);
  }

  function search(remaining: Set<number>): boolean {
    if (remaining.size === 0) return true;
    if (Date.now() > deadline || nodes > nodeCap) return false;
    nodes += 1;
    const window: number[] = [];
    for (const id of remaining) {
      window.push(id);
      if (window.length >= 72) break;
    }
    let chosen = window[0];
    let chosenSlots = chosen == null ? [] : legalSlots(units[chosen] as Unit);
    for (const id of window) {
      const options = legalSlots(units[id] as Unit);
      if (options.length === 0) return false;
      if (chosen == null || options.length < chosenSlots.length) {
        chosen = id;
        chosenSlots = options;
        if (options.length === 1) break;
      }
    }
    if (chosen == null) return false;
    const unit = units[chosen];
    if (!unit) return false;
    remaining.delete(chosen);
    for (const slot of chosenSlots) {
      occupy(unit, slot.day, slot.period, 1);
      placed.set(chosen, { day: slot.day, period: slot.period });
      if (search(remaining)) return true;
      placed.delete(chosen);
      occupy(unit, slot.day, slot.period, -1);
      if (Date.now() > deadline) break;
    }
    remaining.add(chosen);
    return false;
  }

  const pending = new Set(units.map((_, index) => index));
  if (!search(pending)) {
    const teachers = [...teacherDemand.entries()]
      .map(([id, demand]) => ({ name: tasks.find((task) => task.staffId === id)?.teacherName ?? String(id), demand, cap: Math.min(weeklyCap(periodCount), 25) }))
      .sort((left, right) => right.demand / right.cap - left.demand / left.cap)
      .slice(0, 5);
    const sessions = [...classDemand.entries()]
      .map(([id, demand]) => ({ label: tasks.find((task) => task.classId === id)?.classLabel ?? String(id), demand, cap: weeklyCap(periodCount) }))
      .sort((left, right) => right.demand / right.cap - left.demand / left.cap)
      .slice(0, 5);
    return { code: "SCHEDULE_UNSOLVED", teachers, sessions };
  }

  return units.map((unit, index) => {
    const slot = placed.get(index);
    if (!slot) throw new Error("missing slot");
    return {
      assignmentId: unit.assignmentId,
      classId: unit.classId,
      subjectId: unit.subjectId,
      staffId: unit.staffId,
      day: slot.day,
      period: slot.period,
    };
  });
}

export type HeatBand = "green" | "yellow" | "red";

export function heatBand(dayCounts: number[]): HeatBand {
  const total = dayCounts.reduce((sum, count) => sum + count, 0);
  const maxDay = dayCounts.reduce((max, count) => Math.max(max, count), 0);
  const ratio = total / (MAX_TEACHER_DAILY * 5);
  if (maxDay >= 5 || ratio >= 1) return "red";
  if (maxDay >= 4 || ratio >= 0.75) return "yellow";
  return "green";
}

export type MoveReason = "TEACHER_BUSY" | "TEACHER_DAILY" | "SUBJECT_DAY";

export type MoveOption = {
  day: Weekday;
  period: number;
  targetId: number | null;
  ok: boolean;
  reasons: MoveReason[];
};

type LessonRow = {
  id: number;
  classId: number;
  subjectId: number;
  staffId: number;
  day: Weekday;
  period: number;
  creditHours: number;
  teacherName: string;
  subjectName: string;
};

/** Same class only. A move into an empty cell, or a swap with the lesson already there. */
export function evalMoves(sourceId: number, lessons: LessonRow[], periodCount: number): MoveOption[] {
  const source = lessons.find((lesson) => lesson.id === sourceId);
  if (!source) return [];
  const options: MoveOption[] = [];
  for (const day of WEEKDAYS) {
    for (let period = 1; period <= periodCount; period += 1) {
      if (day === source.day && period === source.period) continue;
      const target = lessons.find((lesson) => lesson.classId === source.classId && lesson.day === day && lesson.period === period) ?? null;
      const reasons: MoveReason[] = [];
      const ignore = new Set([source.id, target?.id].filter((id): id is number => id != null));
      const teacherClash = lessons.some(
        (lesson) => !ignore.has(lesson.id) && lesson.staffId === source.staffId && lesson.day === day && lesson.period === period,
      );
      if (teacherClash) reasons.push("TEACHER_BUSY");
      const teacherDay = lessons.filter((lesson) => !ignore.has(lesson.id) && lesson.staffId === source.staffId && lesson.day === day).length + 1;
      if (teacherDay > MAX_TEACHER_DAILY) reasons.push("TEACHER_DAILY");
      const maxPerDay = source.creditHours > 5 ? 2 : 1;
      const subjectDay =
        lessons.filter(
          (lesson) =>
            !ignore.has(lesson.id) && lesson.classId === source.classId && lesson.subjectId === source.subjectId && lesson.day === day,
        ).length + 1;
      if (subjectDay > maxPerDay) reasons.push("SUBJECT_DAY");
      if (target) {
        const partnerClash = lessons.some(
          (lesson) =>
            !ignore.has(lesson.id) && lesson.staffId === target.staffId && lesson.day === source.day && lesson.period === source.period,
        );
        if (partnerClash) reasons.push("TEACHER_BUSY");
        const partnerDay =
          lessons.filter((lesson) => !ignore.has(lesson.id) && lesson.staffId === target.staffId && lesson.day === source.day).length + 1;
        if (partnerDay > MAX_TEACHER_DAILY) reasons.push("TEACHER_DAILY");
        const partnerMax = target.creditHours > 5 ? 2 : 1;
        const partnerSubject =
          lessons.filter(
            (lesson) =>
              !ignore.has(lesson.id) &&
              lesson.classId === target.classId &&
              lesson.subjectId === target.subjectId &&
              lesson.day === source.day,
          ).length + 1;
        if (partnerSubject > partnerMax) reasons.push("SUBJECT_DAY");
      }
      options.push({ day, period, targetId: target?.id ?? null, ok: reasons.length === 0, reasons });
    }
  }
  return options;
}
