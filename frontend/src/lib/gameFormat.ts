// game_date arrives as an RFC3339 timestamp ("2026-09-02T00:00:00Z") because
// the column is a DATE marshalled through time.Time. Render the day, not the
// wire format — and parse the date parts directly so a UTC midnight does not
// slide to the previous day in a negative-offset timezone.
export function formatGameDate(raw: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(raw)
  if (!m) return raw
  const [, y, mo, d] = m
  const date = new Date(Number(y), Number(mo) - 1, Number(d))
  if (isNaN(date.getTime())) return raw
  return date.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })
}
