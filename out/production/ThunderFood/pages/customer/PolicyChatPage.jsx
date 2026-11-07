import { useState } from 'react';
import { aiApi } from '../../api/aiApi.js';
import { getErrorMessage } from '../../api/baseApi.js';
import Alert from '../../components/Alert.jsx';

const sourceName = file => String(file).replace(/\.md$/, '').replace(/-/g, ' ');

export default function PolicyChatPage() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function send(event) {
    event.preventDefault();
    const question = input.trim();
    if (!question || busy) return;
    setMessages(list => [...list, { role: 'user', text: question }]);
    setInput('');
    setBusy(true);
    setError('');
    try {
      const res = await aiApi.policyChat(question);
      setMessages(list => [...list, { role: 'assistant', text: res.answer, sources: res.sources }]);
    } catch (err) {
      setError(getErrorMessage(err, 'Chưa trả lời được lúc này, vui lòng thử lại.'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="container commerce-page policy-chat-page">
      <h1>Hỏi về chính sách ThunderFood</h1>
      <p>Trợ lý trả lời dựa trên điều khoản, chính sách hủy và hoàn tiền, và câu hỏi thường gặp.</p>

      <section className="policy-chat" aria-live="polite">
        {messages.length === 0 && (
          <p className="policy-chat__hint">Ví dụ: "Tôi có được hủy đơn sau khi đã thanh toán không?"</p>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`policy-chat__msg policy-chat__msg--${m.role}`}>
            <p>{m.text}</p>
            {m.sources?.length > 0 && (
              <small className="policy-chat__sources">Nguồn: {m.sources.map(sourceName).join(', ')}</small>
            )}
          </div>
        ))}
        {busy && <p role="status" className="policy-chat__hint">Đang tìm câu trả lời…</p>}
      </section>

      {error && <Alert type="error">{error}</Alert>}

      <form className="policy-chat__form" onSubmit={send}>
        <label className="sr-only" htmlFor="policy-question">Câu hỏi</label>
        <input
          id="policy-question"
          value={input}
          maxLength={500}
          placeholder="Nhập câu hỏi về chính sách…"
          onChange={e => setInput(e.target.value)}
        />
        <button className="btn btn--primary" disabled={busy || !input.trim()}>Gửi</button>
      </form>
    </main>
  );
}
