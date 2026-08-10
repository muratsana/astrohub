const shortDateFormatter = new Intl.DateTimeFormat('tr-TR', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
});

const longDateFormatter = new Intl.DateTimeFormat('tr-TR', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});

const timeFormatter = new Intl.DateTimeFormat('tr-TR', {
  hour: '2-digit',
  minute: '2-digit',
});

function date(value: string | undefined): Date | null {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function formatEventDate(value: string | undefined): string {
  const parsed = date(value);
  return parsed ? shortDateFormatter.format(parsed) : '—';
}

export function formatEventDateRange(
  startsAt: string,
  endsAt?: string
): string {
  const start = date(startsAt);
  const end = date(endsAt);
  if (!start) return '—';
  const startLabel = shortDateFormatter.format(start);
  if (!end) return startLabel;
  const endLabel = shortDateFormatter.format(end);
  return startLabel === endLabel ? startLabel : `${startLabel} → ${endLabel}`;
}

export function formatEventLongDateRange(
  startsAt: string,
  endsAt?: string
): string {
  const start = date(startsAt);
  const end = date(endsAt);
  if (!start) return '—';
  const startLabel = longDateFormatter.format(start);
  if (!end) return startLabel;
  const endLabel = longDateFormatter.format(end);
  return startLabel === endLabel ? startLabel : `${startLabel} → ${endLabel}`;
}

export function formatEventTime(value: string): string {
  const parsed = date(value);
  return parsed ? timeFormatter.format(parsed) : '—';
}
