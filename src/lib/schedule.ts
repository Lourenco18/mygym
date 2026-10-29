import type { AppData, ScheduledItem, WorkoutPlan, WorkoutSession } from '../types';

export function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function parseISODate(s: string): Date {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function addDaysISO(s: string, n: number): string {
  const d = parseISODate(s);
  d.setDate(d.getDate() + n);
  return toISODate(d);
}

export function activePlanOf(data: AppData): WorkoutPlan | undefined {
  return data.plans.find((p) => p.isActive && !p.archived);
}

/** O treino agendado para uma data: override (adiamentos) ou, por omissão, o plano semanal. */
export function getScheduled(data: AppData, dateISO: string): ScheduledItem | null {
  const plan = activePlanOf(data);
  if (!plan) return null;
  const overrides = data.scheduleOverrides ?? {};
  if (Object.prototype.hasOwnProperty.call(overrides, dateISO)) {
    const o = overrides[dateISO];
    if (o === null) return null;
    if (o.planId === plan.id && plan.days.some((d) => d.id === o.dayId)) return o;
  }
  const dow = parseISODate(dateISO).getDay();
  const day = plan.days.find((d) => d.dayOfWeek === dow && !d.isRestDay);
  return day ? { planId: plan.id, dayId: day.id, originalDate: dateISO } : null;
}

export function findSessionForItem(data: AppData, item: ScheduledItem): WorkoutSession | undefined {
  return data.sessions.find((s) => s.dayId === item.dayId && (s.plannedDate ?? s.date) === item.originalDate);
}

/** Já foi feito (ou marcado como perdido) — deixa de contar como pendente. */
export function isItemDone(data: AppData, item: ScheduledItem): boolean {
  const s = findSessionForItem(data, item);
  return !!s && s.status !== 'in_progress';
}

/**
 * Adiar o treino de `dateISO` para o dia seguinte. Os treinos seguintes avançam um dia
 * até ao primeiro dia livre (descanso) que absorve o adiamento. Cada treino mantém a
 * sua data original. Devolve os novos overrides, ou null se não for possível.
 */
export function computePostpone(data: AppData, dateISO: string): Record<string, ScheduledItem | null> | null {
  const first = getScheduled(data, dateISO);
  if (!first || isItemDone(data, first)) return null;
  const changes: Record<string, ScheduledItem | null> = { [dateISO]: null };
  let carry: ScheduledItem = first;
  for (let i = 1; i <= 14; i++) {
    const d = addDaysISO(dateISO, i);
    const cur = getScheduled(data, d);
    changes[d] = carry;
    if (!cur || isItemDone(data, cur)) return changes;
    carry = cur;
  }
  return null;
}
