import React, { useState, useEffect } from 'react';

export function Button({
  variant = 'primary',
  size = 'md',
  className = '',
  children,
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
}) {
  const base = 'inline-flex items-center justify-center gap-2 font-semibold transition-colors disabled:opacity-40 disabled:pointer-events-none active:scale-[0.98]';
  const sizes = {
    sm: 'px-3 py-1.5 text-sm rounded-xl',
    md: 'px-4 py-2.5 text-sm rounded-xl',
    lg: 'px-6 py-3.5 text-base rounded-xl',
  };
  const variants = {
    primary: 'button-primary',
    secondary: 'button-secondary',
    ghost: 'button-ghost',
    danger: 'button-danger',
  };
  return (
    <button className={`${base} ${sizes[size]} ${variants[variant]} ${className}`} {...rest}>
      {children}
    </button>
  );
}

export function Card({ className = '', children, accent }: { className?: string; children: React.ReactNode; accent?: boolean }) {
  return (
    <div
      className={`surface-card ${accent ? 'is-accent' : ''} ${className}`}
    >
      {children}
    </div>
  );
}

export function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <label className="block">
      <span className="block text-xs font-medium text-[var(--text-dim)] mb-1">{label}</span>
      {children}
      {hint && <span className="block text-xs text-[var(--text-dim)] mt-1">{hint}</span>}
    </label>
  );
}

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  const { className = '', ...rest } = props;
  return (
    <input
      className={`w-full rounded-lg px-3 py-2.5 text-sm ${className}`}
      {...rest}
    />
  );
}

export function Select({ className = '', children, ...rest }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={`w-full rounded-lg px-3 py-2.5 text-sm ${className}`} {...rest}>
      {children}
    </select>
  );
}

export function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const { className = '', ...rest } = props;
  return <textarea className={`w-full rounded-lg px-3 py-2.5 text-sm ${className}`} {...rest} />;
}

export function Badge({ children, tone = 'neutral' }: { children: React.ReactNode; tone?: 'neutral' | 'positive' | 'negative' | 'warn' | 'accent' }) {
  const tones: Record<string, string> = {
    neutral: 'bg-[var(--border)]/50 text-[var(--text-dim)]',
    positive: 'bg-[var(--positive)]/15 text-[var(--positive)]',
    negative: 'bg-[var(--negative)]/15 text-[var(--negative)]',
    warn: 'bg-[var(--warn)]/15 text-[var(--warn)]',
    accent: 'bg-[var(--accent)]/15 text-[var(--accent)]',
  };
  return <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-semibold ${tones[tone]}`}>{children}</span>;
}

export function Modal({ open, onClose, title, children, wide }: { open: boolean; onClose: () => void; title: string; children: React.ReactNode; wide?: boolean }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4" onClick={onClose}>
      <div
        className={`bg-[var(--bg)] w-full ${wide ? 'sm:max-w-2xl' : 'sm:max-w-md'} rounded-t-2xl sm:rounded-2xl border border-[var(--border)] max-h-[92vh] overflow-y-auto`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border)] sticky top-0 bg-[var(--bg)]">
          <h2 className="font-display text-xl font-semibold tracking-tight">{title}</h2>
          <button onClick={onClose} aria-label="Fechar" className="text-[var(--text-dim)] hover:text-[var(--text)] text-xl leading-none px-2">✕</button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

export function EmptyState({ title, message, action }: { title: string; message: string; action?: React.ReactNode }) {
  return (
    <div className="text-center py-8 px-6">
      <p className="font-display text-2xl font-semibold text-[var(--text)]">{title}</p>
      <p className="text-sm text-[var(--text-dim)] mt-2 max-w-sm mx-auto">{message}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function BigStat({ label, value, sub, tone = 'neutral' }: { label: string; value: string; sub?: string; tone?: 'neutral' | 'positive' | 'negative' }) {
  const toneColor = tone === 'positive' ? 'text-[var(--positive)]' : tone === 'negative' ? 'text-[var(--negative)]' : 'text-[var(--text)]';
  return (
    <div>
      <div className="text-xs uppercase tracking-wide text-[var(--text-dim)]">{label}</div>
      <div className={`font-display text-4xl font-bold tabular ${toneColor}`}>{value}</div>
      {sub && <div className="text-xs text-[var(--text-dim)] mt-0.5">{sub}</div>}
    </div>
  );
}

export function NumberStepper({
  value,
  onChange,
  step = 1,
  min,
  decimals = 0,
  suffix,
}: {
  value: number;
  onChange: (v: number) => void;
  step?: number;
  min?: number;
  decimals?: number;
  suffix?: string;
}) {
  const clamp = (v: number) => (min != null ? Math.max(min, v) : v);
  const [text, setText] = useState(value.toFixed(decimals));
  const [focused, setFocused] = useState(false);

  // Keep the field in sync with external changes (e.g. the +/- buttons,
  // or switching between sets) as long as the person isn't mid-typing.
  useEffect(() => {
    if (!focused) setText(value.toFixed(decimals));
  }, [value, decimals, focused]);

  function commit(raw: string) {
    const normalized = raw.replace(',', '.');
    const parsed = parseFloat(normalized);
    if (!Number.isNaN(parsed)) {
      const clamped = clamp(parsed);
      onChange(clamped);
      setText(clamped.toFixed(decimals));
    } else {
      setText(value.toFixed(decimals));
    }
  }

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={() => onChange(Number(clamp(value - step).toFixed(decimals)))}
        className="w-11 h-11 shrink-0 rounded-lg border border-[var(--border)] text-lg font-semibold active:scale-95"
      >
        −
      </button>
      <div className="flex-1 flex items-center justify-center gap-1">
        <input
          type="text"
          inputMode="decimal"
          value={text}
          onFocus={(e) => { setFocused(true); e.target.select(); }}
          onChange={(e) => setText(e.target.value)}
          onBlur={(e) => { setFocused(false); commit(e.target.value); }}
          onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
          className="w-full min-w-0 text-center font-display text-2xl font-bold tabular bg-transparent border-none p-0 focus:outline-none"
        />
        {suffix ? <span className="text-sm font-body text-[var(--text-dim)]">{suffix}</span> : null}
      </div>
      <button
        type="button"
        onClick={() => onChange(Number(clamp(value + step).toFixed(decimals)))}
        className="w-11 h-11 shrink-0 rounded-lg border border-[var(--border)] text-lg font-semibold active:scale-95"
      >
        +
      </button>
    </div>
  );
}
