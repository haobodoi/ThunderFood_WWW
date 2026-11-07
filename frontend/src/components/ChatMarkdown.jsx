import { Fragment } from 'react';
import { Link } from 'react-router-dom';

// Đường dẫn nội bộ mà trợ lý được phép nhắc tới; hiển thị thành nút bấm.
const LINK = /(\/restaurants\/\d+|\/customer\/cart|\/customer\/orders(?:\/\d+)?)/g;

function linkLabel(path) {
  if (path.startsWith('/restaurants/')) return 'Xem quán';
  if (path === '/customer/cart') return 'Mở giỏ hàng';
  return 'Xem đơn hàng';
}

function links(text, key) {
  return text.split(LINK).map((part, i) => {
    if (i % 2 === 1) return <Link key={`${key}-l${i}`} className="tf-md__link" to={part}>{linkLabel(part)}</Link>;
    if (!part) return null;
    // Bỏ ký hiệu nghiêng và code còn sót, giữ lại chữ.
    const plain = part.replace(/`([^`]+)`/g, '$1').replace(/(^|[^*])\*([^*\n]+)\*/g, '$1$2');
    return <Fragment key={`${key}-t${i}`}>{plain}</Fragment>;
  });
}

function inline(text, key) {
  return String(text).split(/(\*\*[^*]+\*\*)/g).map((seg, i) => {
    if (/^\*\*[^*]+\*\*$/.test(seg)) return <strong key={`${key}-b${i}`}>{links(seg.slice(2, -2), `${key}-b${i}`)}</strong>;
    return <Fragment key={`${key}-s${i}`}>{links(seg, `${key}-s${i}`)}</Fragment>;
  });
}

function parse(text) {
  const blocks = [];
  let para = [];
  let list = null;
  const flushPara = () => { if (para.length) { blocks.push({ type: 'p', lines: para }); para = []; } };
  const flushList = () => { if (list) { blocks.push(list); list = null; } };

  // Model đôi khi tự bịa đường dẫn theo tên quán (/restaurants/ten-quan): bỏ đi, chỉ giữ đường dẫn có id số.
  const cleaned = String(text ?? '')
    .replace(/\s*\(\s*\/restaurants\/(?!\d+\s*\))[^)]*\)/g, '')
    .replace(/\/restaurants\/(?!\d)[^\s)]+/g, '');
  for (const raw of cleaned.replace(/\r\n/g, '\n').split('\n')) {
    const line = raw.trim();
    if (!line || /^-{3,}$/.test(line)) { flushPara(); flushList(); continue; }
    const bullet = line.match(/^[-*•]\s+(.*)$/);
    const ordered = line.match(/^(\d+)[.)]\s+(.*)$/);
    if (bullet || ordered) {
      flushPara();
      const type = ordered ? 'ol' : 'ul';
      if (!list || list.type !== type) { flushList(); list = { type, start: ordered ? Number(ordered[1]) : 1, items: [] }; }
      list.items.push(ordered ? ordered[2] : bullet[1]);
      continue;
    }
    flushList();
    const heading = line.match(/^#{1,6}\s+(.*)$/);
    if (heading) { flushPara(); blocks.push({ type: 'h', text: heading[1] }); continue; }
    para.push(line);
  }
  flushPara();
  flushList();
  return blocks;
}

/** Hiển thị câu trả lời của trợ lý: đoạn văn, chữ đậm, danh sách và nút liên kết nội bộ. */
export default function ChatMarkdown({ text }) {
  return (
    <div className="tf-md">
      {parse(text).map((b, i) => {
        if (b.type === 'ul') return <ul key={i}>{b.items.map((it, j) => <li key={j}>{inline(it, `${i}-${j}`)}</li>)}</ul>;
        if (b.type === 'ol') return <ol key={i} start={b.start}>{b.items.map((it, j) => <li key={j}>{inline(it, `${i}-${j}`)}</li>)}</ol>;
        if (b.type === 'h') return <p key={i} className="tf-md__heading">{inline(b.text, `${i}`)}</p>;
        return (
          <p key={i}>
            {b.lines.map((l, j) => <Fragment key={j}>{j > 0 && <br />}{inline(l, `${i}-${j}`)}</Fragment>)}
          </p>
        );
      })}
    </div>
  );
}
