import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { buildChartModel, buildYAxis, chartRatio, formatAxisValue, formatChartValue, fullPeriod, GROUP_LABEL, shortPeriod, tickIndices, tooltipPosition } from '../utils/statisticsChart.js';

function Tooltip({ point, money, anchor, id }) {
  const ref = useRef(null), [position, setPosition] = useState(null);
  useLayoutEffect(() => {
    const box = ref.current.getBoundingClientRect();
    setPosition(tooltipPosition(anchor, box, { width: window.innerWidth, height: window.innerHeight }));
  }, [anchor, point]);
  return createPortal(<div id={id} ref={ref} role="tooltip" className="statistics-tooltip" style={{ left: position?.left ?? 10, top: position?.top ?? 10, visibility: position ? 'visible' : 'hidden' }}>
    <strong>{fullPeriod(point)}</strong>
    <span>{money ? 'Doanh thu gộp' : 'Số đơn'}: <b>{formatChartValue(point.units, money)}</b></span>
    {point.missing > 0 && <small>Thiếu {point.missing}/{point.periods} kỳ; chưa thể tính tổng cột này.</small>}
  </div>, document.body);
}

/** Upper corners only; the column stays flush with the zero baseline. */
function barPath(x, y, width, height) {
  const r = Math.min(3, width / 2, height);
  return `M${x},${y + height}V${y + r}Q${x},${y} ${x + r},${y}H${x + width - r}Q${x + width},${y} ${x + width},${y + r}V${y + height}Z`;
}

function StatisticsChart({ series, metric, title, money, from, to, group, loading, error, onRetry }) {
  const plotRef = useRef(null), tooltipId = useId(), titleId = useId(), hintId = useId();
  const [width, setWidth] = useState(480), [active, setActive] = useState(null);
  const moneyLabel = money ? 'VND' : 'đơn';
  const initialLeft = 68, right = 15;
  const model = useMemo(() => buildChartModel(series, metric, money, { from, to, group, capacity: Math.max(1, Math.floor((width - initialLeft - right) / 10)) }), [series, metric, money, from, to, group, width]);
  const axis = useMemo(() => buildYAxis(model.points, money), [model.points, money]);
  const left = Math.min(108, Math.max(48, ...axis.ticks.map(t => formatAxisValue(t, money).length * 6.5 + 12)));
  const top = 16, bottom = 248, svgHeight = 286, plotWidth = Math.max(1, width - left - right);
  const slot = plotWidth / Math.max(1, model.points.length), barWidth = Math.min(22, slot * .48);
  const xTicks = new Set(tickIndices(model.points.length, plotWidth));
  const yOf = units => bottom - chartRatio(units, axis.top) * (bottom - top);
  const selected = active === null ? null : model.points[active.index];
  useLayoutEffect(() => {
    const element = plotRef.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => setWidth(Math.max(1, entry.contentRect.width)));
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  useEffect(() => setActive(null), [series, from, to, group, width, loading, error]);
  useEffect(() => {
    if (!active) return;
    const dismiss = event => {
      if (event.type === 'keydown' && event.key !== 'Escape') return;
      if (event.type === 'pointerdown' && plotRef.current?.contains(event.target)) return;
      setActive(null);
    };
    window.addEventListener('scroll', dismiss, true);
    window.addEventListener('resize', dismiss);
    document.addEventListener('pointerdown', dismiss);
    document.addEventListener('keydown', dismiss);
    return () => {
      window.removeEventListener('scroll', dismiss, true); window.removeEventListener('resize', dismiss);
      document.removeEventListener('pointerdown', dismiss); document.removeEventListener('keydown', dismiss);
    };
  }, [active]);
  const show = (index, target, clientX) => {
    const box = target.getBoundingClientRect();
    setActive({ index, anchor: { x: clientX ?? box.left + box.width / 2, y: box.top + box.height / 2 } });
  };
  const moveSelection = event => {
    if (!model.points.length || !['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    const current = active?.index ?? -1;
    const index = event.key === 'Home' ? 0 : event.key === 'End' ? model.points.length - 1 : Math.max(0, Math.min(model.points.length - 1, current + (event.key === 'ArrowLeft' ? -1 : 1)));
    const rect = plotRef.current.getBoundingClientRect();
    setActive({ index, anchor: { x: rect.left + left + (index + .5) * slot, y: rect.top + bottom / 2 } });
  };
  return <section className="admin-panel statistics-card" aria-labelledby={titleId} aria-busy={loading}>
    <header className="statistics-card__header"><h2 id={titleId}>{title}</h2><p>{from && to ? `${shortPeriod(Date.parse(from), 'day')}/${from.slice(0, 4)} – ${shortPeriod(Date.parse(to), 'day')}/${to.slice(0, 4)}` : 'Chưa chọn khoảng thời gian'}</p>
      {!loading && !error && model.total !== null && <strong className="statistics-card__total"><span>Tổng trong kỳ</span>{formatChartValue(model.total, money)}</strong>}
    </header>
    <div className="statistics-card__plot" ref={plotRef}>
      {loading ? <div className="statistics-card__state" role="status">Đang tải biểu đồ…</div>
        : error ? <div className="statistics-card__state" role="alert"><strong>Không tải được biểu đồ</strong><span>{error}</span><button type="button" className="btn btn--outline btn--sm" onClick={onRetry}>Thử lại</button></div>
          : !model.points.length ? <div className="statistics-card__state">Không có dữ liệu trong khoảng thời gian này.</div>
            : <><span className="statistics-card__unit">Đơn vị: {moneyLabel}</span><svg viewBox={`0 0 ${width} ${svgHeight}`} width={width} height={svgHeight} className={`statistics-chart statistics-chart--${metric}`} tabIndex="0" role="group" aria-label={title} aria-describedby={selected ? tooltipId : hintId} onKeyDown={moveSelection} onBlur={() => setActive(null)} onPointerLeave={event => { if (event.pointerType === 'mouse') setActive(null); }}>
              {axis.ticks.map(tick => <g key={String(tick)} className="statistics-chart__grid"><line x1={left} x2={width - right} y1={yOf(tick)} y2={yOf(tick)} /><text x={left - 10} y={yOf(tick)} dy=".35em" textAnchor="end">{formatAxisValue(tick, money)}</text></g>)}
              {model.points.map((p, index) => {
                const cx = left + (index + .5) * slot, isActive = active?.index === index;
                const y = p.units === null ? bottom - 14 : yOf(p.units), height = bottom - y;
                return <g key={p.period} className={isActive ? 'is-active' : undefined}>
                  {isActive && <rect className="statistics-chart__selection" x={left + index * slot} y={top} width={slot} height={bottom - top} rx="3" />}
                  {p.units === null ? <rect className="statistics-chart__missing" x={cx - 3} y={bottom - 14} width="6" height="14" rx="2" /> : p.units === 0n ? <circle className="statistics-chart__zero" cx={cx} cy={bottom} r="2.5" /> : <path className="statistics-chart__bar" d={barPath(cx - barWidth / 2, y, barWidth, height)} />}
                  <rect className="statistics-chart__hit" x={left + index * slot} y={top} width={slot} height={bottom - top + 8} onPointerEnter={event => { if (event.pointerType === 'mouse') show(index, event.currentTarget, event.clientX); }} onPointerMove={event => { if (event.pointerType === 'mouse') show(index, event.currentTarget, event.clientX); }} onPointerDown={event => { if (event.pointerType !== 'mouse') show(index, event.currentTarget, event.clientX); }}><desc>{fullPeriod(p)} · {money ? 'Doanh thu gộp' : 'Số đơn'}: {formatChartValue(p.units, money)}</desc></rect>
                  {xTicks.has(index) && <text className="statistics-chart__x-label" x={cx} y={bottom + 25} textAnchor={index === 0 ? 'start' : index === model.points.length - 1 ? 'end' : 'middle'}>{shortPeriod(p.start, group)}</text>}
                </g>;
              })}
            </svg></>}
    </div>
    <footer className="statistics-card__footer" id={hintId}>
      <span>{model.factor > 1 ? `Gộp tối đa ${model.factor} ${GROUP_LABEL[group] || 'kỳ'}/cột · cộng đầy đủ, không lấy mẫu.` : `Theo ${GROUP_LABEL[group] || 'ngày'}.`}</span>
      {!loading && !error && model.points.length > 0 && <><span>Rê chuột, chạm hoặc dùng phím ← → để xem số chính xác.</span><span className="statistics-card__legend"><i className="statistics-card__zero-key" />Giá trị 0<i className="statistics-card__missing-key" />Thiếu dữ liệu{model.missing ? ` (${model.missing} kỳ)` : ''}</span></>}
    </footer>
    {selected && <Tooltip id={tooltipId} point={selected} money={money} anchor={active.anchor} />}
  </section>;
}

export default function StatisticsCharts({ report, range, loading = false, error = '', onRetry }) {
  const common = { series: report?.series, from: report?.from ?? range?.from, to: report?.to ?? range?.to, group: report?.group ?? range?.group ?? 'day', loading, error, onRetry };
  return <div className="statistics-charts"><StatisticsChart {...common} metric="revenue" title="Doanh thu gộp theo kỳ" money /><StatisticsChart {...common} metric="orders" title="Số đơn theo kỳ" /></div>;
}
