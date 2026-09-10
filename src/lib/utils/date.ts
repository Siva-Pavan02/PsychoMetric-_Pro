const formatter = new Intl.DateTimeFormat('en-US', {
  timeZone: 'Asia/Kolkata',
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hour12: true
});

export function formatDateTime(date: Date | string | number | null | undefined): string {
  if (!date) return "-";
  const parsed = new Date(date);
  if (isNaN(parsed.getTime())) return "Invalid Date";

  const parts = formatter.formatToParts(parsed);
  const getPart = (type: string) => parts.find(p => p.type === type)?.value || '';

  const day = getPart('day');
  const month = getPart('month');
  const year = getPart('year');
  const hour = getPart('hour');
  const minute = getPart('minute');
  const dayPeriod = getPart('dayPeriod').toUpperCase(); // AM/PM

  return `${day} ${month} ${year}, ${hour}:${minute} ${dayPeriod} IST`;
}

export function formatDate(date: Date | string | number | null | undefined): string {
  if (!date) return "-";
  const parsed = new Date(date);
  if (isNaN(parsed.getTime())) return "Invalid Date";

  const parts = formatter.formatToParts(parsed);
  const getPart = (type: string) => parts.find(p => p.type === type)?.value || '';

  const day = getPart('day');
  const month = getPart('month');
  const year = getPart('year');

  return `${day} ${month} ${year}`;
}
