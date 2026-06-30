export function getLocalDateString(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

export function parseLocalDate(dateStr: string): Date | null {
  const parts = dateStr.split("-").map((part) => parseInt(part, 10));
  if (parts.length !== 3 || parts.some((part) => Number.isNaN(part))) return null;

  return new Date(parts[0], parts[1] - 1, parts[2]);
}

export function addLocalDays(dateStr: string | undefined, days: number): string {
  const date = dateStr ? parseLocalDate(dateStr) : new Date();
  const next = date || new Date();
  next.setDate(next.getDate() + days);

  return getLocalDateString(next);
}

export function addLocalMonths(dateStr: string | undefined, months: number): string {
  const date = dateStr ? parseLocalDate(dateStr) : new Date();
  const next = date || new Date();
  next.setMonth(next.getMonth() + months);

  return getLocalDateString(next);
}
