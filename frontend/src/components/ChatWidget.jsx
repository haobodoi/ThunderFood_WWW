import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useCart } from '../context/CartContext.jsx';
import { ROLES } from '../utils/roleUtils.js';
import { aiApi } from '../api/aiApi.js';
import { getErrorMessage } from '../api/baseApi.js';
import ChatMarkdown from './ChatMarkdown.jsx';

const SUGGESTIONS = [
  { label: '🍚 Quán cơm gần tôi', text: 'Gợi ý vài quán cơm đang mở gần tôi' },
  { label: '🔥 Món hot hôm nay', text: 'Hôm nay món nào được đặt nhiều nhất?' },
  { label: '💸 Món dưới 50.000đ', text: 'Gợi ý vài món ngon giá dưới 50.000đ' },
  { label: '🛒 Giỏ hàng của tôi', text: 'Giỏ hàng của tôi đang có gì?' },
  { label: '📦 Đơn gần đây', text: 'Đơn hàng gần đây của tôi thế nào rồi?' },
  { label: '📄 Chính sách hủy đơn', text: 'Tôi có được hủy đơn sau khi đã thanh toán không?' },
];

const CAPABILITIES = [
  'Tìm quán, món theo tên, khu vực, ngân sách',
  'Gợi ý món được đặt nhiều hôm nay',
  'Thêm món vào giỏ hoặc đặt ngay chỉ với một nút bấm',
  'Xem giỏ hàng và đơn gần đây',
  'Giải đáp chính sách hủy đơn, thanh toán, hoàn tiền',
];

const POSITION_KEY = 'tf-chat-position';
const EXPANDED_KEY = 'tf-chat-expanded';
const DEFAULT_POSITION = { right: 24, bottom: 24 };
const EDGE = 8;

function readStore(key, fallback) {
  try { const v = window.localStorage.getItem(key); return v == null ? fallback : JSON.parse(v); } catch { return fallback; }
}
function writeStore(key, value) {
  try { window.localStorage.setItem(key, JSON.stringify(value)); } catch { /* trình duyệt chặn lưu trữ: bỏ qua */ }
}
const money = value => `${new Intl.NumberFormat('vi-VN').format(Number(value ?? 0))}đ`;

function useIsMobile() {
  const query = '(max-width: 480px)';
  const [mobile, setMobile] = useState(() => typeof window !== 'undefined' && window.matchMedia(query).matches);
  useEffect(() => {
    const mq = window.matchMedia(query);
    const onChange = () => setMobile(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);
  return mobile;
}

function BotIcon({ size = 22 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 4v2.5" />
      <circle cx="12" cy="3" r="1.2" fill="currentColor" stroke="none" />
      <rect x="4" y="6.5" width="16" height="12" rx="4" />
      <circle cx="9" cy="12.5" r="1.5" fill="currentColor" stroke="none" />
      <circle cx="15" cy="12.5" r="1.5" fill="currentColor" stroke="none" />
      <path d="M9.5 15.8h5" />
      <path d="M2 11.5v3M22 11.5v3" />
    </svg>
  );
}
function Icon({ d, size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{d}</svg>
  );
}
const CloseIcon = props => <Icon {...props} d={<path d="M18 6 6 18M6 6l12 12" />} />;
const ResetIcon = props => <Icon {...props} d={<><path d="M3 12a9 9 0 1 0 3-6.7L3 8" /><path d="M3 3v5h5" /></>} />;
const SendIcon = props => <Icon {...props} d={<><path d="m22 2-7 20-4-9-9-4z" /><path d="M22 2 11 13" /></>} />;
const ExpandIcon = props => <Icon {...props} d={<><path d="M15 3h6v6" /><path d="M9 21H3v-6" /><path d="M21 3l-7 7" /><path d="M3 21l7-7" /></>} />;
const ShrinkIcon = props => <Icon {...props} d={<><path d="M4 14h6v6" /><path d="M20 10h-6V4" /><path d="M14 10l7-7" /><path d="M3 21l7-7" /></>} />;

function BotAvatar({ small = false }) {
  return (
    <span className={`tf-chat__avatar${small ? ' tf-chat__avatar--sm' : ''}`} aria-hidden="true">
      <BotIcon size={small ? 16 : 22} />
      {!small && <span className="tf-chat__status-dot" />}
    </span>
  );
}

function RestaurantCards({ items }) {
  return (
    <div className="tf-chat__cards">
      {items.map(r => (
        <Link key={r.restaurantId} to={`/restaurants/${r.restaurantId}`} className="tf-chat__card">
          <div className="tf-chat__card-media">
            {r.image ? <img src={r.image} alt="" loading="lazy" /> : <span aria-hidden="true">🍽️</span>}
            <span className={`tf-chat__open${r.openNow ? ' is-open' : ''}`}>{r.openNow ? 'Đang mở' : 'Đã đóng'}</span>
          </div>
          <div className="tf-chat__card-body">
            <strong className="tf-chat__card-title">{r.name}</strong>
            {r.specialty && <span className="tf-chat__card-sub">{r.specialty}</span>}
            <span className="tf-chat__card-meta">Phí giao {money(r.deliveryFee)}</span>
            <span className="tf-chat__card-cta">Xem quán →</span>
          </div>
        </Link>
      ))}
    </div>
  );
}

function DishCards({ items, pendingId, onAdd }) {
  return (
    <div className="tf-chat__cards">
      {items.map(d => {
        const disabled = pendingId != null || !d.restaurantOpenNow;
        return (
          <div key={d.itemId} className="tf-chat__card">
            <div className="tf-chat__card-media">
              {d.image ? <img src={d.image} alt="" loading="lazy" /> : <span aria-hidden="true">🍲</span>}
            </div>
            <div className="tf-chat__card-body">
              <strong className="tf-chat__card-title">{d.name}</strong>
              <span className="tf-chat__card-price">{money(d.price)}</span>
              <Link className="tf-chat__card-sub tf-chat__card-shop" to={`/restaurants/${d.restaurantId}`}>{d.restaurantName}</Link>
              {d.restaurantOpenNow ? (
                <div className="tf-chat__card-actions">
                  <button type="button" className="tf-chat__card-btn" disabled={disabled} onClick={() => onAdd(d, false)}>
                    {pendingId === d.itemId ? '…' : 'Thêm vào giỏ'}
                  </button>
                  <button type="button" className="tf-chat__card-btn tf-chat__card-btn--primary" disabled={disabled} onClick={() => onAdd(d, true)}>
                    Đặt ngay
                  </button>
                </div>
              ) : (
                <span className="tf-chat__card-closed">Quán đang đóng cửa</span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/** Trợ lý ảo nổi: kéo thả được, phóng to/thu nhỏ, hiện thẻ quán và món để bấm xem quán, thêm vào giỏ hoặc đặt ngay. */
export default function ChatWidget() {
  const { user, initializing } = useAuth();
  const cart = useCart();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState(() => readStore(EXPANDED_KEY, false) === true);
  const [position, setPosition] = useState(() => {
    const saved = readStore(POSITION_KEY, DEFAULT_POSITION);
    return Number.isFinite(saved?.right) && Number.isFinite(saved?.bottom) ? saved : DEFAULT_POSITION;
  });
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [pendingDish, setPendingDish] = useState(null);
  const [error, setError] = useState('');
  const containerRef = useRef(null);
  const inputRef = useRef(null);
  const bodyRef = useRef(null);
  const drag = useRef(null);
  const suppressClick = useRef(false);
  const isCustomer = user?.role === ROLES.CUSTOMER;
  const userKey = user?.id ?? null;

  // Giữ khung chat luôn nằm trong màn hình.
  const clamp = useCallback(p => {
    const el = containerRef.current;
    if (!el) return p;
    const { width, height } = el.getBoundingClientRect();
    const maxRight = Math.max(EDGE, window.innerWidth - width - EDGE);
    const maxBottom = Math.max(EDGE, window.innerHeight - height - EDGE);
    return {
      right: Math.round(Math.min(Math.max(p.right, EDGE), maxRight)),
      bottom: Math.round(Math.min(Math.max(p.bottom, EDGE), maxBottom)),
    };
  }, []);

  useLayoutEffect(() => {
    if (isMobile) return;
    setPosition(p => { const c = clamp(p); return c.right === p.right && c.bottom === p.bottom ? p : c; });
  }, [open, expanded, isMobile, clamp, messages.length]);

  useEffect(() => {
    const onResize = () => setPosition(p => clamp(p));
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [clamp]);

  useEffect(() => {
    if (open && isCustomer) inputRef.current?.focus();
  }, [open, isCustomer]);

  useEffect(() => {
    const el = bodyRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, busy, open, error]);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = e => { if (e.key === 'Escape') setOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  // Đổi tài khoản hoặc tải lại trang: bắt đầu hội thoại mới cả ở giao diện lẫn bộ nhớ phía server.
  useEffect(() => {
    setMessages([]);
    setError('');
    if (isCustomer) aiApi.resetAssistant().catch(() => {});
  }, [userKey, isCustomer]);

  // Trang hỏi đáp đầy đủ đã có khung chat riêng.
  if (initializing || pathname === '/customer/assistant') return null;

  function startDrag(e) {
    if (isMobile || e.button !== 0) return;
    const onControl = e.target.closest('button, a, input');
    if (onControl && !e.target.closest('.tf-chat__toggle')) return;
    drag.current = { x: e.clientX, y: e.clientY, start: position, last: position, moved: false, id: e.pointerId };
    e.currentTarget.setPointerCapture?.(e.pointerId);
  }
  function moveDrag(e) {
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    const dx = e.clientX - d.x;
    const dy = e.clientY - d.y;
    if (!d.moved && Math.abs(dx) + Math.abs(dy) < 5) return;
    d.moved = true;
    d.last = clamp({ right: d.start.right - dx, bottom: d.start.bottom - dy });
    setPosition(d.last);
  }
  function endDrag(e) {
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    drag.current = null;
    if (d.moved) {
      suppressClick.current = true;
      writeStore(POSITION_KEY, d.last);
    }
  }
  function resetPosition() {
    setPosition(DEFAULT_POSITION);
    writeStore(POSITION_KEY, DEFAULT_POSITION);
  }
  const dragHandlers = { onPointerDown: startDrag, onPointerMove: moveDrag, onPointerUp: endDrag, onPointerCancel: endDrag };

  function toggleOpen() {
    if (suppressClick.current) { suppressClick.current = false; return; }
    setOpen(v => !v);
  }
  function toggleExpanded() {
    setExpanded(v => { writeStore(EXPANDED_KEY, !v); return !v; });
  }

  async function ask(text) {
    const message = text.trim();
    if (!message || busy) return;
    setMessages(list => [...list, { role: 'user', text: message }]);
    setInput('');
    setBusy(true);
    setError('');
    try {
      const res = await aiApi.assistantChat(message);
      setMessages(list => [...list, {
        role: 'assistant', text: res.answer, sources: res.sources,
        restaurants: res.restaurants ?? [], dishes: res.dishes ?? [],
      }]);
      if (res.cartUpdated) cart?.refresh?.();
    } catch (err) {
      setError(getErrorMessage(err, 'Trợ lý chưa trả lời được lúc này, vui lòng thử lại.'));
    } finally {
      setBusy(false);
      inputRef.current?.focus();
    }
  }

  // Bấm trên thẻ món: thêm 1 phần vào giỏ; "Đặt ngay" chuyển thẳng tới trang thanh toán của giỏ quán đó.
  async function addDish(dish, checkout) {
    if (!cart?.add || pendingDish != null) return;
    setPendingDish(dish.itemId);
    setError('');
    try {
      const updated = await cart.add({ id: dish.itemId, restaurantId: dish.restaurantId }, 1);
      if (checkout) {
        setOpen(false);
        navigate(`/customer/checkout/${updated.cartId}`);
      } else {
        setMessages(list => [...list, { role: 'notice', text: `Đã thêm 1 phần ${dish.name} vào giỏ hàng.` }]);
      }
    } catch (err) {
      setError(getErrorMessage(err, err?.message || 'Chưa thêm được món, vui lòng thử lại.'));
    } finally {
      setPendingDish(null);
    }
  }

  async function resetConversation() {
    if (busy) return;
    setMessages([]);
    setError('');
    try { await aiApi.resetAssistant(); } catch { /* bỏ qua: hội thoại mới vẫn hiển thị trống */ }
  }

  const greeting = user?.fullName ? `Xin chào ${user.fullName}!` : 'Xin chào!';
  const style = isMobile ? undefined : { right: position.right, bottom: position.bottom };

  return (
    <div className="tf-chat" ref={containerRef} style={style}>
      {open && (
        <section id="tf-chat-panel" className={`tf-chat__panel${expanded ? ' tf-chat__panel--expanded' : ''}`}
          role="dialog" aria-label="Trợ lý ảo ThunderFood">
          <header className="tf-chat__header" {...dragHandlers} onDoubleClick={resetPosition}
            title={isMobile ? undefined : 'Kéo để di chuyển · nhấp đúp để về góc phải'}>
            <BotAvatar />
            <div className="tf-chat__heading">
              <p className="tf-chat__title">Trợ lý ảo ThunderFood</p>
              <span className="tf-chat__auto">Tự động · AI</span>
            </div>
            <div className="tf-chat__header-actions">
              {isCustomer && (
                <button type="button" className="tf-chat__icon-btn" onClick={resetConversation}
                  aria-label="Bắt đầu cuộc trò chuyện mới" title="Cuộc trò chuyện mới" disabled={busy}>
                  <ResetIcon />
                </button>
              )}
              {!isMobile && (
                <button type="button" className="tf-chat__icon-btn" onClick={toggleExpanded}
                  aria-label={expanded ? 'Thu nhỏ khung chat' : 'Phóng to khung chat'} title={expanded ? 'Thu nhỏ' : 'Phóng to'}>
                  {expanded ? <ShrinkIcon /> : <ExpandIcon />}
                </button>
              )}
              <button type="button" className="tf-chat__icon-btn" onClick={() => setOpen(false)} aria-label="Đóng trợ lý" title="Đóng">
                <CloseIcon />
              </button>
            </div>
          </header>

          <div className="tf-chat__body" ref={bodyRef} aria-live="polite">
            <div className="tf-chat__row">
              <BotAvatar small />
              <div className="tf-chat__intro">
                <p><strong>{greeting}</strong> Mình là trợ lý tự động của ThunderFood, trả lời bằng AI.</p>
                {isCustomer ? (
                  <>
                    <p>Mình có thể giúp bạn:</p>
                    <ul>{CAPABILITIES.map(c => <li key={c}>{c}</li>)}</ul>
                  </>
                ) : user ? (
                  <p>Trợ lý ảo hiện chỉ dành cho tài khoản khách hàng.</p>
                ) : (
                  <>
                    <p>Đăng nhập tài khoản khách hàng để mình tìm quán, gợi ý món và đặt món giúp bạn.</p>
                    <Link className="btn btn--primary tf-chat__login" to="/login" onClick={() => setOpen(false)}>Đăng nhập</Link>
                  </>
                )}
              </div>
            </div>

            {isCustomer && messages.length === 0 && (
              <div className="tf-chat__chips">
                {SUGGESTIONS.map(s => (
                  <button key={s.label} type="button" className="tf-chat__chip" onClick={() => ask(s.text)} disabled={busy}>
                    {s.label}
                  </button>
                ))}
              </div>
            )}

            {messages.map((m, i) => {
              if (m.role === 'notice') {
                return (
                  <p key={i} className="tf-chat__notice">
                    ✓ {m.text} <Link to="/customer/cart">Xem giỏ hàng</Link>
                  </p>
                );
              }
              return (
                <div key={i} className="tf-chat__group">
                  <div className={`tf-chat__row tf-chat__row--${m.role}`}>
                    {m.role === 'assistant' && <BotAvatar small />}
                    <div className={`tf-chat__msg tf-chat__msg--${m.role}`}>
                      {m.role === 'assistant' ? <ChatMarkdown text={m.text} /> : <p>{m.text}</p>}
                      {m.sources?.length > 0 && (
                        <small className="tf-chat__sources">
                          Tham khảo: {m.sources.map(f => String(f).replace(/\.md$/, '').replace(/-/g, ' ')).join(', ')}
                        </small>
                      )}
                    </div>
                  </div>
                  {m.restaurants?.length > 0 && (
                    <div className="tf-chat__attachments">
                      <p className="tf-chat__attach-label">Quán gợi ý · bấm để xem quán</p>
                      <RestaurantCards items={m.restaurants} />
                    </div>
                  )}
                  {m.dishes?.length > 0 && (
                    <div className="tf-chat__attachments">
                      <p className="tf-chat__attach-label">Món gợi ý · thêm vào giỏ hoặc đặt ngay</p>
                      <DishCards items={m.dishes} pendingId={pendingDish} onAdd={addDish} />
                    </div>
                  )}
                </div>
              );
            })}

            {busy && (
              <div className="tf-chat__row" role="status" aria-label="Trợ lý đang trả lời">
                <BotAvatar small />
                <div className="tf-chat__msg tf-chat__msg--assistant tf-chat__typing"><span /><span /><span /></div>
              </div>
            )}
            {error && <p role="alert" className="tf-chat__error">{error}</p>}
          </div>

          {isCustomer && (
            <footer className="tf-chat__footer">
              <form className="tf-chat__form" onSubmit={e => { e.preventDefault(); ask(input); }}>
                <input
                  ref={inputRef}
                  value={input}
                  maxLength={500}
                  aria-label="Tin nhắn cho trợ lý"
                  placeholder="Hỏi về món ăn, quán, giỏ hàng…"
                  onChange={e => setInput(e.target.value)}
                />
                <button className="tf-chat__send" disabled={busy || !input.trim()} aria-label="Gửi">
                  <SendIcon />
                </button>
              </form>
              <p className="tf-chat__disclaimer">Trả lời tự động bởi AI, có thể chưa chính xác. Hãy kiểm tra giỏ hàng trước khi đặt.</p>
            </footer>
          )}
        </section>
      )}

      <div className="tf-chat__launcher">
        {!open && <span className="tf-chat__hint">Hỏi trợ lý AI</span>}
        <button
          type="button"
          className={`tf-chat__toggle${open ? ' is-open' : ''}`}
          {...dragHandlers}
          onClick={toggleOpen}
          aria-expanded={open}
          aria-controls="tf-chat-panel"
          aria-label={open ? 'Đóng trợ lý ảo' : 'Mở trợ lý ảo'}
          title={isMobile ? undefined : 'Bấm để mở · kéo để di chuyển'}
        >
          {open ? <CloseIcon size={24} /> : <BotIcon size={30} />}
          {!open && <span className="tf-chat__badge">AI</span>}
        </button>
      </div>
    </div>
  );
}
