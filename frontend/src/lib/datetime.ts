export const toIsoString = (value?: string | null): string => {
  if (value && !Number.isNaN(Date.parse(value))) return new Date(value).toISOString();
  return new Date().toISOString();
};

export const toEpochMs = (iso: string): number => {
  const t = Date.parse(iso);
  return Number.isNaN(t) ? Date.now() : t;
};

export const formatTimeKo = (iso: string): string =>
  new Intl.DateTimeFormat('ko-KR', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(new Date(iso));

export const formatDateTimeKo = (iso: string): string =>
  new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(new Date(iso));
