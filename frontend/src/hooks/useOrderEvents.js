import { useEffect, useRef, useState } from 'react';

const OFFLINE_AFTER_MS = 5000;
const POLL_INTERVAL_MS = 15000;
const RECONNECT_MIN_MS = 15000;
const RECONNECT_MAX_MS = 60000;

/**
 * Gọi onChange(event) khi đơn thay đổi và onChange(null) khi cần đồng bộ lại.
 * Nếu mất kết nối lâu, tải định kỳ cho đến khi khôi phục được luồng SSE.
 */
export function useOrderEvents(area, onChange) {
  const [live, setLive] = useState(null);
  const latest = useRef(onChange);
  latest.current = onChange;

  useEffect(() => {
    let source;
    let reconnect;
    let offline;
    let polling;
    let retryDelay = RECONNECT_MIN_MS;
    const refresh = () => latest.current(null);

    const stopPolling = () => {
      window.clearTimeout(offline);
      window.clearInterval(polling);
      offline = undefined;
      polling = undefined;
    };

    const startPollingAfterDelay = () => {
      if (offline !== undefined || polling !== undefined) return;
      offline = window.setTimeout(() => {
        offline = undefined;
        setLive(false);
        refresh();
        polling = window.setInterval(refresh, POLL_INTERVAL_MS);
      }, OFFLINE_AFTER_MS);
    };

    const connect = () => {
      reconnect = undefined;
      source = new EventSource(`/api/${area}/orders/events`);
      source.onopen = () => {
        stopPolling();
        retryDelay = RECONNECT_MIN_MS;
        setLive(true);
        refresh();
      };
      source.addEventListener('order', message => latest.current(JSON.parse(message.data)));
      source.onerror = () => {
        startPollingAfterDelay();
        // Khi server từ chối luồng mới, EventSource ngừng thử. Giãn lần thử tiếp theo để đợi có chỗ trống.
        if (source.readyState !== EventSource.CLOSED || reconnect !== undefined) return;
        source.close();
        reconnect = window.setTimeout(connect, retryDelay);
        retryDelay = Math.min(RECONNECT_MAX_MS, retryDelay * 2);
      };
    };

    connect();
    return () => {
      source.close();
      window.clearTimeout(reconnect);
      stopPolling();
    };
  }, [area]);

  return live;
}
