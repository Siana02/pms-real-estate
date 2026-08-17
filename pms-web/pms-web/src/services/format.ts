
/* ------------------------------------------------------------------ */
/*  Shared parsing + formatting helpers for the manager portal          */
/* ------------------------------------------------------------------ */
 
export type Json = Record<string, unknown>;
 
export function toRecord(value: unknown): Json {
  return value && typeof value === "object" ? (value as Json) : {};
}
 
export function asString(value: unknown): string {
  return typeof value === "string" ? value : "";
}
 
export function asNumber(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return 0;
}
 
export function asBoolean(value: unknown): boolean {
  return value === true || value === 1 || value === "1";
}
 
export function rows(payload: unknown): Json[] {
  const data = toRecord(payload).data;
  return Array.isArray(data) ? data.map(toRecord) : [];
}
 
export function namedRef(
  value: unknown,
  key: string
): { id: number; name: string } | null {
  const record = toRecord(value);
  const name = asString(record[key]);
  if (!name) return null;
  return { id: asNumber(record.id), name };
}
 
/* ---------- organization currency ---------- */
 
export function readCurrency(): string {
  try {
    const raw =
      localStorage.getItem("organization") ??
      sessionStorage.getItem("organization");
    const parsed = toRecord(raw ? JSON.parse(raw) : null);
    const value = asString(parsed.currency);
    if (value.length === 3) return value.toUpperCase();
  } catch {
    /* stored value is not valid JSON */
  }
 
  return "KES";
}
 
export function formatMoney(value: number, currency: string): string {
  return new Intl.NumberFormat("en-KE", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(value);
}
 
export function formatCompactMoney(value: number, currency: string): string {
  return new Intl.NumberFormat("en-KE", {
    style: "currency",
    currency,
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}
 
export function formatNumber(value: number): string {
  return new Intl.NumberFormat("en-KE").format(value);
}
 
/* ---------- dates ---------- */
 
export function formatDate(value: string | null): string {
  if (!value) return "—";
 
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
 
  return date.toLocaleDateString("en-KE", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}
 
export function daysBetween(value: string | null): number | null {
  if (!value) return null;
 
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
 
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  date.setHours(0, 0, 0, 0);
 
  return Math.round((date.getTime() - start.getTime()) / 86_400_000);
}
 
export function relativeDays(value: string | null): string {
  const days = daysBetween(value);
  if (days === null) return "—";
  if (days === 0) return "today";
  if (days > 0) return `in ${days} day${days === 1 ? "" : "s"}`;
  const past = Math.abs(days);
  return `${past} day${past === 1 ? "" : "s"} ago`;
}
 
/* ---------- text ---------- */
 
export function titleCase(value: string): string {
  return value
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}
 
export function initials(value: string): string {
  const parts = value.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "—";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}


