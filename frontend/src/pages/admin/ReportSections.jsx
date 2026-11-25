import { useState } from 'react';
import { ArrowRight, Banknote, CheckCircle2, Info, ShoppingBag, UtensilsCrossed } from 'lucide-react';
import { Link } from 'react-router-dom';
import { ORDER_STATUS, PAYMENT_METHOD, PAYMENT_STATUS } from '../../utils/orderUtils.js';
import { formatChartValue, toChartUnits } from '../../utils/statisticsChart.js';
import { Badge, OrderTable, Table, formatVND } from './AdminShared.jsx';

const number = new Intl.NumberFormat('vi-VN');
const percent = new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 1, minimumFractionDigits: 1 });
const STATUS_COLORS = { PENDING: '#d97706', CONFIRMED: '#64748b', PREPARING: '#6366a1', DELIVERING: '#0284c7', COMPLETED: '#168466', CANCELLED: '#dc5c5c', REJECTED: '#9f3349' };
const METHOD_COLORS = { COD: '#344b65', ONLINE: '#f97316' };

export function SectionHeading({ title, description, children }) {
  return <header className="report-section-heading"><div><h2>{title}</h2>{description && <p>{description}</p>}</div>{children}</header>;
}

export function Donut({ title, entries, description }) {
  const total = entries.reduce((sum, entry) => sum + Number(entry.count ?? 0), 0);
  let offset = 0;
  return <section className="admin-panel donut-card">
    <SectionHeading title={title} description={description} />
    <div className="donut-card__body">
      <div className="donut-card__graphic" aria-hidden="true">
        <svg viewBox="0 0 120 120"><circle cx="60" cy="60" r="46" fill="none" stroke="#eef2f6" strokeWidth="12" />
          {entries.map((entry, index) => {
            const share = total ? Number(entry.count ?? 0) / total * 100 : 0;
            const segment = offset;
            offset += share;
            return share > 0 && <circle key={entry.label} cx="60" cy="60" r="46" fill="none"
              stroke={entry.color || ['#344b65', '#f97316', '#168466'][index % 3]} strokeWidth="12" pathLength="100"
              strokeDasharray={`${share} ${100 - share}`} strokeDashoffset={-segment} transform="rotate(-90 60 60)" />;
          })}
        </svg>
        <div><strong>{number.format(total)}</strong><span>tổng số đơn</span></div>
      </div>
      <ul className="donut-card__legend" aria-label={title}>
        {entries.map((entry, index) => <li key={entry.label} data-empty={!Number(entry.count) || undefined}>
          <span><i style={{ backgroundColor: entry.color || ['#344b65', '#f97316', '#168466'][index % 3] }} aria-hidden="true" />{entry.label}</span>
          <strong>{number.format(entry.count ?? 0)}</strong><small>{total ? percent.format(entry.count / total * 100) : '0'}%</small>
        </li>)}
      </ul>
    </div>
    {!total && <p className="report-empty-note">Chưa có đơn hàng trong kỳ đã chọn.</p>}
  </section>;
}

export function Breakdown({ report }) {
  return <div className="admin-grid report-breakdowns">
    <Donut title="Trạng thái đơn hàng" description="Phân bổ theo trạng thái hiện tại của đơn tạo trong kỳ."
      entries={Object.entries(ORDER_STATUS).map(([key, meta]) => ({ label: meta.label, color: STATUS_COLORS[key], count: report.statuses.find(row => row.status === key)?.count ?? 0 }))} />
    <Donut title="Phương thức thanh toán" description="Tính trên tất cả đơn, bao gồm đơn chưa thanh toán."
      entries={Object.entries(PAYMENT_METHOD).map(([key]) => ({ label: key === 'COD' ? 'Tiền mặt · COD' : 'Chuyển khoản · VietQR', color: METHOD_COLORS[key], count: report.paymentMethods.find(row => row.method === key)?.count ?? 0 }))} />
  </div>;
}

export function Ranking({ title, items = [], by = 'quantity', description, switchable = false }) {
  const [metric, setMetric] = useState(by);
  const ranked = [...items].sort((a, b) => Number(b[metric]) - Number(a[metric]));
  const max = Number(ranked[0]?.[metric] ?? 0);
  // Tỷ trọng trong nhóm đang hiển thị giúp so sánh nhanh mà không phải đọc từng con số lớn.
  const total = ranked.reduce((sum, item) => sum + Number(item[metric] ?? 0), 0);
  return <section className="admin-panel ranking-panel">
    <SectionHeading title={title} description={description} />
    {switchable && <div className="report-segmented" role="group" aria-label="Sắp xếp món nổi bật">
      <button type="button" aria-pressed={metric === 'quantity'} onClick={() => setMetric('quantity')}>Số phần bán</button>
      <button type="button" aria-pressed={metric === 'revenue'} onClick={() => setMetric('revenue')}>Doanh thu món</button>
    </div>}
    {ranked.length ? <ol className="report-ranking">{ranked.map((item, index) => <li key={item.itemId ?? item.id ?? item.name + index}>
      <span className="report-ranking__position">{String(index + 1).padStart(2, '0')}</span>
      <div className="report-ranking__item"><div><span>{item.name}{item.restaurantName && <small className="report-ranking__shop">{item.restaurantName}</small>}</span><strong>{metric === 'revenue' ? formatVND(item.revenue) : number.format(item.quantity) + ' phần'}</strong></div>
        <span className="dashboard-bar" aria-hidden="true"><span style={{ width: `${max ? Number(item[metric]) / max * 100 : 0}%` }} /></span>
        <small>
          {metric === 'quantity' ? item.revenue != null && <>{formatVND(item.revenue)} doanh thu món · </>
            : item.quantity != null ? <>{number.format(item.quantity)} phần đã bán · </>
              : item.orders != null && <>{number.format(item.orders)} đơn trong kỳ · </>}
          <span className="report-ranking__share">chiếm {total ? percent.format(Number(item[metric]) / total * 100) : '0,0'}% danh sách</span>
        </small>
      </div>
    </li>)}</ol> : <div className="report-empty"><UtensilsCrossed size={26} aria-hidden="true" /><strong>Chưa có món bán trong kỳ</strong><span>Chọn khoảng ngày khác để xem hiệu quả thực đơn.</span></div>}
  </section>;
}

export function ProductInsights({ report, partner }) {
  return <>
    <SectionHeading title="Hiệu quả thực đơn" description="Doanh thu và số phần chỉ tính trên đơn hoàn tất, đã thanh toán." />
    <div className="admin-grid report-products">
      <Ranking title="Món ăn nổi bật" items={report.topItems} switchable description="So sánh trong 10 món bán nhiều nhất của kỳ." />
      <Ranking title="Danh mục nổi bật" items={report.topCategories} by="revenue" description="10 danh mục bán nhiều nhất, sắp theo doanh thu món." />
    </div>
    <section className="admin-panel">
      <SectionHeading title="Món bán chậm" description="10 món bán ít nhất trong số món đã có đơn trong kỳ (chỉ món mở bán từ trước kỳ). Tỷ trọng trong quán: món chiếm bao nhiêu % số phần bán của chính quán đó." />
      {report.slowItems.length ? <Table headers={['Món ăn', 'Nhà hàng', 'Số phần đã bán', 'Doanh thu món', 'Tỷ trọng trong quán']} numeric={['Số phần đã bán', 'Doanh thu món', 'Tỷ trọng trong quán']} caption="Món bán chậm">
        {report.slowItems.map((item, index) => <tr key={item.itemId ?? item.name + index}>
          <td><strong>{item.name}</strong>{!Number(item.available) && <small className="report-unsold">Đang tạm hết</small>}</td><td>{item.restaurantName}</td>
          <td data-numeric>{number.format(item.quantity)} phần<small>{number.format(item.orders ?? 0)} đơn</small></td>
          <td data-numeric>{formatVND(item.revenue)}</td>
          <td data-numeric>{item.restaurantShare == null ? '—' : percent.format(Number(item.restaurantShare)) + '%'}</td></tr>)}
      </Table> : <p className="report-empty-note">Chưa có món nào bán được trong kỳ báo cáo này.</p>}
    </section>
    <details className="admin-panel report-unsold-panel">
      <summary><strong>Món chưa có đơn trong kỳ</strong><span className="tab-count" data-urgent={Number(report.unsoldCount) > 0 || undefined}>{number.format(report.unsoldCount ?? 0)}</span></summary>
      <p className="muted">Món đang hiển thị, mở bán từ trước kỳ nhưng chưa có đơn hoàn tất nào trong kỳ. Tách riêng khỏi danh sách bán chậm để không làm lệch so sánh.</p>
      {report.unsoldItems?.length ? <Table headers={['Món ăn', 'Nhà hàng', 'Giá bán', 'Trạng thái']} numeric={['Giá bán']} caption="Món chưa có đơn trong kỳ">
        {report.unsoldItems.map(item => <tr key={item.itemId}><td><strong>{item.name}</strong></td><td>{item.restaurantName}</td><td data-numeric>{formatVND(item.price)}</td>
          <td>{Number(item.available) ? <Badge tone="warning">Còn bán · chưa có đơn</Badge> : <Badge>Đang tạm hết</Badge>}</td></tr>)}
      </Table> : <p className="report-empty-note">Tất cả món đang bán đều đã có đơn trong kỳ.</p>}
      {Number(report.unsoldCount) > (report.unsoldItems?.length ?? 0) && <p className="muted">Hiển thị {number.format(report.unsoldItems.length)} / {number.format(report.unsoldCount)} món.</p>}
    </details>
  </>;
}

export function Settlement({ report }) {
  return <section className="admin-panel report-settlement">
    <SectionHeading title="Cơ cấu tổng thu" description="Các đơn được tạo trong kỳ, hiện đã hoàn tất và thanh toán." />
    <dl className="report-money-equation">
      <div><dt>Doanh thu món</dt><dd>{formatVND(report.current.revenue)}</dd><small>Không gồm phí giao hàng</small></div>
      <span aria-hidden="true">+</span>
      <div><dt>Phí giao hàng</dt><dd>{formatVND(report.current.deliveryFees)}</dd><small>Của cùng các đơn đủ điều kiện</small></div>
      <span aria-hidden="true">=</span>
      <div className="report-money-equation__total"><dt>Tổng thu đơn đã trả</dt><dd>{formatVND(report.current.receipts)}</dd><small>Gồm doanh thu món và phí giao</small></div>
    </dl>
    <div className="report-payment-states"><h3>Trạng thái thanh toán <span>· Tất cả đơn trong kỳ</span></h3><ul>
      {Object.entries(PAYMENT_STATUS).map(([key, meta]) => <li key={key}><span className={`report-payment-dot report-payment-dot--${meta.tone}`} aria-hidden="true" /><span>{meta.label}</span><strong>{number.format(report.payments.find(row => row.status === key)?.count ?? 0)} <small>đơn</small></strong></li>)}
    </ul></div>
  </section>;
}

export function ReportHighlights({ report, onView }) {
  const best = report.topItems[0];
  const paid = report.current.completed;
  return <section className="report-highlights" aria-label="Điểm nổi bật trong kỳ">
    <div><span className="report-highlights__icon"><CheckCircle2 size={20} /></span><div><span>Hoàn tất & đã thanh toán</span><strong>{number.format(paid)} đơn</strong></div><button type="button" onClick={() => onView('orders')} aria-label="Xem phân tích đơn hàng"><ArrowRight size={20} /></button></div>
    <div><span className="report-highlights__icon"><Banknote size={20} /></span><div><span>Tổng thu gồm phí giao</span><strong>{formatVND(report.current.receipts)}</strong></div><button type="button" onClick={() => onView('orders')} aria-label="Xem cơ cấu tổng thu"><ArrowRight size={20} /></button></div>
    <div><span className="report-highlights__icon"><UtensilsCrossed size={20} /></span><div><span>Món bán nhiều nhất</span><strong className="report-highlights__dish">{best?.name || 'Chưa có món bán trong kỳ'}</strong>{best && <small>{number.format(best.quantity)} phần đã bán</small>}</div><button type="button" onClick={() => onView('products')} aria-label="Xem hiệu quả thực đơn"><ArrowRight size={20} /></button></div>
  </section>;
}

export function PeriodTable({ report, displayDate }) {
  return <details className="admin-panel report-period-table"><summary>Số liệu chi tiết theo kỳ <span>{number.format(report.series.length)} kỳ</span></summary>
    <p className="muted">Theo ngày tạo đơn. Doanh thu món tính trên đơn hoàn tất và đã thanh toán.</p>
    <Table headers={['Đầu kỳ', 'Số đơn', 'Doanh thu món']} numeric={['Số đơn', 'Doanh thu món']} caption="Số liệu chi tiết theo kỳ">
      {report.series.map(row => <tr key={row.period}><td>{displayDate(row.period)}</td><td data-numeric>{formatChartValue(toChartUnits(row.orders, false), false)}</td><td data-numeric>{formatChartValue(toChartUnits(row.revenue, true), true)}</td></tr>)}
    </Table>
  </details>;
}

export function RecentOrders({ report, area }) {
  return <section className="admin-panel report-recent">
    <SectionHeading title="Đơn hàng gần đây" description="8 đơn mới nhất được tạo trong kỳ báo cáo.">
      <Link className="admin-link" to={area === 'partner' ? '/partner/orders' : '/admin/orders'}>Quản lý đơn hàng <ArrowRight size={16} aria-hidden="true" /></Link>
    </SectionHeading>
    {report.latest.length ? <OrderTable items={report.latest} area={area} /> : <div className="report-empty"><ShoppingBag size={26} aria-hidden="true" /><strong>Chưa có đơn hàng trong kỳ</strong><span>Thử chọn một khoảng thời gian khác.</span></div>}
  </section>;
}

export function ReportGuide({ partner }) {
  return <details className="report-guide"><summary><Info size={17} aria-hidden="true" /> Cách đọc báo cáo</summary><div>
    <p><strong>Phạm vi thời gian:</strong> tính theo ngày tạo đơn, theo giờ Việt Nam. Trạng thái đơn và thanh toán là trạng thái tại thời điểm tải báo cáo.</p>
    <p><strong>Doanh thu món:</strong> tiền món của đơn hoàn tất và đã thanh toán. Tổng thu đơn đã trả bao gồm thêm phí giao hàng; đây không phải lợi nhuận hay số tiền đối tác được quyết toán.</p>
    <p><strong>Giá trị đơn trung bình:</strong> tổng thu gồm phí giao chia cho số đơn hoàn tất và đã thanh toán. Tỷ lệ hủy / từ chối tính trên tất cả đơn tạo trong kỳ.</p>
    <p><strong>Khách hàng:</strong> {partner ? 'khách đặt trong kỳ là số khách riêng biệt có đơn trong phạm vi quán đã chọn.' : 'khách hàng mới là số tài khoản khách được tạo trong kỳ.'} Tổng khách hàng là số hiện có, không giới hạn bởi bộ lọc ngày.</p>
    <p><strong>So sánh:</strong> kỳ liền trước có cùng số ngày. Khi kỳ trước bằng 0, báo cáo hiển thị giá trị kỳ trước thay vì tỷ lệ tăng không xác định. Chênh lệch tỷ lệ hủy được tính bằng điểm phần trăm.</p>
  </div></details>;
}
