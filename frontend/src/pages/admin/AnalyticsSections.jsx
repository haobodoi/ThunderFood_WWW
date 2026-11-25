import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Badge, DataState, Table, formatVND, useAdminData } from './AdminShared.jsx';
import { SectionHeading } from './ReportSections.jsx';

const number = new Intl.NumberFormat('vi-VN');
const one = new Intl.NumberFormat('vi-VN', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const DAYS = ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'CN'];
const percent = (part, whole) => (Number(whole) ? Number(part) / Number(whole) * 100 : null);
const showPercent = value => (value == null ? '—' : one.format(value) + '%');
const showMinutes = value => (value == null || value === '' ? '—' : one.format(Number(value)) + ' phút');

/** Một ô chỉ số nhỏ trong các nhóm phân tích. */
function Stat({ label, value, note, tone }) {
  return <div className="analytics-stat" data-tone={tone}>
    <span>{label}</span><strong>{value}</strong>{note && <small>{note}</small>}
  </div>;
}

/** Tải dữ liệu phân tích chi tiết một lần cho cả các tab, chỉ trên trang Thống kê. */
export function AnalyticsInsights({ view, params, client, area }) {
  const resource = useAdminData('/dashboard/insights', params, client);
  const data = resource.data;
  const partner = area === 'partner';
  return <DataState resource={resource}>{data && <>
    {view === 'restaurants' && <RestaurantPerformance rows={data.restaurants} partner={partner} />}
    {view === 'time' && <PeakHours cells={data.heatmap} />}
    {view === 'customers' && <CustomerInsights customers={data.customers} top={data.topCustomers} partner={partner} />}
    {view === 'orders' && <><MoneyFlow money={data.money} /><ServiceTimes times={data.times} /><CancelReasons rows={data.cancelReasons} /></>}
  </>}</DataState>;
}

const SORTS = {
  revenue: ['Doanh thu món', row => Number(row.revenue)],
  orders: ['Số đơn', row => Number(row.orders)],
  growth: ['Tăng trưởng', row => row.growth ?? -Infinity],
  cancel: ['Tỷ lệ hủy / từ chối', row => row.cancelRate ?? -1],
  fulfil: ['Thời gian giao', row => (row.avgFulfilMinutes == null ? -1 : Number(row.avgFulfilMinutes))],
};

export function RestaurantPerformance({ rows = [], partner }) {
  const [sort, setSort] = useState('revenue');
  const total = rows.reduce((sum, row) => sum + Number(row.revenue), 0);
  const list = useMemo(() => rows.map(row => ({
    ...row,
    share: percent(row.revenue, total),
    growth: Number(row.previousRevenue) ? percent(Number(row.revenue) - Number(row.previousRevenue), row.previousRevenue) : null,
    cancelRate: percent(Number(row.cancelled) + Number(row.rejected), row.orders),
    aov: Number(row.completed) ? Number(row.receipts) / Number(row.completed) : null,
  })).sort((a, b) => SORTS[sort][1](b) - SORTS[sort][1](a)), [rows, sort, total]);
  const headers = ['Nhà hàng', 'Số đơn', 'Doanh thu', 'Tăng trưởng', 'TB/đơn', 'Hủy / từ chối', 'Xác nhận COD', 'Thời gian giao'];
  return <section className="admin-panel">
    <SectionHeading title={partner ? 'Hiệu quả từng quán' : 'Hiệu quả theo nhà hàng'} description="Đơn tạo trong kỳ. Doanh thu món chỉ tính đơn hoàn tất, đã thanh toán; tăng trưởng so với kỳ trước. Xác nhận COD: phút từ lúc đặt đến khi quán nhận đơn. Thời gian giao: phút từ lúc xác nhận đến khi hoàn tất.">
      <label className="analytics-sort"><span>Sắp xếp theo</span><select value={sort} onChange={event => setSort(event.target.value)}>
        {Object.entries(SORTS).map(([key, [label]]) => <option key={key} value={key}>{label}</option>)}
      </select></label>
    </SectionHeading>
    {list.length ? <Table caption="Hiệu quả theo nhà hàng" headers={headers} numeric={headers.slice(1)}>
      {list.map(row => <tr key={row.id}>
        <td>{partner ? <strong>{row.name}</strong> : <Link className="admin-link" to={'/admin/restaurants/' + row.id}>{row.name}</Link>}
          <span className="analytics-share" aria-hidden="true"><span style={{ width: `${row.share ?? 0}%` }} /></span>
          <small>{showPercent(row.share)} doanh thu {partner ? 'các quán' : 'toàn hệ thống'}</small></td>
        <td data-numeric>{number.format(row.orders)}<small>{number.format(row.completed)} hoàn tất</small></td>
        <td data-numeric><strong className="admin-money">{formatVND(row.revenue)}</strong></td>
        <td data-numeric><span className="analytics-delta" data-direction={row.growth == null ? undefined : row.growth > 0 ? 'up' : row.growth < 0 ? 'down' : 'flat'}>{row.growth == null ? (Number(row.revenue) ? 'Mới phát sinh' : '—') : (row.growth > 0 ? '+' : '') + one.format(row.growth) + '%'}</span></td>
        <td data-numeric>{row.aov == null ? '—' : formatVND(row.aov)}</td>
        <td data-numeric><span data-alert={row.cancelRate >= 20 || undefined} className="analytics-rate">{showPercent(row.cancelRate)}</span><small>{number.format(Number(row.cancelled) + Number(row.rejected))} đơn</small></td>
        <td data-numeric>{showMinutes(row.avgConfirmMinutes)}</td>
        <td data-numeric><span data-alert={Number(row.avgFulfilMinutes) > 60 || undefined} className="analytics-rate">{showMinutes(row.avgFulfilMinutes)}</span></td>
      </tr>)}
    </Table> : <p className="report-empty-note">Chưa có đơn hàng trong kỳ đã chọn.</p>}
    <p className="analytics-footnote">Hủy / từ chối ≥ 20% hoặc thời gian giao &gt; 60 phút được tô đỏ để ưu tiên kiểm tra.</p>
  </section>;
}

export function PeakHours({ cells = [] }) {
  const [metric, setMetric] = useState('orders');
  const grid = useMemo(() => {
    const values = Array.from({ length: 7 }, () => Array(24).fill(0));
    cells.forEach(cell => { values[Number(cell.dayIndex)][Number(cell.hourOfDay)] = Number(cell[metric]); });
    return values;
  }, [cells, metric]);
  const max = Math.max(0, ...grid.flat());
  const byHour = Array.from({ length: 24 }, (_, hour) => grid.reduce((sum, day) => sum + day[hour], 0));
  const byDay = grid.map(day => day.reduce((sum, value) => sum + value, 0));
  const total = byDay.reduce((sum, value) => sum + value, 0);
  const topHours = byHour.map((value, hour) => ({ hour, value })).filter(item => item.value > 0).sort((a, b) => b.value - a.value).slice(0, 3);
  const busiestDay = byDay.indexOf(Math.max(...byDay));
  const format = value => (metric === 'revenue' ? formatVND(value) : number.format(value) + ' đơn');
  const hourMax = Math.max(0, ...byHour);
  return <>
    <section className="analytics-stats">
      <Stat label="Giờ đông nhất" value={topHours[0] ? `${topHours[0].hour}:00 – ${topHours[0].hour + 1}:00` : '—'} note={topHours[0] ? `${format(topHours[0].value)} · ${showPercent(percent(topHours[0].value, total))}` : null} />
      <Stat label="Top 3 giờ đông nhất" value={topHours.length ? topHours.map(item => item.hour + 'h').join(', ') : '—'} note={topHours.length ? `Chiếm ${showPercent(percent(topHours.reduce((sum, item) => sum + item.value, 0), total))} tổng ${metric === 'revenue' ? 'doanh thu' : 'đơn'}` : null} />
      <Stat label="Ngày đông nhất trong tuần" value={total ? DAYS[busiestDay] : '—'} note={total ? format(byDay[busiestDay]) : null} />
    </section>
    <section className="admin-panel">
      <SectionHeading title="Khung giờ cao điểm" description="Theo giờ Việt Nam lúc khách đặt đơn. Ô càng đậm càng nhiều; rê chuột để xem số liệu.">
        <div className="report-segmented" role="group" aria-label="Chỉ số bản đồ nhiệt">
          <button type="button" aria-pressed={metric === 'orders'} onClick={() => setMetric('orders')}>Số đơn</button>
          <button type="button" aria-pressed={metric === 'revenue'} onClick={() => setMetric('revenue')}>Doanh thu món</button>
        </div>
      </SectionHeading>
      {total ? <div className="analytics-heatmap-wrap" role="region" aria-label="Bản đồ nhiệt theo giờ" tabIndex={0}>
        <table className="analytics-heatmap">
          <caption className="tf-visually-hidden">{metric === 'revenue' ? 'Doanh thu món' : 'Số đơn'} theo ngày trong tuần và giờ</caption>
          <thead><tr><th scope="col"><span className="tf-visually-hidden">Ngày</span></th>{byHour.map((_, hour) => <th scope="col" key={hour}>{hour}</th>)}</tr></thead>
          <tbody>{grid.map((day, index) => <tr key={index}><th scope="row">{DAYS[index]}</th>{day.map((value, hour) => {
            const ratio = max ? value / max : 0;
            return <td key={hour} title={`${DAYS[index]}, ${hour}:00–${hour + 1}:00: ${format(value)}`} style={{ backgroundColor: value ? `rgba(234, 88, 12, ${(0.1 + ratio * 0.85).toFixed(3)})` : undefined }} data-strong={ratio > 0.55 || undefined}>
              <span className="tf-visually-hidden">{format(value)}</span></td>;
          })}</tr>)}</tbody>
        </table>
        <div className="analytics-heatmap-legend" aria-hidden="true"><span>Ít</span><i /><span>Nhiều</span></div>
      </div> : <p className="report-empty-note">Chưa có đơn hàng trong kỳ đã chọn.</p>}
    </section>
    {total > 0 && <section className="admin-panel">
      <SectionHeading title="Phân bố theo giờ trong ngày" description="Cộng tất cả các ngày trong kỳ." />
      <ol className="analytics-hours">{byHour.map((value, hour) => <li key={hour} title={`${hour}:00 – ${hour + 1}:00: ${format(value)}`}>
        <span className="analytics-hours__bar"><span style={{ height: `${hourMax ? value / hourMax * 100 : 0}%` }} data-top={topHours.some(item => item.hour === hour) || undefined} /></span>
        <small>{hour}</small>
      </li>)}</ol>
    </section>}
  </>;
}

export function CustomerInsights({ customers = {}, top = [], partner }) {
  const active = Number(customers.active ?? 0);
  return <>
    <section className="analytics-stats">
      <Stat label="Khách đặt trong kỳ" value={number.format(active)} note={`${number.format(customers.orders ?? 0)} đơn · TB ${active ? one.format(Number(customers.orders) / active) : '0'} đơn/khách`} />
      <Stat label="Khách đặt lần đầu" value={number.format(customers.firstTime ?? 0)} note={showPercent(percent(customers.firstTime, active)) + ' khách trong kỳ'} />
      <Stat label="Khách quay lại" value={number.format(customers.returningCustomers ?? 0)} note={showPercent(percent(customers.returningCustomers, active)) + ' đã từng đặt trước kỳ'} tone="good" />
      <Stat label="Đặt từ 2 đơn trong kỳ" value={number.format(customers.repeaters ?? 0)} note={showPercent(percent(customers.repeaters, active)) + ' khách trong kỳ'} />
    </section>
    <section className="admin-panel">
      <SectionHeading title="Khách hàng chi tiêu nhiều nhất" description={`10 khách có tổng thu đơn hoàn tất, đã thanh toán cao nhất trong kỳ${partner ? ' tại các quán của bạn' : ''}.`} />
      {top.length ? <Table caption="Khách hàng chi tiêu nhiều nhất" headers={['#', 'Khách hàng', 'Đơn hoàn tất', 'Tổng chi tiêu', 'TB/đơn']} numeric={['Đơn hoàn tất', 'Tổng chi tiêu', 'TB/đơn']}>
        {top.map((row, index) => <tr key={row.id}><td>{index + 1}</td>
          <td>{partner ? row.name : <Link className="admin-link" to={'/admin/users/' + row.id}>{row.name}</Link>}</td>
          <td data-numeric>{number.format(row.orders)}</td>
          <td data-numeric><strong className="admin-money">{formatVND(row.spend)}</strong></td>
          <td data-numeric>{formatVND(Number(row.spend) / Number(row.orders || 1))}</td></tr>)}
      </Table> : <p className="report-empty-note">Chưa có đơn hoàn tất trong kỳ.</p>}
    </section>
  </>;
}

export function MoneyFlow({ money = {} }) {
  return <section className="admin-panel">
    <SectionHeading title="Dòng tiền của đơn trong kỳ" description="Theo trạng thái hiện tại của các đơn tạo trong kỳ. Hệ thống chỉ ghi nhận, không tự chuyển tiền." />
    <div className="analytics-stats analytics-stats--flat">
      <Stat label="Đã thu · Tiền mặt (COD)" value={formatVND(money.codReceipts)} tone="good" />
      <Stat label="Đã thu · Chuyển khoản VietQR" value={formatVND(money.onlineReceipts)} tone="good" />
      <Stat label="Đơn đang xử lý" value={formatVND(money.inProgress)} note={`${number.format(money.inProgressCount ?? 0)} đơn chưa hoàn tất`} />
      <Stat label="Cần hoàn tiền cho khách" value={formatVND(money.refundPending)} note={`${number.format(money.refundPendingCount ?? 0)} đơn đã trả tiền nhưng bị hủy / từ chối`} tone={Number(money.refundPendingCount) ? 'bad' : undefined} />
      <Stat label="Đã hoàn tiền" value={formatVND(money.refunded)} note={`${number.format(money.refundedCount ?? 0)} đơn`} />
      <Stat label="Giá trị đơn bị hủy / từ chối" value={formatVND(money.lost)} note="Doanh thu bị mất trong kỳ" tone="bad" />
    </div>
  </section>;
}

const BUCKETS = [['within30', '≤ 30 phút', 'good'], ['within45', '31 – 45 phút', 'good'], ['within60', '46 – 60 phút', 'warn'], ['over60', '> 60 phút', 'bad']];

export function ServiceTimes({ times = {} }) {
  const total = BUCKETS.reduce((sum, [key]) => sum + Number(times[key] ?? 0), 0);
  return <section className="admin-panel">
    <SectionHeading title="Thời gian xử lý đơn" description="Xác nhận: từ lúc khách đặt đến khi quán nhận đơn COD (đơn VietQR được xác nhận khi nhận tiền). Giao xong: từ lúc xác nhận đến khi hoàn tất." />
    <div className="analytics-stats analytics-stats--flat">
      <Stat label="Quán xác nhận đơn COD (TB)" value={showMinutes(times.avgConfirmMinutes)} />
      <Stat label="Xác nhận → giao xong (TB)" value={showMinutes(times.avgFulfilMinutes)} />
      <Stat label="Giao xong trong 45 phút" value={showPercent(percent(Number(times.within30 ?? 0) + Number(times.within45 ?? 0), total))} note={`${number.format(total)} đơn hoàn tất có đủ mốc thời gian`} tone="good" />
    </div>
    {total > 0 && <div className="analytics-buckets" role="img" aria-label={BUCKETS.map(([key, label]) => `${label}: ${number.format(times[key] ?? 0)} đơn`).join(', ')}>
      {BUCKETS.map(([key, label, tone]) => <div key={key} data-tone={tone} style={{ flexGrow: Number(times[key] ?? 0) || 0.0001 }}><span>{label}</span><strong>{showPercent(percent(times[key], total))}</strong></div>)}
    </div>}
  </section>;
}

export function CancelReasons({ rows = [] }) {
  const total = rows.reduce((sum, row) => sum + Number(row.count), 0);
  return <section className="admin-panel">
    <SectionHeading title="Lý do hủy / từ chối" description="10 lý do gặp nhiều nhất trong kỳ, phân biệt khách hủy và quán từ chối." />
    {rows.length ? <Table caption="Lý do hủy hoặc từ chối" headers={['Lý do', 'Bên kết thúc', 'Số đơn', 'Tỷ trọng']} numeric={['Số đơn', 'Tỷ trọng']}>
      {rows.map((row, index) => <tr key={index}><td>{row.reason}</td>
        <td><Badge tone={row.status === 'REJECTED' ? 'danger' : 'warning'}>{row.status === 'REJECTED' ? 'Quán từ chối' : 'Khách hủy'}</Badge></td>
        <td data-numeric>{number.format(row.count)}</td><td data-numeric>{showPercent(percent(row.count, total))}</td></tr>)}
    </Table> : <p className="report-empty-note">Không có đơn hủy hoặc bị từ chối trong kỳ.</p>}
  </section>;
}

const COMPARE = [
  ['revenue', 'Doanh thu món', 'money'], ['deliveryFees', 'Phí giao hàng', 'money'], ['receipts', 'Tổng thu đơn đã trả', 'money'],
  ['orders', 'Tổng đơn tạo', 'count'], ['completed', 'Đơn hoàn tất & đã trả', 'count'], ['average', 'Giá trị đơn trung bình', 'money'],
  ['cancelled', 'Đơn hủy / từ chối', 'count', true], ['cancellationRate', 'Tỷ lệ hủy / từ chối', 'rate', true], ['customers', 'Khách hàng mới (tài khoản)', 'count'],
];

/** Bảng so sánh đầy đủ kỳ này với kỳ trước. `inverse`: giảm là tốt. */
export function PeriodComparison({ report, partner }) {
  const show = (value, kind) => (kind === 'money' ? formatVND(value) : kind === 'rate' ? one.format(Number(value)) + '%' : number.format(Number(value)));
  return <section className="admin-panel">
    <SectionHeading title="So sánh với kỳ trước" description="Kỳ trước có cùng số ngày, liền trước kỳ đang xem." />
    <Table caption="So sánh với kỳ trước" headers={['Chỉ số', 'Kỳ này', 'Kỳ trước', 'Chênh lệch']} numeric={['Kỳ này', 'Kỳ trước', 'Chênh lệch']}>
      {COMPARE.map(([key, label, kind, inverse]) => {
        const current = Number(report.current[key] ?? 0), previous = Number(report.previous[key] ?? 0);
        const diff = kind === 'rate' ? current - previous : previous ? (current - previous) / previous * 100 : null;
        const good = diff == null || diff === 0 ? undefined : (diff > 0) !== Boolean(inverse);
        return <tr key={key}><td>{key === 'customers' && partner ? 'Khách đặt trong kỳ' : label}</td><td data-numeric><strong>{show(current, kind)}</strong></td><td data-numeric>{show(previous, kind)}</td>
          <td data-numeric><span className="analytics-delta" data-direction={good === undefined ? 'flat' : good ? 'up' : 'down'}>{diff == null ? (current ? 'Kỳ trước = 0' : '—') : (diff > 0 ? '+' : '') + one.format(diff) + (kind === 'rate' ? ' điểm %' : '%')}</span></td></tr>;
      })}
    </Table>
  </section>;
}

