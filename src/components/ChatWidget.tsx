'use client';

import { useState } from 'react';
import { useShop } from '@/store/ShopProvider';
import { site } from '@/lib/catalog';

/** Виджет поддержки в правом нижнем углу — как на оригинале. */
export default function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const [sent, setSent] = useState(false);
  const { notify } = useShop();
  const w = site.chatWidget;

  const send = (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    setSent(true);
    notify('Вопрос отправлен — мы перезвоним');
    setText('');
    setTimeout(() => setSent(false), 2600);
  };

  return (
    <>
      {open ? (
        <div className="chat-box">
          <div className="chat-head">
            <span style={{ fontSize: 20 }}>💬</span>
            <span>
              <b>{w.title}</b>
              <span>обычно отвечаем в течение 15 минут</span>
            </span>
            <button onClick={() => setOpen(false)} aria-label="Закрыть чат">✕</button>
          </div>
          <div className="chat-body">
            {sent ? (
              <p style={{ margin: 0, color: 'var(--ok)', fontWeight: 600 }}>✓ Вопрос отправлен</p>
            ) : (
              <p style={{ margin: 0 }}>{w.hint}. Сейчас нерабочее время — {w.offline.toLowerCase()}.</p>
            )}
            <form onSubmit={send}>
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Напишите ваш вопрос…"
                aria-label="Ваш вопрос"
              />
            </form>
          </div>
          <div className="chat-foot">
            <button className="btn btn-primary btn-block" onClick={send} disabled={!text.trim()}>
              {w.submit}
            </button>
          </div>
        </div>
      ) : null}

      <button className="chat-fab" onClick={() => setOpen(!open)} aria-label="Поддержка">
        {open ? '✕' : '💬'}
      </button>
    </>
  );
}
