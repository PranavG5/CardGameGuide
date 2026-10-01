import { type ReactNode, useEffect } from 'react';
import { Link } from 'react-router-dom';

export function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', k);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', k);
      document.body.style.overflow = prev;
    };
  }, [onClose]);
  return (
    <div className="modal-back" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-label={title}>
        <div className="modal-head">
          <h2 style={{ margin: 0 }}>{title}</h2>
          <button className="btn small" onClick={onClose}>
            Close
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

interface TileProps {
  to: string;
  icon: ReactNode;
  name: string;
  desc: string;
  step?: number;
  done?: boolean;
  next?: boolean;
  right?: ReactNode;
}

export function Tile({ to, icon, name, desc, step, done, next, right }: TileProps) {
  return (
    <Link to={to} className={`tile ${next ? 'next' : ''}`}>
      {step !== undefined && <div className={`step ${done ? 'done' : ''}`}>{done ? '✓' : step}</div>}
      <div className="ico">{icon}</div>
      <div className="body">
        <div className="name">
          {name} {next && <span className="pill gold" style={{ marginLeft: 6, fontSize: '0.7rem', padding: '1px 8px' }}>Up next</span>}
        </div>
        <div className="desc">{desc}</div>
      </div>
      {right}
    </Link>
  );
}

export function ProgressBar({ value }: { value: number }) {
  return (
    <div className="progress-bar">
      <div style={{ width: `${Math.round(Math.max(0, Math.min(1, value)) * 100)}%` }} />
    </div>
  );
}

export function Seg<T extends string>({ value, options, onChange }: { value: T; options: { value: T; label: string }[]; onChange: (v: T) => void }) {
  return (
    <div className="seg" role="tablist">
      {options.map((o) => (
        <button key={o.value} className={o.value === value ? 'on' : ''} onClick={() => onChange(o.value)} role="tab" aria-selected={o.value === value}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Toast({ tone, children }: { tone?: 'ok' | 'no'; children: ReactNode }) {
  return <div className={`toast ${tone ?? ''}`}>{children}</div>;
}

/** Calls handler for number keys 1-9 and Enter/Space. Ignores typing in inputs. */
export function useHotkeys(handler: (key: string) => void, deps: unknown[]) {
  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === ' ' || e.key === 'Enter') {
        if (tag === 'BUTTON') return; // let the focused button handle it
        e.preventDefault();
      }
      handler(e.key);
    };
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}

export const pct = (x: number) => `${Math.round(x * 100)}%`;
export const money = (n: number) => `${n < 0 ? '-' : ''}$${Math.abs(n).toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
