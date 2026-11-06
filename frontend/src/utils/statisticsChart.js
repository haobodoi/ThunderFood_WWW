const DAY = 86400000;
const integer = new Intl.NumberFormat('vi-VN');
const date = new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'UTC' });

export function parseDay(value) {
  const text = String(value ?? '').slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) return null;
  const ms = Date.parse(`${text}T00:00:00Z`);
  return Number.isFinite(ms) && new Date(ms).toISOString().slice(0, 10) === text ? ms : null;
}
const iso = ms => new Date(ms).toISOString().slice(0, 10);
function startOf(ms, group) {
  const d = new Date(ms);
  if (group === 'week') return ms - ((d.getUTCDay() + 6) % 7) * DAY;
  if (group === 'month') return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1);
  if (group === 'year') return Date.UTC(d.getUTCFullYear(), 0, 1);
  return ms;
}
function nextPeriod(ms, group) {
  const d = new Date(ms);
  if (group === 'month') return Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1);
  if (group === 'year') return Date.UTC(d.getUTCFullYear() + 1, 0, 1);
  return ms + (group === 'week' ? 7 : 1) * DAY;
}

/** Currency is summed in hundredths of VND; counts in integers. Never coerce missing values to zero. */
export function toChartUnits(value, money) {
  if (value === null || value === undefined || value === '' || typeof value === 'boolean') return null;
  if (!['string', 'number', 'bigint'].includes(typeof value)) return null;
  const text = typeof value === 'number' && Number.isFinite(value)
    ? value.toLocaleString('en-US', { useGrouping: false, maximumFractionDigits: 20 }) : String(value);
  const match = /^(\d+)(?:\.(\d{1,2}))?$/.exec(text);
  if (!match || (!money && match[2] && Number(match[2]) !== 0)) return null;
  return money ? BigInt(match[1]) * 100n + BigInt((match[2] || '').padEnd(2, '0')) : BigInt(match[1]);
}
export function formatChartValue(units, money) {
  if (units === null) return 'Thiếu dữ liệu';
  if (!money) return `${integer.format(units)} đơn`;
  const fraction = units % 100n;
  return `${integer.format(units / 100n)}${fraction ? ',' + fraction.toString().padStart(2, '0') : ''} ₫`;
}
export function formatAxisValue(units, money) {
  if (!money) return integer.format(units);
  const choices = [[100000000000000n, ' nghìn tỷ'], [100000000000n, ' tỷ'], [100000000n, ' tr'], [100000n, ' nghìn']];
  const [divisor, suffix] = choices.find(([scale]) => units >= scale) || [100n, ''];
  const whole = units / divisor, decimal = units % divisor * 10n / divisor;
  return `${integer.format(whole)}${decimal ? ',' + decimal : ''}${suffix}`;
}
export function fullPeriod(point) {
  const from = date.format(new Date(point.start)), to = date.format(new Date(point.end));
  return point.start === point.end ? from : `${from} – ${to}`;
}
export function shortPeriod(ms, group) {
  const d = new Date(ms);
  return group === 'year' ? String(d.getUTCFullYear()) : `${String(d.getUTCDate()).padStart(2, '0')}/${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}
export const GROUP_LABEL = { day: 'ngày', week: 'tuần', month: 'tháng', year: 'năm' };

export function buildChartModel(series, metric, money, { from, to, group = 'day', capacity = 50 }) {
  const first = parseDay(from), last = parseDay(to);
  if (first === null || last === null || first > last || !Array.isArray(series) || !series.length) return { points: [], total: null, factor: 1, missing: 0 };
  const rows = new Map();
  for (const row of series) {
    const ms = parseDay(row?.period);
    if (ms !== null) rows.set(ms, rows.has(ms) ? null : toChartUnits(row[metric], money));
  }
  const base = [];
  for (let ms = startOf(first, group); ms <= last; ms = nextPeriod(ms, group)) {
    base.push({ period: iso(ms), start: Math.max(first, ms), end: Math.min(last, nextPeriod(ms, group) - DAY), units: rows.get(ms) ?? null });
  }
  const candidates = group === 'day' ? [1, 7, 14, 28, 56, 112, 224, 448]
    : group === 'week' ? [1, 2, 4, 8, 13, 26, 52] : [1, 3, 6, 12];
  const limit = Math.max(1, capacity);
  const factor = base.length <= 31 ? 1 : candidates.find(n => Math.ceil(base.length / n) <= limit) || Math.ceil(base.length / limit);
  const points = [];
  for (let i = 0; i < base.length; i += factor) {
    const batch = base.slice(i, i + factor), missing = batch.filter(p => p.units === null).length;
    const knownTotal = batch.reduce((sum, p) => sum + (p.units ?? 0n), 0n);
    points.push({ period: batch[0].period, start: batch[0].start, end: batch.at(-1).end, units: missing ? null : knownTotal, knownTotal, missing, periods: batch.length });
  }
  const missing = base.filter(p => p.units === null).length;
  return { points, total: missing ? null : base.reduce((sum, p) => sum + p.units, 0n), factor, missing };
}
export function buildYAxis(points, money) {
  const max = points.reduce((value, p) => p.units !== null && p.units > value ? p.units : value, 0n);
  const raw = (max + 3n) / 4n;
  let power = 1n;
  while (power * 10n < raw) power *= 10n;
  const step = [1n, 2n, 5n, 10n].map(n => n * power).find(n => n >= raw) || power * 10n;
  const interval = step < (money ? 100n : 1n) ? (money ? 100n : 1n) : step;
  const top = max ? ((max + interval - 1n) / interval) * interval : interval * 4n;
  const ticks = [];
  for (let n = 0n; n <= top; n += interval) ticks.push(n);
  return { top, ticks };
}
/** BigInt ratio avoids overflow or loss of small fractions for unusually large totals. */
export const chartRatio = (value, top) => Number(value * 1000000n / top) / 1000000;
export function tickIndices(count, width) {
  if (!count) return [];
  const labels = Math.min(count, Math.max(2, Math.min(7, Math.floor(width / 78))));
  return [...new Set(Array.from({ length: labels }, (_, i) => Math.round(i * (count - 1) / Math.max(1, labels - 1))))];
}
export function tooltipPosition(anchor, size, viewport) {
  const gap = 12, margin = 10;
  return {
    left: Math.max(margin, Math.min(anchor.x - size.width / 2, viewport.width - size.width - margin)),
    top: Math.max(margin, Math.min(anchor.y - size.height - gap >= margin ? anchor.y - size.height - gap : anchor.y + gap, viewport.height - size.height - margin)),
  };
}
