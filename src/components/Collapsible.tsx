import { useState, type ReactNode } from 'react';

/** Auf-/zuklappbarer Bereich; standardmäßig zu */
export function Collapsible({ title, meta, children, className = '' }: {
  title: ReactNode; meta?: ReactNode; children: ReactNode; className?: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <section className={`collapsible ${open ? 'open' : ''} ${className}`}>
      <button type="button" className="collapsible-head" aria-expanded={open} onClick={() => setOpen(!open)}>
        <span className="collapsible-title">{title}</span>
        {meta && <span className="collapsible-meta">{meta}</span>}
        <span className="chev" aria-hidden>▾</span>
      </button>
      {open && <div className="collapsible-body">{children}</div>}
    </section>
  );
}
