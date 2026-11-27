import { useEffect, useRef, useState } from 'react';
import { aiApi, getAiErrorMessage } from '../../api/aiApi.js';
import Alert from '../../components/Alert.jsx';
import ChatMarkdown from '../../components/ChatMarkdown.jsx';

const sourceName = file => String(file).replace(/\.md$/, '').replace(/-/g, ' ');

const SAMPLES = [
  'Tôi có được hủy đơn sau khi đã thanh toán không?',
  'Bao lâu thì tôi được hoàn tiền?',
  'Phí giao hàng được tính thế nào?',
  'Giỏ hàng tối đa được bao nhiêu món?',
];

export default function PolicyChatPage() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [error, setError] = useState('');
  const [retryQuestion, setRetryQuestion] = useState('');
  const requestRef = useRef(null);

  useEffect(() => {
    if (!busy) return undefined;
    setElapsed(0);
    const started = Date.now();
    const timer = window.setInterval(() => setElapsed(Math.floor((Date.now() - started) / 1000)), 1000);
    return () => window.clearInterval(timer);
  }, [busy]);

  useEffect(() => () => requestRef.current?.abort(), []);

  // retry = true: hỏi lại câu vừa lỗi mà không thêm lại tin nhắn của khách.
  async function ask(text, retry = false) {
    const question = text.trim();
    if (!question || busy) return;
    if (!retry) {
      setMessages(list => [...list, { role: 'user', text: question }]);
      setInput('');
    }
    const controller = new AbortController();
    requestRef.current = controller;
    setBusy(true);
    setError('');
    setRetryQuestion('');
    try {
      const res = await aiApi.policyChat(question, controller.signal);
      setMessages(list => [...list, { role: 'assistant', text: res.answer, sources: res.sources }]);
    } catch (err) {
      setError(getAiErrorMessage(err, 'Chưa trả lời được lúc này, vui lòng thử lại.') ?? 'Đã dừng chờ câu trả lời.');
      setRetryQuestion(question);
    } finally {
      requestRef.current = null;
      setBusy(false);
    }
  }

  return (
    <div className="container commerce-page policy-chat-page">
      <h1>Hỏi về chính sách ThunderFood</h1>
      <p>Trợ lý trả lời dựa trên điều khoản, chính sách hủy và hoàn tiền, và câu hỏi thường gặp.</p>

      <section className="policy-chat" aria-live="polite">
        {messages.length === 0 && (
          <div className="policy-chat__samples">
            <p className="policy-chat__hint policy-chat__samples-label">Câu hỏi mẫu:</p>
            {SAMPLES.map(q => (
              <button key={q} type="button" className="policy-chat__sample" disabled={busy} onClick={() => ask(q)}>{q}</button>
            ))}
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`policy-chat__msg policy-chat__msg--${m.role}`}>
            {m.role === 'assistant' ? <ChatMarkdown text={m.text} /> : <p>{m.text}</p>}
            {m.sources?.length > 0 && (
              <small className="policy-chat__sources">Nguồn: {m.sources.map(sourceName).join(', ')}</small>
            )}
          </div>
        ))}
        {busy && (
          <div role="status" className="policy-chat__hint policy-chat__waiting">
            <span>Đang tìm câu trả lời…{elapsed >= 3 ? ` ${elapsed} giây` : ''}</span>
            <button type="button" className="btn btn--outline btn--sm" onClick={() => requestRef.current?.abort()}>Dừng</button>
          </div>
        )}
      </section>

      {error && (
        <div className="policy-chat__error">
          <Alert type="error">{error}</Alert>
          {retryQuestion && (
            <button type="button" className="btn btn--primary" onClick={() => ask(retryQuestion, true)}>Thử lại</button>
          )}
        </div>
      )}

      <form className="policy-chat__form" onSubmit={e => { e.preventDefault(); ask(input); }}>
        <label className="sr-only" htmlFor="policy-question">Câu hỏi</label>
        <input
          id="policy-question"
          name="question"
          value={input}
          maxLength={500}
          placeholder="Nhập câu hỏi về chính sách…"
          onChange={e => setInput(e.target.value)}
        />
        <button className="btn btn--primary" disabled={busy || !input.trim()}>Gửi</button>
      </form>
    </div>
  );
}
