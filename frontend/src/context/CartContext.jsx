import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { useAuth } from './AuthContext.jsx';
import { cartApi } from '../api/customerApi.js';
import { getErrorMessage } from '../api/baseApi.js';

const CartContext = createContext(null);
export function CartProvider({ children }) {
  const { user } = useAuth();
  const identity = user?.role === 'CUSTOMER' ? user.id : null;
  const actor = useRef(identity); actor.current = identity;
  const [snapshot, setSnapshot] = useState({ owner: null, carts: [] });
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const lock = useRef(false);
  const sequence = useRef(0);
  const channel = useRef(null);
  const refresh = useCallback(async () => {
    const owner = identity;
    const request = ++sequence.current;
    if (!owner) { setSnapshot({ owner: null, carts: [] }); setError(''); setLoading(false); return; }
    setLoading(true);
    try {
      const carts = await cartApi.list();
      if (actor.current === owner && request === sequence.current) { setSnapshot({ owner, carts }); setError(''); }
    } catch (err) {
      if (actor.current === owner && request === sequence.current) {
        setSnapshot(previous => previous.owner === owner ? previous : { owner, carts: [] });
        setError(getErrorMessage(err));
      }
    } finally { if (actor.current === owner && request === sequence.current) setLoading(false); }
  }, [identity]);
  useEffect(() => { refresh(); }, [refresh]);
  useEffect(() => {
    const focus = () => { if (!lock.current) refresh(); };
    window.addEventListener('focus', focus);
    if ('BroadcastChannel' in window) {
      channel.current = new BroadcastChannel('thunderfood-cart');
      channel.current.onmessage = focus;
    }
    return () => { window.removeEventListener('focus', focus); channel.current?.close(); channel.current = null; };
  }, [refresh]);
  const carts = snapshot.owner === identity ? snapshot.carts : [];
  const mutate = async operation => {
    if (!identity) throw new Error('Vui lòng đăng nhập bằng tài khoản khách hàng.');
    if (lock.current || loading || error || snapshot.owner !== identity) throw new Error('Giỏ chưa đồng bộ. Vui lòng tải lại giỏ và thử lại.');
    const owner = identity;
    lock.current = true; setBusy(true); setError(''); ++sequence.current;
    try {
      const cart = await operation();
      if (actor.current === owner) setSnapshot(previous => ({ owner, carts: [...previous.carts.filter(c => c.cart_id !== cart.cart_id), cart] }));
      channel.current?.postMessage('changed');
      return cart;
    } catch (err) {
      if (actor.current === owner) { await refresh(); setError(getErrorMessage(err, err.message)); }
      throw err;
    } finally { lock.current = false; setBusy(false); }
  };
  const find = restaurant => carts.find(c => String(c.restaurant_id) === String(restaurant));
  return <CartContext.Provider value={{ carts, loading: loading || (Boolean(identity) && snapshot.owner !== identity), busy, error, refresh,
    count: carts.reduce((n, c) => n + Number(c.quantity), 0), find,
    add: (item, quantity, note = '') => mutate(() => cartApi.add({ itemId: item.id, quantity, note, version: find(item.restaurantId)?.version ?? 0 })),
    change: (cart, line, quantity, note) => mutate(() => cartApi.change(cart.cart_id, line.cart_item_id, { quantity, note, version: cart.version })),
    remove: (cart, line) => mutate(() => cartApi.remove(cart.cart_id, line.cart_item_id, cart.version)),
    clear: cart => mutate(() => cartApi.clear(cart.cart_id, cart.version)),
  }}>{children}</CartContext.Provider>;
}
export function useCart() { return useContext(CartContext); }
