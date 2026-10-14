import { useEffect, useMemo, useState } from "react";
import { useStudents, type StudentRow } from "@/features/admin/api/useAdmin";

export type StudentFilters = {
  year: string;
  search: string;
  grade: string;
  stream: string;
  section: string;
  unassigned: "0" | "1";
  registrationType: string;
};

const emptyFilters = (year: string): StudentFilters => ({
  year,
  search: "",
  grade: "",
  stream: "",
  section: "",
  unassigned: "0",
  registrationType: "",
});

export function hasSection(section: string | null): boolean {
  return section != null && section.trim() !== "";
}

function countGender(rows: StudentRow[], gender: "M" | "F"): number {
  return rows.filter((row) => row.gender === gender).length;
}

export function useStudentBoard() {
  const query = useStudents({});
  const rows = query.data?.rows ?? [];
  const settingYear = query.data?.academicYear ?? "";
  const [filters, setFilters] = useState<StudentFilters | null>(null);

  const years = useMemo(() => {
    const values = [...new Set(rows.map((row) => row.academicYear).filter(Boolean))];
    return values.sort((left, right) => right.localeCompare(left));
  }, [rows]);

  useEffect(() => {
    if (filters || query.data == null) return;
    const year = years.includes(settingYear) ? settingYear : (years[0] ?? "");
    setFilters(emptyFilters(year));
  }, [filters, query.data, settingYear, years]);

  const active = filters ?? emptyFilters(settingYear);

  const yearRows = useMemo(
    () => (active.year ? rows.filter((row) => row.academicYear === active.year) : rows),
    [rows, active.year],
  );

  const grades = useMemo(() => {
    const values = [...new Set(yearRows.map((row) => row.gradeLevel))];
    const legacy = [9, 10, 11, 12];
    return [...legacy, ...values.filter((grade) => !legacy.includes(grade)).sort((a, b) => a - b)];
  }, [yearRows]);

  const streams = useMemo(() => {
    const values = [...new Set(yearRows.map((row) => row.stream).filter((stream): stream is string => Boolean(stream && stream.trim())))];
    const ordered = ["Natural", "Social", ...values.filter((stream) => stream !== "Natural" && stream !== "Social")];
    return ordered;
  }, [yearRows]);

  const sections = useMemo(() => {
    const letters = [..."ABCDEFGHIJKL"];
    const extra = [...new Set(yearRows.map((row) => row.section).filter((section): section is string => hasSection(section)))];
    return [...letters, ...extra.filter((section) => !letters.includes(section)).sort()];
  }, [yearRows]);

  const registrationTypes = useMemo(() => {
    return [...new Set(yearRows.map((row) => row.registrationType).filter((value): value is string => Boolean(value)))];
  }, [yearRows]);

  const filtered = useMemo(() => {
    const needle = active.search.trim().toLowerCase();
    return yearRows.filter((row) => {
      if (active.grade && String(row.gradeLevel) !== active.grade) return false;
      if (active.stream && (row.stream ?? "") !== active.stream) return false;
      if (active.section && (row.section ?? "") !== active.section) return false;
      if (active.registrationType && (row.registrationType ?? "") !== active.registrationType) return false;
      if (active.unassigned === "1" && hasSection(row.section)) return false;
      if (!needle) return true;
      return row.fullName.toLowerCase().includes(needle) || String(row.id).includes(needle);
    });
  }, [yearRows, active]);

  const gradeStats = useMemo(() => {
    return [9, 10, 11, 12].map((grade) => {
      const group = yearRows.filter((row) => row.gradeLevel === grade);
      return { grade, total: group.length, male: countGender(group, "M"), female: countGender(group, "F") };
    });
  }, [yearRows]);

  const unassigned = yearRows.filter((row) => !hasSection(row.section));

  return {
    query,
    filters: active,
    setFilters,
    ready: filters != null,
    years,
    grades,
    streams,
    sections,
    registrationTypes,
    yearRows,
    filtered,
    stats: {
      total: yearRows.length,
      male: countGender(yearRows, "M"),
      female: countGender(yearRows, "F"),
      grades: gradeStats,
      unassigned: { total: unassigned.length, male: countGender(unassigned, "M"), female: countGender(unassigned, "F") },
    },
    clear: () => setFilters(emptyFilters(active.year)),
  };
}
