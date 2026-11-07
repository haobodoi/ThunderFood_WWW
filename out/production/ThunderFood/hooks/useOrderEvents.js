import { useEffect, useRef, useState } from 'react';

const RETRY_MS = 5000;
// EventSource kết nối lại định kỳ; chỉ báo mất kết nối khi đứt đủ lâu để khỏi nhấp nháy.
const OFFLINE_AFTER_MS = 5000;

/**
 * Lắng nghe đơn hàng đổi trạng thái. Gọi onChange(event) khi có sự kiện, và onChange(null) mỗi khi
 * vừa kết nối lại để bù các sự kiện bị lỡ. Trả về null lúc đang kết nối lần đầu, sau đó true/false.
 */
export function useOrderEvents(area, onChange) {
  const [live, setLive] = useState(null);
  const latest = useRef(onChange);
  latest.current = onChange;

  useEffect(() => {
    let source;
    let retry;
    let offline;
    const connect = () => {
      source = new EventSource(`/api/${area}/orders/events`);
      source.onopen = () => {
        window.clearTimeout(offline);
        offline = undefined;
        setLive(true);
        latest.current(null);
      };
      source.addEventListener('order', message => latest.current(JSON.parse(message.data)));
      source.onerror = () => {
        if (!offline) offline = window.setTimeout(() => setLive(false), OFFLINE_AFTER_MS);
        if (source.readyState !== EventSource.CLOSED) return;
        // Trình duyệt không tự thử lại khi server trả lỗi; tải lại qua API để nếu hết phiên thì app đưa về đăng nhập.
        latest.current(null);
        retry = window.setTimeout(connect, RETRY_MS);
      };
    };
    connect();
    return () => {
      source.close();
      window.clearTimeout(retry);
      window.clearTimeout(offline);
    };
  }, [area]);

  return live;
}
