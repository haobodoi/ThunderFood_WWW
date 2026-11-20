import { parseDay } from './statisticsChart.js';

const DAY = 86400000;
const MIN_DAY = parseDay('1800-01-01');
const MAX_DAY = parseDay('2200-12-31');

// Match the report API, including its equally long comparison period.
export function reportRangeError({ from, to }) {
  const start = parseDay(from), end = parseDay(to);
  if (start === null || end === null) return 'Vui lòng nhập đầy đủ ngày bắt đầu và ngày kết thúc hợp lệ.';
  if (start < MIN_DAY || end > MAX_DAY) return 'Chọn ngày trong khoảng năm 1800–2200.';
  if (end < start) return 'Ngày kết thúc phải bằng hoặc sau ngày bắt đầu.';
  const days = (end - start) / DAY + 1;
  if (days > 1096) return 'Mỗi báo cáo tối đa 1.096 ngày. Hãy rút ngắn khoảng thời gian.';
  if (start - days * DAY < MIN_DAY) return 'Kỳ so sánh trước đó phải nằm từ năm 1800 trở đi. Hãy chọn ngày bắt đầu muộn hơn.';
  return '';
}
