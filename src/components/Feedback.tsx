import React, { useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { Card, EmptyState } from './ui';
import {
  weekSessions, lastNDaysSessions, sessionVolume, currentStreak, suggestProgression, sessionCardioMinutes,
} from '../lib/calculations';

export function FeedbackPage() {
  const { data } = useApp();

  const insights = useMemo(() => buildInsights(data), [data]);

  return (
    <div className="p-4 md:p-8 max-w-3xl mx-auto space-y-5">
      <h1 className="font-display text-3xl font-bold tracking-tight">Análise</h1>
      <p className="text-sm text-[var(--text-dim)] -mt-3">
        Observações geradas exclusivamente a partir dos dados que registaste.
      </p>

      {insights.length === 0 ? (
        <EmptyState title="Ainda sem dados suficientes" message="Regista alguns treinos para começares a ver observações aqui." />
      ) : (
        <div className="space-y-2">
          {insights.map((text, i) => (
            <Card key={i} className="p-4">
              <p className="text-sm">{text}</p>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function buildInsights(data: ReturnType<typeof useApp>['data']): string[] {
  const insights: string[] = [];

  const thisWeek = weekSessions(data);
  const completedThisWeek = thisWeek.filter((s) => s.status === 'completed');
  const plan = data.plans.find((p) => p.isActive && !p.archived);
  const plannedTrainingDays = plan ? plan.days.filter((d) => !d.isRestDay).length : null;
  if (plannedTrainingDays != null) {
    insights.push(`Realizaste ${completedThisWeek.length} de ${plannedTrainingDays} treinos planeados esta semana.`);
  } else if (completedThisWeek.length > 0) {
    insights.push(`Realizaste ${completedThisWeek.length} treino(s) esta semana.`);
  }

  // Volume by muscle group, this week vs previous week.
  const lastWeekStart = new Date();
  lastWeekStart.setDate(lastWeekStart.getDate() - 14);
  const prevWeekSessions = data.sessions.filter((s) => {
    if (s.status !== 'completed') return false;
    const d = new Date(s.date + 'T00:00:00');
    const now = new Date();
    const startThis = new Date(now);
    const dow = (now.getDay() + 6) % 7;
    startThis.setDate(now.getDate() - dow - 7);
    startThis.setHours(0, 0, 0, 0);
    const endPrev = new Date(startThis);
    endPrev.setDate(endPrev.getDate() + 6);
    endPrev.setHours(23, 59, 59, 999);
    return d >= startThis && d <= endPrev;
  });

  const groupVolume = (sessions: typeof data.sessions) => {
    const byGroup: Record<string, number> = {};
    for (const s of sessions) {
      for (const pe of s.performedExercises) {
        const ex = data.exercises.find((e) => e.id === pe.exerciseId);
        if (!ex) continue;
        const vol = pe.sets.reduce((sum, set) => sum + (set.completed && set.weight && set.reps ? set.weight * set.reps : 0), 0);
        byGroup[ex.muscleGroup] = (byGroup[ex.muscleGroup] ?? 0) + vol;
      }
    }
    return byGroup;
  };
  const thisWeekGroupVol = groupVolume(completedThisWeek);
  const prevWeekGroupVol = groupVolume(prevWeekSessions);
  for (const [group, vol] of Object.entries(thisWeekGroupVol)) {
    const prevVol = prevWeekGroupVol[group];
    if (prevVol && prevVol > 0) {
      const change = Math.round(((vol - prevVol) / prevVol) * 100);
      if (Math.abs(change) >= 5) {
        insights.push(`O volume de ${group.toLowerCase()} ${change > 0 ? 'aumentou' : 'diminuiu'} ${Math.abs(change)}% relativamente à semana anterior.`);
      }
    }
  }

  // Strength change over 30 days per exercise with a completed history.
  const exerciseIds = Array.from(new Set(
    data.sessions.filter((s) => s.status === 'completed').flatMap((s) => s.performedExercises.map((pe) => pe.exerciseId)),
  ));
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  for (const exId of exerciseIds) {
    const ex = data.exercises.find((e) => e.id === exId);
    if (!ex) continue;
    const sessionsWithEx = data.sessions
      .filter((s) => s.status === 'completed' && s.performedExercises.some((pe) => pe.exerciseId === exId))
      .sort((a, b) => (a.date < b.date ? -1 : 1));
    const older = sessionsWithEx.find((s) => new Date(s.date + 'T00:00:00') <= thirtyDaysAgo);
    const latest = sessionsWithEx[sessionsWithEx.length - 1];
    if (older && latest && older.id !== latest.id) {
      const oldMax = Math.max(0, ...older.performedExercises.filter((pe) => pe.exerciseId === exId).flatMap((pe) => pe.sets.filter((s) => s.completed && s.weight != null).map((s) => s.weight!)));
      const newMax = Math.max(0, ...latest.performedExercises.filter((pe) => pe.exerciseId === exId).flatMap((pe) => pe.sets.filter((s) => s.completed && s.weight != null).map((s) => s.weight!)));
      const delta = newMax - oldMax;
      if (Math.abs(delta) >= 1) {
        insights.push(`O teu ${ex.name.toLowerCase()} ${delta > 0 ? 'aumentou' : 'diminuiu'} ${Math.abs(delta)} kg nos últimos 30 dias.`);
      }
    }
  }

  // Cardio this week.
  const cardioSessionsThisWeek = thisWeek.filter((s) => s.status === 'completed' && sessionCardioMinutes(data, s) > 0);
  if (cardioSessionsThisWeek.length > 0) {
    insights.push(`Fizeste ${cardioSessionsThisWeek.length} sessão(ões) de cardio esta semana.`);
  }

  // Streak.
  const streak = currentStreak(data);
  if (streak >= 3) {
    insights.push(`Estás há ${streak} dias sem falhar um treino.`);
  }

  // Stagnation warnings.
  for (const exId of exerciseIds) {
    const suggestion = suggestProgression(data, exId);
    if (suggestion?.message.includes('progressão')) {
      const ex = data.exercises.find((e) => e.id === exId);
      insights.push(`${ex?.name ?? 'Este exercício'} está sem progressão — ${suggestion.message.toLowerCase()}`);
    }
  }

  return insights;
}
