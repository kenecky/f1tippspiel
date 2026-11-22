import { Fragment, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { PlayerDot } from '../components/ui';
import { useMessages, usePlayers } from '../data/queries';
import { repo } from '../data/localRepository';
import { fmtDateTime } from '../format';
import { other, useMe, usePageActive } from '../hooks';

const QUICK = ['Box, box! 📻', 'Copy that 👍', 'Push now! 🔥', 'Wir prüfen das… 🧐', 'Lights out and away we go! 🚦', 'Ich bin schneller 😏'];

/**
 * Boxenfunk: Verlauf scrollt, Schnellfunk + Eingabe sind unten fixiert.
 * Beim Öffnen steht die erste ungelesene Nachricht oben im Verlauf.
 */
export function RadioPage() {
  const messages = useMessages();
  const players = usePlayers();
  const { me } = useMe();
  const active = usePageActive();
  const [text, setText] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const [firstUnreadId, setFirstUnreadId] = useState<number | null | undefined>(undefined);
  const lastCount = useRef(0);
  const [spacer, setSpacer] = useState(0);

  // Beim (Wieder-)Sichtbarwerden: erste ungelesene Nachricht merken und neu ausrichten
  useEffect(() => {
    if (!active) {
      setFirstUnreadId(undefined);
      lastCount.current = 0;
      setSpacer(0);
    }
  }, [active]);

  useEffect(() => {
    if (!active || !messages || firstUnreadId !== undefined) return;
    const first = messages.find((m) => m.to === me && !m.readAt);
    setFirstUnreadId(first?.id ?? null);
  }, [messages, firstUnreadId, me, active]);

  // Scrollposition setzen
  useLayoutEffect(() => {
    const box = scrollRef.current;
    if (!box || !messages) return;
    if (firstUnreadId === undefined) {
      // Als Nachbarseite: unten (neueste Nachrichten) zeigen
      if (!active) box.scrollTop = box.scrollHeight;
      return;
    }
    if (lastCount.current === 0) {
      const target = firstUnreadId != null ? box.querySelector<HTMLElement>(`[data-unread-anchor]`) : null;
      if (target) {
        // Platz schaffen, damit die erste ungelesene Nachricht ganz oben stehen kann
        const below = box.scrollHeight - spacer - target.offsetTop;
        const need = Math.max(0, box.clientHeight - below - 8);
        if (need !== spacer) {
          setSpacer(need);
          return; // nach dem Rendern mit Platzhalter erneut ausrichten
        }
        box.scrollTop = target.offsetTop - 8;
      } else {
        box.scrollTop = box.scrollHeight;
      }
    } else if (messages.length > lastCount.current) {
      setSpacer(0);
      // Neue Nachricht: nach unten, wenn man ohnehin unten war oder selbst gesendet hat
      const nearBottom = box.scrollHeight - box.scrollTop - box.clientHeight < 160;
      if (nearBottom || messages.at(-1)?.from === me) box.scrollTo({ top: box.scrollHeight, behavior: 'smooth' });
    }
    lastCount.current = messages.length;
  }, [messages, firstUnreadId, me, spacer, active]);

  // Als gelesen markieren (kurz verzögert, damit der Trenner sichtbar bleibt)
  useEffect(() => {
    if (!active || !messages?.some((m) => m.to === me && !m.readAt)) return;
    const t = window.setTimeout(() => repo.markMessagesRead(me), 1200);
    return () => clearTimeout(t);
  }, [messages, me, active]);

  // Tastatur offen → Navigation ausblenden.
  // Erkennung über die Höhe des sichtbaren Bereichs: Beim Schließen per Zurück-Taste
  // bleibt das Feld fokussiert, daher reicht focus/blur allein nicht.
  useEffect(() => {
    if (!active) return;
    const vv = window.visualViewport;
    let baseline = vv?.height ?? window.innerHeight;
    const update = () => {
      const h = vv?.height ?? window.innerHeight;
      if (h > baseline) baseline = h;
      const shrunk = baseline - h > 120;
      const focused = document.activeElement?.tagName === 'INPUT';
      document.body.classList.toggle('keyboard-open', shrunk && focused);
    };
    const onOrientation = () => {
      baseline = 0; // nach Drehung neu messen
      window.setTimeout(update, 300);
    };
    vv?.addEventListener('resize', update);
    window.addEventListener('resize', update);
    window.addEventListener('orientationchange', onOrientation);
    document.addEventListener('focusin', update);
    const onFocusOut = () => window.setTimeout(update, 50);
    document.addEventListener('focusout', onFocusOut);
    return () => {
      vv?.removeEventListener('resize', update);
      window.removeEventListener('resize', update);
      window.removeEventListener('orientationchange', onOrientation);
      document.removeEventListener('focusin', update);
      document.removeEventListener('focusout', onFocusOut);
      document.body.classList.remove('keyboard-open');
    };
  }, [active]);

  const name = (id: string) => players?.find((p) => p.id === id)?.name ?? id;
  const send = (t: string) => repo.sendMessage(me, other(me), t);
  const sendDraft = async () => {
    const draft = text;
    setText('');
    await send(draft);
  };

  return (
    <div className="radio">
      <div className="radio-head">
        <h1>📻 Boxenfunk</h1>
        <span className="muted small">mit {name(other(me))}</span>
      </div>
      <div className="messages" ref={scrollRef}>
        {messages?.length === 0 && <p className="muted center empty">Noch Funkstille. Schick die erste Nachricht!</p>}
        {messages?.map((m) => (
          <Fragment key={m.id}>
            {m.id === firstUnreadId && (
              <div className="unread-divider" data-unread-anchor>
                <span>Neue Nachrichten</span>
              </div>
            )}
            <div className={`bubble ${m.from === me ? 'mine' : 'theirs'} ${m.from}`}>
              <span className="meta"><PlayerDot id={m.from} /> {name(m.from)} · {fmtDateTime(m.sentAt)}</span>
              <span>{m.text}</span>
            </div>
          </Fragment>
        ))}
        {spacer > 0 && <div aria-hidden style={{ flex: 'none', height: spacer }} />}
      </div>
      <div className="radio-footer">
        <div className="quick">
          {QUICK.map((q) => <button key={q} type="button" className="chip" onClick={() => send(q)}>{q}</button>)}
        </div>
        <form className="composer" onSubmit={(e) => { e.preventDefault(); sendDraft(); }}>
          <input
            value={text}
            maxLength={280}
            onChange={(e) => setText(e.target.value)}
            placeholder={`Funk an ${name(other(me))}…`}
            aria-label="Nachricht"
            enterKeyHint="send"
          />
          <button className="btn primary" disabled={!text.trim()} onMouseDown={(e) => e.preventDefault()}>Senden</button>
        </form>
      </div>
    </div>
  );
}
