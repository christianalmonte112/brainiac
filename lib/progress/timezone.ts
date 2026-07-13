/**
 * Returns `date`'s calendar day as YYYY-MM-DD *in `timezone`*, not UTC.
 *
 * The 'en-CA' locale is a deliberate trick: it's one of the few locales
 * Intl.DateTimeFormat formats as YYYY-MM-DD by default, so this avoids
 * manually reassembling year/month/day parts from formatToParts().
 *
 * Falls back to the UTC calendar day if `timezone` isn't a real IANA zone
 * (e.g. corrupted data, or a user whose browser never successfully synced
 * one) — same behavior as before this existed, just not the common case.
 */
export function localDateString(date: Date, timezone: string): string {
  try {
    return new Intl.DateTimeFormat("en-CA", { timeZone: timezone }).format(date);
  } catch {
    return date.toISOString().slice(0, 10);
  }
}
