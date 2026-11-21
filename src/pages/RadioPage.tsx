import { useEffect, useRef, useState } from 'react';
import { PlayerDot } from '../components/ui';
import { useMessages, usePlayers } from '../data/queries';
import { repo } from '../data/localRepository';
import { fmtDateTime } from '../format';
import { other, useMe } from '../hooks';

const QUICK = ['Box, box! 📻', 'Copy that 👍', 'Push now! 🔥', 'Wir prüfen das… 🧐', 'Lights out and away we go! 🚦', 'Ich bin schneller 😏'];

export function RadioPage() {
  const messages = useMessages();
  const players = usePlayers();
  const { me } = useMe();
  const [text, setText] = useState('');
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    repo.markMessagesRead(me);
    endRef.current?.scrollIntoView({ block: 'end' });
  }, [messages?.length, me]);

  const name = (id: string) => players?.find((p) => p.id === id)?.name ?? id;
  const send = (t: string) => repo.sendMessage(me, other(me), t);
  const sendDraft = async () => {
    const draft = text;
    setText('');
    await send(draft);
  };

  return (
    <div className="radio">
      <h1>📻 Boxenfunk</h1>
      <div className="messages">
        {messages?.length === 0 && <p className="muted center">Noch Funkstille. Schick die erste Nachricht!</p>}
        {messages?.map((m) => (
          <div key={m.id} className={`bubble ${m.from === me ? 'mine' : 'theirs'} ${m.from}`}>
            <span className="meta"><PlayerDot id={m.from} /> {name(m.from)} · {fmtDateTime(m.sentAt)}</span>
            <span>{m.text}</span>
          </div>
        ))}
        <div ref={endRef} />
      </div>
      <div className="quick">
        {QUICK.map((q) => <button key={q} className="chip" onClick={() => send(q)}>{q}</button>)}
      </div>
      <form className="composer" onSubmit={(e) => { e.preventDefault(); sendDraft(); }}>
        <input
          value={text}
          maxLength={280}
          onChange={(e) => setText(e.target.value)}
          placeholder={`Funk an ${name(other(me))}…`}
          aria-label="Nachricht"
        />
        <button className="btn primary" disabled={!text.trim()}>Senden</button>
      </form>
    </div>
  );
}
