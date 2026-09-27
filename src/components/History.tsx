import React, { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { Button, Card, Modal, Badge, Select } from './ui';
import { isoDate } from '../lib/calculations';
import type { MissedReason } from '../types';

const MONTH_NAMES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
const WEEKDAY_LABELS = ['S', 'T', 'Q', 'Q', 'S', 'S', 'D'];
const REASONS: MissedReason[] = ['Falta de tempo', 'Descanso', 'Indisposição', 'Outro'];

export function CalendarView() {
  const { data, markMissed, deleteSession } = useApp();
  const navigate = useNavigate();
  const [cursor, setCursor] = useState(new Date());
  const [missedModal, setMissedModal] = useState<{ date: string; dayName: string; planId?: string; dayId?: string } | null>(null);

  const activePlan = data.plans.find((p) => p.isActive && !p.archived);

  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const firstOfMonth = new Date(year, month, 1);
  const startOffset = (firstOfMonth.getDay() + 6) % 7; // Monday-first
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const todayStr = isoDate();

  const cells = useMemo(() => {
    const arr: { date: Date | null }[] = [];
    for (let i = 0; i < startOffset; i++) arr.push({ date: null });
    for (let d = 1; d <= daysInMonth; d++) arr.push({ date: new Date(year, month, d) });
    return arr;
  }, [year, month, startOffset, daysInMonth]);

  function statusFor(date: Date) {
    const ds = isoDate(date);
    const session = data.sessions.find((s) => s.date === ds && s.status !== 'missed') ??
      data.sessions.find((s) => s.date === ds);
    if (session?.status === 'completed') return { symbol: '✓', tone: 'positive' as const, session };
    if (session?.status === 'missed') return { symbol: '✗', tone: 'negative' as const, session };
    if (session?.status === 'in_progress') return { symbol: '●', tone: 'accent' as const, session };

    const planDay = activePlan?.days.find((d) => d.dayOfWeek === date.getDay());
    if (!planDay) return { symbol: '', tone: 'neutral' as const, session: undefined };
    if (planDay.isRestDay) return { symbol: '—', tone: 'neutral' as const, session: undefined, planDay };
    if (ds < todayStr) return { symbol: '✗', tone: 'negative' as const, session: undefined, planDay, unlogged: true };
    return { symbol: '○', tone: 'neutral' as const, session: undefined, planDay };
  }

  function handleDayClick(date: Date) {
    const ds = isoDate(date);
    const info = statusFor(date);
    if (info.session) {
      if (info.session.status === 'in_progress') navigate(`/treino/${info.session.id}`);
      else navigate(`/treino/${info.session.id}/resumo`);
      return;
    }
    if (info.planDay && !info.planDay.isRestDay) {
      if (ds < todayStr) {
        setMissedModal({ date: ds, dayName: info.planDay.name, planId: activePlan?.id, dayId: info.planDay.id });
      } else if (ds === todayStr) {
        navigate(`/treino/novo?planId=${activePlan?.id}&dayId=${info.planDay.id}`);
      }
    }
  }

  return (
    <div className="p-4 md:p-8 max-w-3xl mx-auto space-y-5">
      <header className="flex items-center justify-between">
        <h1 className="font-display text-3xl font-bold tracking-tight">Calendário</h1>
        <div className="flex items-center gap-2">
          <button onClick={() => setCursor(new Date(year, month - 1, 1))} className="w-9 h-9 rounded-lg border border-[var(--border)]">‹</button>
          <span className="text-sm font-medium w-32 text-center">{MONTH_NAMES[month]} {year}</span>
          <button onClick={() => setCursor(new Date(year, month + 1, 1))} className="w-9 h-9 rounded-lg border border-[var(--border)]">›</button>
        </div>
      </header>

      <Card className="p-3 md:p-5">
        <div className="grid grid-cols-7 gap-1 text-center text-xs text-[var(--text-dim)] mb-2">
          {WEEKDAY_LABELS.map((d, i) => <div key={i}>{d}</div>)}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {cells.map((cell, i) => {
            if (!cell.date) return <div key={i} />;
            const info = statusFor(cell.date);
            const isToday = isoDate(cell.date) === todayStr;
            const toneColor = info.tone === 'positive' ? 'text-[var(--positive)]' : info.tone === 'negative' ? 'text-[var(--negative)]' : info.tone === 'accent' ? 'text-[var(--accent)]' : 'text-[var(--text-dim)]';
            return (
              <button
                key={i}
                onClick={() => handleDayClick(cell.date!)}
                className={`aspect-square rounded-lg flex flex-col items-center justify-center text-xs gap-0.5 ${isToday ? 'ring-2 ring-[var(--accent)]' : ''} hover:bg-[var(--bg)]`}
              >
                <span className="tabular">{cell.date.getDate()}</span>
                <span className={`text-sm ${toneColor}`}>{info.symbol}</span>
              </button>
            );
          })}
        </div>
      </Card>

      <div className="flex gap-4 text-xs text-[var(--text-dim)] flex-wrap px-1">
        <span><span className="text-[var(--positive)]">✓</span> Concluído</span>
        <span><span className="text-[var(--text-dim)]">○</span> Planeado</span>
        <span><span className="text-[var(--negative)]">✗</span> Perdido</span>
        <span><span className="text-[var(--text-dim)]">—</span> Descanso</span>
      </div>

      <SessionList />

      {missedModal && (
        <Modal open onClose={() => setMissedModal(null)} title="Treino não realizado">
          <div className="space-y-4">
            <p className="text-sm text-[var(--text-dim)]">{missedModal.dayName} — {new Date(missedModal.date + 'T00:00:00').toLocaleDateString('pt-PT')}</p>
            <p className="text-sm">Porque não realizaste este treino?</p>
            <div className="grid grid-cols-2 gap-2">
              {REASONS.map((r) => (
                <Button key={r} variant="secondary" onClick={() => { markMissed({ ...missedModal, reason: r }); setMissedModal(null); }}>{r}</Button>
              ))}
            </div>
            <Button variant="ghost" className="w-full" onClick={() => { markMissed(missedModal); setMissedModal(null); }}>Não indicar motivo</Button>
          </div>
        </Modal>
      )}
    </div>
  );
}

function SessionList() {
  const { data, deleteSession } = useApp();
  const [filter, setFilter] = useState<'all' | 'completed' | 'missed'>('all');

  const sessions = [...data.sessions]
    .filter((s) => filter === 'all' || s.status === filter)
    .sort((a, b) => (a.date < b.date ? 1 : -1))
    .slice(0, 30);

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs uppercase tracking-wide text-[var(--text-dim)]">Histórico de treinos</p>
        <Select value={filter} onChange={(e) => setFilter(e.target.value as any)} className="w-36 !py-1.5 !text-xs">
          <option value="all">Todos</option>
          <option value="completed">Concluídos</option>
          <option value="missed">Perdidos</option>
        </Select>
      </div>
      <div className="space-y-2">
        {sessions.map((s) => (
          <Card key={s.id} className="p-3 flex items-center justify-between">
            <Link to={s.status === 'in_progress' ? `/treino/${s.id}` : `/treino/${s.id}/resumo`} className="flex-1 min-w-0">
              <p className="text-sm font-medium">{s.dayName}</p>
              <p className="text-xs text-[var(--text-dim)]">{new Date(s.date + 'T00:00:00').toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit', year: 'numeric' })}</p>
            </Link>
            <div className="flex items-center gap-2 shrink-0">
              {s.status === 'completed' && <Badge tone="positive">Concluído</Badge>}
              {s.status === 'missed' && <Badge tone="negative">{s.missedReason ?? 'Perdido'}</Badge>}
              {s.status === 'in_progress' && <Badge tone="accent">Em curso</Badge>}
              <button onClick={() => { if (confirm('Apagar este registo?')) deleteSession(s.id); }} className="text-[var(--text-dim)] text-xs">✕</button>
            </div>
          </Card>
        ))}
        {sessions.length === 0 && <p className="text-sm text-[var(--text-dim)] py-4">Sem registos ainda.</p>}
      </div>
    </div>
  );
}
