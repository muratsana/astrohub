const numberFormatter = new Intl.NumberFormat('tr-TR');

export function formatAdminCount(value: number | null | undefined): string {
  return typeof value === 'number' && Number.isFinite(value)
    ? numberFormatter.format(value)
    : '—';
}
