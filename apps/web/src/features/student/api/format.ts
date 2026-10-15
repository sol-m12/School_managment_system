import { api } from "@/lib/api";

export function shortDate(value: string | null): string {
  if (!value) return "";
  const date = new Date(value.includes("T") ? value : `${value}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
}

export function points(value: number, digits = 2): string {
  return value.toLocaleString("en-US", { minimumFractionDigits: digits, maximumFractionDigits: digits });
}

export async function openStudentFile(path: string): Promise<void> {
  const response = await api.get<Blob>(path, { responseType: "blob" });
  const url = URL.createObjectURL(response.data);
  window.open(url, "_blank", "noopener");
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
