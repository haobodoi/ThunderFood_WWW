import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowDownRight, ArrowRight, ArrowUpRight, CalendarDays, CircleDollarSign, CircleX,
  ClipboardList, Download, Info, MessageSquareWarning, Receipt, RefreshCw, ShoppingBag,
  Store, UserRoundPlus, UsersRound, Wallet,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';
import { adminApi } from '../../api/adminApi.js';
import { partnerStatisticsApi } from '../../api/partnerStatisticsApi.js';
import StatisticsCharts from '../../components/StatisticsCharts.jsx';
import Alert from '../../components/Alert.jsx';
import { ORDER_STATUS, PAYMENT_STATUS, PAYMENT_METHOD } from '../../utils/orderUtils.js';
import { parseDay, formatChartValue, toChartUnits } from '../../utils/statisticsChart.js';
import { DataState, Field, Head, OrderTable, RestaurantPicker, Table, formatVND, useAdminData } from './AdminShared.jsx';

const number = new Intl.NumberFormat('vi-VN');
const date = new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'UTC' });
const dayInVietnam = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit',
});
const GROUPS = { day: 'Ngày', week: 'Tuần', month: 'Tháng', year: 'Năm' };
const COLORS = ['#bd560c', '#476783', '#7258a6', '#087e82', '#16734b', '#b83841', '#801f3e'];

function recentRange(days, group = 'day') {
  const to = dayInVietnam.format(new Date());
  const from = new Date(parseDay(to) - (days - 1) * 86400000).toISOString().slice(0, 10);
  return { from, to, group };
}

function displayDate(value) {
  const day = parseDay(value);
  return day === null ? '—' : date.format(day);
}

export function Donut({ title, entries }) {
  const total = entries.reduce((sum, entry) => sum + Number(entry.count ?? 0), 0);
  let offset = 0;
  return <section className="admin-panel donut-card">
    <h2>{title}</h2>
    <div className="donut-card__body">
      <div className="donut-card__graphic" aria-hidden="true">
        <svg viewBox="0 0 120 120">
          <circle cx="60" cy="60" r="46" fill="none" stroke="#edf0f3" strokeWidth="13" />
          {total > 0 && entries.map((entry, index) => {
            const share = Number(entry.count ?? 0) / total * 100;
            const segment = offset;
            offset += share;
            return share > 0 && <circle key={entry.label} cx="60" cy="60" r="46" fill="none"
              stroke={COLORS[index % COLORS.length]} strokeWidth="13" pathLength="100"
              strokeDasharray={share + ' ' + (100 - share)} strokeDashoffset={-segment} transform="rotate(-90 60 60)" />;
          })}
        </svg>
        <div><strong>{number.format(total)}</strong><span>đơn hàng</span></div>
      </div>
      <ul className="donut-card__legend">
        {entries.map((entry, index) => <li key={entry.label}>
          <span><i style={{ backgroundColor: COLORS[index % COLORS.length] }} aria-hidden="true" />{entry.label}</span>
          <strong>{number.format(entry.count ?? 0)} <small>({total ? (entry.count / total * 100).toFixed(1) : '0'}%)</small></strong>
        </li>)}
      </ul>
    </div>
  </section>;
}

export function Metric({ label, value, previous, money, icon: MetricIcon, description, points, featured }) {
  const current = Number(value);
  const old = Number(previous);
  const delta = previous == null ? null : points ? current - old : old ? (current - old) / old * 100 : null;
  const change = delta !== null ? Number(delta.toFixed(1)) : null;
  const direction = change > 0 ? 'up' : change < 0 ? 'down' : 'flat';
  return <article className={'admin-kpi' + (featured ? ' admin-kpi--featured' : '')}>
    <div className="enterprise-kpi-top">
      <span className="enterprise-kpi-icon"><MetricIcon size={18} aria-hidden="true" /></span>
      <details className="enterprise-help">
        <summary aria-label={'Giải thích ' + label}><Info size={16} aria-hidden="true" /></summary>
        <p>{description}</p>
      </details>
    </div>
    <span>{label}</span>
    <strong>{money ? formatVND(value) : points ? number.format(current) + '%' : number.format(current)}</strong>
    {previous != null && <small className="admin-kpi__comparison" data-direction={direction} data-inverse={points || undefined}>
      {direction === 'up' && <ArrowUpRight size={13} aria-hidden="true" />}
      {direction === 'down' && <ArrowDownRight size={13} aria-hidden="true" />}
      {change === null
        ? 'Kỳ trước: ' + (money ? formatVND(previous) : number.format(old))
        : (change > 0 ? '+' : '') + change.toFixed(1) + (points ? ' điểm %' : '%') + ' so với kỳ trước'}
    </small>}
  </article>;
}

function Ranking({ title, items, by = 'quantity', description }) {
  const ranked = [...items].sort((a, b) => Number(b[by]) - Number(a[by]));
  const max = Number(ranked[0]?.[by] ?? 0);
  return <section className="admin-panel ranking-panel">
    <h2>{title}</h2>
    {description && <p className="muted">{description}</p>}
    {ranked.length ? <ol className="dashboard-ranking">{ranked.map((item, index) => <li key={item.id ?? item.name + index}>
      <div><span>{item.name}</span><strong>{by === 'revenue' ? formatVND(item.revenue) : number.format(item.quantity) + ' phần'}</strong></div>
      <span className="dashboard-bar" aria-hidden="true"><span style={{ width: (max ? Number(item[by]) / max * 100 : 0) + '%' }} /></span>
    </li>)}</ol> : <p className="muted">Chưa có dữ liệu trong kỳ.</p>}
  </section>;
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
    <header><h2>Cần xử lý</h2><p className="muted">Tại thời điểm xem · Ngoài bộ lọc ngày</p></header>
    <ul>{tasks.map(({ label, count, icon: Icon, to }) => <li key={label}>
      <Link to={to}><span className="queue-icon"><Icon size={17} aria-hidden="true" /></span><span>{label}</span><strong>{number.format(count)}</strong><ArrowRight size={15} aria-hidden="true" /></Link>
    </li>)}</ul>
    {partner && <p className="muted">Liên kết mở danh sách đơn của tất cả quán theo trạng thái.</p>}
  </section>;
}

function Breakdown({ report }) {
  return <div className="admin-grid">
    <Donut title="Trạng thái đơn hàng" entries={Object.entries(ORDER_STATUS).map(([key, meta]) => ({
      label: meta.label, count: report.statuses.find(row => row.status === key)?.count ?? 0,
    }))} />
    <Donut title="Phương thức thanh toán" entries={Object.entries(PAYMENT_METHOD).map(([key, label]) => ({
      label, count: report.paymentMethods.find(row => row.method === key)?.count ?? 0,
    }))} />
  </div>;
}

function ProductInsights({ report, partner }) {
  return <>
    <div className="admin-grid">
      <Ranking title="Món bán chạy" items={report.topItems} />
      <Ranking title="Doanh thu theo danh mục" items={report.topCategories} by="revenue"
        description="Tối đa 10 danh mục bán nhiều nhất, sắp theo doanh thu món." />
    </div>
    {partner && <Ranking title="Doanh thu món theo quán" items={report.byRestaurant ?? []} by="revenue" />}
    <section className="admin-panel">
      <h2>Món bán chậm / chưa bán</h2>
      {report.slowItems.length ? <Table headers={['Tên món', 'Số phần', 'Quán']} caption="Món bán chậm / chưa bán">
        {report.slowItems.map((item, index) => <tr key={item.name + index}><td>{item.name}</td>
          <td data-numeric>{number.format(item.quantity)}</td><td>{item.restaurantName}</td></tr>)}
      </Table> : <p className="muted">Chưa có dữ liệu trong kỳ.</p>}
    </section>
  </>;
}

function ReportFilters({ draft, setDraft, apply }) {
  return <form className="admin-panel report-filters" onSubmit={apply}>
    <div className="report-filters__shortcuts">
      <div className="report-filters__label"><CalendarDays size={17} aria-hidden="true" /> Kỳ báo cáo</div>
      <div className="dashboard-presets" role="group" aria-label="Chọn nhanh khoảng thời gian">
        {[7, 30, 90].map(days => {
          const range = recentRange(days, draft.group);
          return <button type="button" key={days} className="dashboard-preset"
            aria-pressed={range.from === draft.from && range.to === draft.to} onClick={() => setDraft(range)}>{days} ngày</button>;
        })}
      </div>
    </div>
    <div className="report-filters__fields">
      <Field label="Từ ngày"><input type="date" required value={draft.from} onChange={event => setDraft({ ...draft, from: event.target.value })} /></Field>
      <Field label="Đến ngày"><input type="date" required min={draft.from} value={draft.to} onChange={event => setDraft({ ...draft, to: event.target.value })} /></Field>
      <Field label="Nhóm theo"><select value={draft.group} onChange={event => setDraft({ ...draft, group: event.target.value })}>
        {Object.entries(GROUPS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
      </select></Field>
      <button type="submit" className="btn btn--primary">Áp dụng</button>
    </div>
  </form>;
}

export default function AdminHomePage({ area = 'admin', analytics = false }) {
  const { user } = useAuth();
  const partner = area === 'partner';
  const overview = !partner && !analytics;
  const client = partner ? partnerStatisticsApi : adminApi;
  const [restaurant, setRestaurant] = useState(null);
  const [draftRestaurant, setDraftRestaurant] = useState(null);
  const [draft, setDraft] = useState(() => recentRange(30));
  const [filters, setFilters] = useState(draft);
  const [error, setError] = useState('');
  const [exporting, setExporting] = useState(false);
  const params = partner ? { ...filters, restaurantId: restaurant?.id } : filters;
  const resource = useAdminData('/dashboard', params, client);
  const report = resource.data;

  async function download() {
    setExporting(true);
    setError('');
    try {
      const blob = await client.export(params);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = ['ThunderFood', filters.from, filters.to].join('-') + '.csv';
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch {
      setError('Không xuất được CSV. Vui lòng thử lại.');
    } finally {
      setExporting(false);
    }
  }

  function apply(event) {
    event.preventDefault();
    setError('');
    setRestaurant(draftRestaurant);
    setFilters(draft);
  }

  return <div className="admin-page report-page">
    <Head title={partner ? 'Thống kê kinh doanh' : overview ? 'Tổng quan kinh doanh' : 'Thống kê & báo cáo'}
      description={overview ? 'Theo dõi kết quả kinh doanh và các việc cần xử lý.' : 'Phân tích doanh thu, đơn hàng, khách hàng và hiệu quả thực đơn.'}>
      <button type="button" className="btn btn--outline" onClick={resource.refresh} disabled={resource.loading}><RefreshCw size={16} /> Làm mới</button>
      {overview && <Link className="btn btn--outline" to="/admin/analytics">Xem báo cáo <ArrowRight size={16} /></Link>}
      <button type="button" className="btn btn--primary" disabled={exporting || !report} onClick={download}>
          <Download size={16} /> {exporting ? 'Đang xuất…' : 'Xuất CSV'}
      </button>
    </Head>
    {partner && <RestaurantPicker value={draftRestaurant} onChange={setDraftRestaurant} client={partnerStatisticsApi} path="/restaurants" allLabel="Tất cả quán của bạn" />}
    <ReportFilters draft={draft} setDraft={setDraft} apply={apply} />
    {error && <Alert type="error">{error}</Alert>}
    <DataState resource={resource}>{report && <>
      <div className="report-period">
        <strong>{displayDate(report.from)} – {displayDate(report.to)}{restaurant && ' · ' + restaurant.name}</strong>
        <span>Kỳ trước {displayDate(report.previousFrom)} – {displayDate(report.previousTo)} · Giờ Việt Nam</span>
      </div>
      <div className="admin-kpis">
        <Metric featured label="Tổng thu đơn đã trả" value={report.current.receipts} previous={report.previous.receipts} money icon={CircleDollarSign} description="Tổng giá trị đơn hoàn tất và đã thanh toán, gồm phí giao hàng." />
        <Metric label="Tổng đơn hàng" value={report.current.orders} previous={report.previous.orders} icon={ShoppingBag} description="Số đơn được tạo trong kỳ, gồm mọi trạng thái." />
        <Metric label="Giá trị đơn trung bình" value={report.current.average} previous={report.previous.average} money icon={Receipt} description="Tổng thu gồm phí giao chia cho số đơn hoàn tất và đã thanh toán." />
        <Metric label={partner ? 'Khách đặt trong kỳ' : 'Khách hàng mới'} value={report.current.customers} previous={report.previous.customers} icon={UserRoundPlus} description={partner ? 'Số khách riêng biệt đã đặt trong kỳ.' : 'Số tài khoản khách được tạo trong kỳ.'} />
        <Metric label="Tổng khách hàng" value={report.current.totalCustomers} icon={UsersRound} description={partner ? 'Số khách từng đặt trong phạm vi quán đã chọn.' : 'Tổng tài khoản khách hiện có, gồm cả tài khoản bị khóa.'} />
        <Metric label="Tỷ lệ hủy / từ chối" value={report.current.cancellationRate} previous={report.previous.cancellationRate} points icon={CircleX} description="Số đơn hủy hoặc bị từ chối chia cho toàn bộ đơn tạo trong kỳ." />
      </div>
      {overview ? <div className="report-overview">
        <StatisticsCharts report={report} range={filters} interactive />
        <Attention attention={report.attention} admin={user.role === 'ADMIN'} />
      </div> : <StatisticsCharts report={report} range={filters} />}
      {!overview && <details className="admin-panel">
        <summary>Xem số liệu theo kỳ</summary>
        <p className="muted">Số liệu theo ngày tạo đơn. Doanh thu món tính trên đơn hoàn tất và đã thanh toán.</p>
        <Table headers={['Đầu kỳ', 'Số đơn', 'Doanh thu món']} caption="Số liệu theo kỳ">
          {report.series.map(row => <tr key={row.period}><td>{displayDate(row.period)}</td>
            <td data-numeric>{formatChartValue(toChartUnits(row.orders, false), false)}</td>
            <td data-numeric>{formatChartValue(toChartUnits(row.revenue, true), true)}</td></tr>)}
        </Table>
      </details>}
      <Breakdown report={report} />
      {!overview && <>
        <section className="admin-panel">
          <h2>Đối soát doanh thu và thanh toán</h2>
          <dl className="report-totals">
            <div><dt>Doanh thu món</dt><dd>{formatVND(report.current.revenue)}</dd></div>
            <div><dt>Phí giao hàng</dt><dd>{formatVND(report.current.deliveryFees)}</dd></div>
            <div><dt>Tổng thu đơn đã trả</dt><dd>{formatVND(report.current.receipts)}</dd></div>
          </dl>
          <ul className="admin-breakdown">{Object.entries(PAYMENT_STATUS).map(([key, meta]) => <li key={key}>
            <span>{meta.label}</span><strong>{number.format(report.payments.find(row => row.status === key)?.count ?? 0)} đơn</strong>
          </li>)}</ul>
        </section>
        <ProductInsights report={report} partner={partner} />
        {partner && <Attention attention={report.attention} partner />}
      </>}
      <section className="admin-panel">
        <div className="admin-section-head"><h2>Đơn gần đây trong kỳ</h2>
          <Link className="admin-link" to={partner ? '/partner/orders' : '/admin/orders'}>Tất cả đơn hàng</Link>
        </div>
        {report.latest.length ? <OrderTable items={report.latest} area={area} /> : <p className="muted">Chưa có đơn trong kỳ đã chọn.</p>}
      </section>
    </>}</DataState>
  </div>;
}
