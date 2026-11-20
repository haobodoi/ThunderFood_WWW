import { useId, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  ArrowDownRight, ArrowRight, ArrowUpRight, CalendarDays, ChartNoAxesCombined, CheckCircle2,
  CircleDollarSign, CircleX, ClipboardList, Download, MessageSquareWarning, Receipt,
  RefreshCw, ShoppingBag, Store, UserRoundPlus, UtensilsCrossed, Wallet,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';
import { adminApi } from '../../api/adminApi.js';
import { partnerStatisticsApi } from '../../api/partnerStatisticsApi.js';
import StatisticsCharts from '../../components/StatisticsCharts.jsx';
import Alert from '../../components/Alert.jsx';
import { parseDay } from '../../utils/statisticsChart.js';
import { reportRangeError } from '../../utils/reportRange.js';
import { DataState, Field, Head, MetricHelp, RestaurantPicker, formatVND, useAdminData } from './AdminShared.jsx';
import { Breakdown, PeriodTable, ProductInsights, RecentOrders, ReportGuide, ReportHighlights, SectionHeading, Settlement } from './ReportSections.jsx';
import '../../styles/statistics-report.css';
export { Donut } from './ReportSections.jsx';

const number = new Intl.NumberFormat('vi-VN');
const changeNumber = new Intl.NumberFormat('vi-VN', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const date = new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'UTC' });
const dayInVietnam = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit',
});
const GROUPS = { day: 'Ngày', week: 'Tuần', month: 'Tháng', year: 'Năm' };

function recentRange(days, group = 'day') {
  const to = dayInVietnam.format(new Date());
  const from = new Date(parseDay(to) - (days - 1) * 86400000).toISOString().slice(0, 10);
  return { from, to, group };
}

function displayDate(value) {
  const day = parseDay(value);
  return day === null ? '—' : date.format(day);
}


export function Metric({ label, value, previous, money, icon: MetricIcon, description, points, featured, context }) {
  const current = Number(value);
  const old = Number(previous);
  const delta = previous == null ? null : points ? current - old : old ? (current - old) / old * 100 : null;
  const rounded = delta !== null ? Number(delta.toFixed(1)) : null;
  const change = rounded === 0 ? 0 : rounded;
  const direction = change > 0 ? 'up' : change < 0 ? 'down' : 'flat';
  return <article className={'admin-kpi' + (featured ? ' admin-kpi--featured' : '')}>
    <div className="enterprise-kpi-top">
      <span className="enterprise-kpi-icon"><MetricIcon size={20} aria-hidden="true" /></span>
      <MetricHelp label={label} description={description} />
    </div>
    <span>{label}</span>
    <strong>{money ? formatVND(value) : points ? number.format(current) + '%' : number.format(current)}</strong>
    {previous != null && <small className="admin-kpi__comparison" data-direction={direction} data-inverse={points || undefined}>
      {direction === 'up' && <ArrowUpRight size={16} aria-hidden="true" />}
      {direction === 'down' && <ArrowDownRight size={16} aria-hidden="true" />}
      {change === null
        ? 'Kỳ trước: ' + (money ? formatVND(previous) : number.format(old))
        : (change > 0 ? '+' : '') + changeNumber.format(change) + (points ? ' điểm %' : '%') + ' so với kỳ trước'}
    </small>}
    {context && <small className="report-kpi-context">{context}</small>}
  </article>;
}

function Attention({ attention, partner, admin }) {
  const orders = partner ? '/partner/orders' : '/admin/orders';
  const tasks = [
    { label: 'Đơn chờ xác nhận', count: attention.pending, icon: ClipboardList, to: orders + '?status=PENDING' },
    { label: 'Đơn cần hoàn tiền', count: attention.refunds, icon: Wallet, to: orders + (partner ? '?status=REJECTED' : '?status=REJECTED&payment=PAID') },
  ];
  if (admin) tasks.push(
    { label: 'Hồ sơ chờ duyệt', count: attention.restaurants, icon: Store, to: '/admin/restaurants' },
    { label: 'Báo cáo đánh giá', count: attention.reports, icon: MessageSquareWarning, to: '/admin/review-reports' },
  );
  return <section className="admin-panel dashboard-queue">
    <header><h2>Cần xử lý lúc này</h2><p className="muted">Số hiện tại · Không theo bộ lọc ngày</p></header>
    <ul>{tasks.map(({ label, count, icon: Icon, to }) => <li key={label}>
      <Link to={to}><span className="queue-icon"><Icon size={17} aria-hidden="true" /></span><span>{label}</span><strong>{number.format(count)}</strong><ArrowRight size={15} aria-hidden="true" /></Link>
    </li>)}</ul>
    {partner && <p className="muted">Liên kết mở danh sách đơn của tất cả quán theo trạng thái.</p>}
  </section>;
}

function ReportFilters({ draft, setDraft, apply, quickApply, error, pending }) {
  return <form className="admin-panel report-filters" onSubmit={apply}>
    <div className="report-filters__shortcuts">
      <div className="report-filters__label"><CalendarDays size={17} aria-hidden="true" /> Khoảng thời gian</div>
      <div className="dashboard-presets" role="group" aria-label="Chọn nhanh và áp dụng khoảng thời gian">
        {[7, 30, 90].map(days => {
          const range = recentRange(days, draft.group);
          return <button type="button" key={days} className="dashboard-preset"
            aria-pressed={range.from === draft.from && range.to === draft.to} onClick={() => quickApply(range)}>{days} ngày qua</button>;
        })}
      </div>
    </div>
    <div className="report-filters__fields">
      <Field label="Từ ngày"><input type="date" required min="1800-01-01" max={draft.to || '2200-12-31'} aria-describedby="report-range-hint" value={draft.from} onChange={event => setDraft({ ...draft, from: event.target.value })} /></Field>
      <Field label="Đến ngày"><input type="date" required min={draft.from || '1800-01-01'} max="2200-12-31" aria-describedby="report-range-hint" value={draft.to} onChange={event => setDraft({ ...draft, to: event.target.value })} /></Field>
      <Field label="Xem theo"><select value={draft.group} onChange={event => setDraft({ ...draft, group: event.target.value })}>
        {Object.entries(GROUPS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
      </select></Field>
      <button type="submit" className="btn btn--primary">Áp dụng</button>
    </div>
    <p className="report-filters__hint" id="report-range-hint">Chọn nhanh để xem ngay · Khoảng tùy chỉnh tối đa 1.096 ngày</p>
    {pending && <p className="report-filters__pending" role="status">Bộ lọc đã thay đổi. Bấm Áp dụng để cập nhật báo cáo và tệp CSV.</p>}
    {error && <div className="report-filters__error"><Alert type="error">{error}</Alert></div>}
  </form>;
}

const VIEWS = [
  { key: 'summary', label: 'Tổng quan', icon: ChartNoAxesCombined },
  { key: 'orders', label: 'Đơn hàng & thanh toán', icon: Receipt },
  { key: 'products', label: 'Hiệu quả thực đơn', icon: UtensilsCrossed },
];

function ReportNavigation({ view, onChange, id }) {
  function onKeyDown(event) {
    const current = VIEWS.findIndex(item => item.key === view);
    const next = event.key === 'ArrowRight' ? (current + 1) % VIEWS.length : event.key === 'ArrowLeft' ? (current + VIEWS.length - 1) % VIEWS.length : event.key === 'Home' ? 0 : event.key === 'End' ? VIEWS.length - 1 : null;
    if (next === null) return;
    event.preventDefault();
    onChange(VIEWS[next].key);
    event.currentTarget.querySelectorAll('[role="tab"]')[next].focus();
  }
  return <div className="report-navigation" role="tablist" aria-label="Nội dung báo cáo" onKeyDown={onKeyDown}>
    {VIEWS.map(({ key, label, icon: Icon }) => <button key={key} id={`${id}-${key}`} type="button" role="tab" aria-selected={view === key} aria-controls={`${id}-panel`} tabIndex={view === key ? 0 : -1} onClick={() => onChange(key)}><Icon size={19} aria-hidden="true" />{label}</button>)}
  </div>;
}

export default function AdminHomePage({ area = 'admin', analytics = false }) {
  const { user } = useAuth();
  const partner = area === 'partner', overview = !partner && !analytics;
  const client = partner ? partnerStatisticsApi : adminApi;
  const [search, setSearch] = useSearchParams();
  const view = VIEWS.some(item => item.key === search.get('view')) ? search.get('view') : 'summary';
  const navigationId = useId();
  const [restaurant, setRestaurant] = useState(null), [draftRestaurant, setDraftRestaurant] = useState(null);
  const [draft, setDraft] = useState(() => recentRange(30)), [filters, setFilters] = useState(draft);
  const [error, setError] = useState(''), [rangeError, setRangeError] = useState(''), [exporting, setExporting] = useState(false);
  const params = partner ? { ...filters, restaurantId: restaurant?.id } : filters;
  const resource = useAdminData('/dashboard', params, client);
  const report = resource.data;
  const pending = draft.from !== filters.from || draft.to !== filters.to || draft.group !== filters.group || (partner && draftRestaurant?.id !== restaurant?.id);

  function chooseView(value) {
    setSearch(previous => { const next = new URLSearchParams(previous); if (value === 'summary') next.delete('view'); else next.set('view', value); return next; }, { preventScrollReset: true });
    document.getElementById(`${navigationId}-${value}`)?.focus();
  }
  function applyRange(range) {
    const invalid = reportRangeError(range);
    setRangeError(invalid);
    if (invalid) return;
    setError(''); setRestaurant(draftRestaurant); setDraft(range); setFilters(range);
  }
  async function download() {
    setExporting(true); setError('');
    try {
      const blob = await client.export(params), url = URL.createObjectURL(blob), link = document.createElement('a');
      link.href = url; link.download = ['ThunderFood', filters.from, filters.to].join('-') + '.csv';
      document.body.appendChild(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch { setError('Không xuất được CSV. Vui lòng thử lại.'); } finally { setExporting(false); }
  }

  return <div className="admin-page report-page">
    <Head title={partner ? 'Thống kê kinh doanh' : overview ? 'Tổng quan kinh doanh' : 'Thống kê & báo cáo'} description={overview ? 'Kết quả kinh doanh và những việc cần xử lý, trong một góc nhìn.' : 'Theo dõi kết quả kinh doanh, dòng tiền và hiệu quả thực đơn.'}>
      <button type="button" className="btn btn--outline" onClick={resource.refresh} disabled={resource.loading}><RefreshCw size={17} aria-hidden="true" /> Làm mới</button>
      {overview && <Link className="btn btn--outline" to="/admin/analytics">Phân tích chi tiết <ArrowRight size={17} aria-hidden="true" /></Link>}
      <button type="button" className="btn btn--primary" disabled={exporting || !report || resource.loading} onClick={download}><Download size={17} aria-hidden="true" />{exporting ? 'Đang xuất…' : 'Xuất báo cáo CSV'}</button>
    </Head>
    {partner && <details className="report-scope-picker"><summary><Store size={18} aria-hidden="true" /><span>Phạm vi nhà hàng<strong>{draftRestaurant?.name || 'Tất cả quán của bạn'}</strong></span><small>Thay đổi</small></summary>
      <RestaurantPicker value={draftRestaurant} onChange={setDraftRestaurant} client={partnerStatisticsApi} path="/restaurants" allLabel="Tất cả quán của bạn" />
    </details>}
    <ReportFilters draft={draft} setDraft={value => { setDraft(value); setRangeError(''); }} apply={event => { event.preventDefault(); applyRange(draft); }} quickApply={applyRange} error={rangeError} pending={pending} />
    {error && <Alert type="error">{error}</Alert>}
    {!overview && <ReportNavigation view={view} onChange={chooseView} id={navigationId} />}
    <DataState resource={resource}>{report && <div className="report-view" role={overview ? undefined : 'tabpanel'} id={overview ? undefined : `${navigationId}-panel`} aria-labelledby={overview ? undefined : `${navigationId}-${view}`} tabIndex={overview ? undefined : 0}>
      <div className="report-period"><div><span>Kỳ báo cáo</span><strong>{displayDate(report.from)} – {displayDate(report.to)}</strong><small>So với {displayDate(report.previousFrom)} – {displayDate(report.previousTo)}</small></div><span className="report-scope"><Store size={16} aria-hidden="true" />{partner ? restaurant?.name || 'Tất cả quán của bạn' : 'Toàn hệ thống'}<small>Giờ Việt Nam · VND</small></span></div>
      {(overview || view === 'summary') && <>
        {Number(report.current.orders) === 0 && <div className="report-zero-notice" role="status"><ShoppingBag size={20} aria-hidden="true" /><div><strong>Chưa có đơn hàng trong kỳ này</strong><span>Chọn khoảng ngày khác hoặc đổi phạm vi nhà hàng để xem thêm dữ liệu.</span></div></div>}
        <div className="admin-kpis">
          <Metric featured label="Doanh thu món" value={report.current.revenue} previous={report.previous.revenue} money icon={CircleDollarSign} description="Tiền món của đơn tạo trong kỳ, hiện hoàn tất và đã thanh toán. Không gồm phí giao hàng." context="Không gồm phí giao hàng" />
          <Metric label="Tổng đơn hàng" value={report.current.orders} previous={report.previous.orders} icon={ShoppingBag} description="Số đơn được tạo trong kỳ, gồm mọi trạng thái." context="Bao gồm tất cả trạng thái" />
          <Metric label="Giá trị đơn trung bình" value={report.current.average} previous={report.previous.average} money icon={Receipt} description="Tổng thu gồm phí giao chia cho số đơn hoàn tất và đã thanh toán." context="Gồm phí giao · Chỉ đơn hoàn tất, đã trả" />
          <Metric label="Hoàn tất & đã trả" value={report.current.completed} previous={report.previous.completed} icon={CheckCircle2} description="Số đơn tạo trong kỳ, hiện hoàn tất và đã thanh toán. Đây là các đơn được tính vào doanh thu." context="Số đơn được tính vào doanh thu" />
          <Metric label={partner ? 'Khách đặt trong kỳ' : 'Khách hàng mới'} value={report.current.customers} previous={report.previous.customers} icon={UserRoundPlus} description={partner ? 'Số khách riêng biệt đã đặt trong kỳ, theo phạm vi quán đã chọn.' : 'Số tài khoản khách được tạo trong kỳ.'} context={`${number.format(report.current.totalCustomers)} tổng khách hàng hiện có`} />
          <Metric label="Tỷ lệ hủy / từ chối" value={report.current.cancellationRate} previous={report.previous.cancellationRate} points icon={CircleX} description="Số đơn hủy hoặc bị từ chối chia cho toàn bộ đơn tạo trong kỳ. Giảm là tín hiệu tích cực." context={`${number.format(report.current.cancelled)} trên ${number.format(report.current.orders)} đơn trong kỳ`} />
        </div>
        <SectionHeading title="Xu hướng kinh doanh" description="Theo dõi doanh thu món và lượng đơn qua từng kỳ." />
        {overview ? <div className="report-overview"><StatisticsCharts report={report} range={filters} interactive /><Attention attention={report.attention} admin={user.role === 'ADMIN'} /></div> : <StatisticsCharts report={report} range={filters} />}
        {!overview && <ReportHighlights report={report} onView={chooseView} />}
        {overview ? <><Breakdown report={report} /><RecentOrders report={report} area={area} /></> : <PeriodTable report={report} displayDate={displayDate} />}
      </>}
      {!overview && view === 'orders' && <>
        <SectionHeading title="Đơn hàng & thanh toán" description={`${number.format(report.current.orders)} đơn tạo trong kỳ · ${number.format(report.current.cancelled)} đơn hủy hoặc bị từ chối`} />
        <Breakdown report={report} /><Settlement report={report} /><RecentOrders report={report} area={area} />
      </>}
      {!overview && view === 'products' && <ProductInsights report={report} partner={partner} />}
      {!overview && partner && view === 'summary' && <Attention attention={report.attention} partner />}
      <ReportGuide partner={partner} />
    </div>}</DataState>
  </div>;
}
