import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { Card, BigStat, Badge, Button, EmptyState } from './ui';
import {
  weekSessions, sessionVolume, currentStreak, isoDate, suggestProgression, sessionCardioMinutes,
} from '../lib/calculations';

function activePlanOf(plans: ReturnType<typeof useApp>['data']['plans']) {
  return plans.find((p) => p.isActive && !p.archived);
}

export function Dashboard() {
  const { data } = useApp();
  const navigate = useNavigate();
  const plan = activePlanOf(data.plans);

  const today = new Date();
  const todayDow = today.getDay();
  const todayDay = plan?.days.find((d) => d.dayOfWeek === todayDow);

  const nextDay = useMemo(() => {
    if (!plan) return null;
    for (let i = 1; i <= 7; i++) {
      const dow = (todayDow + i) % 7;
      const d = plan.days.find((day) => day.dayOfWeek === dow && !day.isRestDay);
      if (d) return { day: d, offset: i };
    }
    return null;
  }, [plan, todayDow]);

  const todaySessionDone = data.sessions.find((s) => s.date === isoDate(today) && s.status === 'completed');

  const thisWeek = weekSessions(data);
  const completedThisWeek = thisWeek.filter((s) => s.status === 'completed');
  const plannedTrainingDays = plan ? plan.days.filter((d) => !d.isRestDay).length : 0;
  const complianceRate = plannedTrainingDays > 0
    ? Math.round((completedThisWeek.length / plannedTrainingDays) * 100)
    : 0;

  const weekVolume = completedThisWeek.reduce((sum, s) => sum + sessionVolume(s), 0);
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  const monthVolume = data.sessions
    .filter((s) => s.status === 'completed' && new Date(s.date) >= monthStart)
    .reduce((sum, s) => sum + sessionVolume(s), 0);

  const weekCardioMin = Math.round(
    completedThisWeek.reduce((sum, s) => sum + sessionCardioMinutes(data, s), 0),
  );

  const streak = currentStreak(data);

  const sortedWeights = [...data.bodyWeightEntries].sort((a, b) => (a.date < b.date ? 1 : -1));
  const currentWeight = sortedWeights[0];
  const monthAgoWeight = sortedWeights.find((w) => {
    const diffDays = (Date.now() - new Date(w.date).getTime()) / 86400000;
    return diffDays >= 28;
  });
  const weightDelta = currentWeight && monthAgoWeight ? currentWeight.weight - monthAgoWeight.weight : null;

  // Progression / stagnation across all exercises with history.
  const exerciseIdsWithHistory = Array.from(new Set(
    data.sessions.filter((s) => s.status === 'completed')
      .flatMap((s) => s.performedExercises.map((pe) => pe.exerciseId)),
  ));
  const suggestions = exerciseIdsWithHistory
    .map((id) => suggestProgression(data, id))
    .filter((s): s is NonNullable<typeof s> => !!s);
  const progressing = suggestions.filter((s) => s.message.includes('aumentar'));
  const stagnant = suggestions.filter((s) => s.message.includes('progressão'));

  const recentPRs = [...data.personalRecords]
    .sort((a, b) => (a.date < b.date ? 1 : -1))
    .slice(0, 3);

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto space-y-5">
      <header className="flex items-center justify-between">
        <div>
          <p className="text-sm text-[var(--text-dim)]">
            {today.toLocaleDateString('pt-PT', { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
          <h1 className="font-display text-3xl font-bold tracking-tight">Dashboard</h1>
        </div>
        {streak > 0 && (
          <Badge tone="accent">🔥 {streak} {streak === 1 ? 'dia' : 'dias'} seguidos</Badge>
        )}
      </header>

      {/* Today */}
      <Card accent className="p-5">
        <p className="text-xs uppercase tracking-wide text-[var(--text-dim)] mb-1">Hoje</p>
        {!plan ? (
          <EmptyState
            title="Sem plano ativo"
            message="Cria um plano de treino para veres aqui o treino de hoje."
            action={<Button onClick={() => navigate('/planos')}>Criar plano</Button>}
          />
        ) : todayDay?.isRestDay || !todayDay ? (
          <div>
            <p className="font-display text-2xl font-semibold">Dia de descanso</p>
            {nextDay && (
              <p className="text-sm text-[var(--text-dim)] mt-1">
                Próximo treino: <span className="text-[var(--text)] font-medium">{nextDay.day.name}</span> ({nextDay.offset === 1 ? 'amanhã' : `em ${nextDay.offset} dias`})
              </p>
            )}
          </div>
        ) : todaySessionDone ? (
          <div>
            <p className="font-display text-2xl font-semibold">{todayDay.name}</p>
            <Badge tone="positive">✓ Treino concluído hoje</Badge>
          </div>
        ) : (
          <div>
            <p className="font-display text-2xl font-semibold">{todayDay.name}</p>
            <p className="text-sm text-[var(--text-dim)] mt-1">
              {todayDay.exercises.length} exercícios · {todayDay.exercises.reduce((s, e) => s + e.sets, 0)} séries planeadas
            </p>
            <Button
              size="lg"
              className="mt-4 w-full sm:w-auto"
              onClick={() => navigate(`/treino/novo?planId=${plan.id}&dayId=${todayDay.id}`)}
            >
              Começar treino
            </Button>
          </div>
        )}
      </Card>

      {/* This week */}
      <Card className="p-5">
        <p className="text-xs uppercase tracking-wide text-[var(--text-dim)] mb-3">Esta semana</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <BigStat label="Treinos" value={`${completedThisWeek.length} / ${plannedTrainingDays || '–'}`} />
          <BigStat
            label="Cumprimento"
            value={`${complianceRate}%`}
            tone={complianceRate >= 80 ? 'positive' : complianceRate >= 50 ? 'neutral' : 'negative'}
          />
          <BigStat label="Volume" value={`${Math.round(weekVolume).toLocaleString('pt-PT')} kg`} />
          <BigStat label="Cardio" value={`${weekCardioMin} min`} />
        </div>
      </Card>

      {/* Progress */}
      <div className="grid sm:grid-cols-2 gap-5">
        <Card className="p-5">
          <p className="text-xs uppercase tracking-wide text-[var(--text-dim)] mb-3">Peso corporal</p>
          {currentWeight ? (
            <BigStat
              label=""
              value={`${currentWeight.weight} kg`}
              sub={weightDelta != null ? `${weightDelta >= 0 ? '+' : ''}${weightDelta.toFixed(1)} kg este mês` : undefined}
              tone={weightDelta == null ? 'neutral' : weightDelta > 0 ? 'positive' : weightDelta < 0 ? 'negative' : 'neutral'}
            />
          ) : (
            <p className="text-sm text-[var(--text-dim)]">Sem registos ainda.</p>
          )}
        </Card>
        <Card className="p-5">
          <p className="text-xs uppercase tracking-wide text-[var(--text-dim)] mb-3">Volume mensal</p>
          <BigStat label="" value={`${Math.round(monthVolume).toLocaleString('pt-PT')} kg`} />
        </Card>
      </div>

      {/* Progression insight */}
      {(progressing.length > 0 || stagnant.length > 0) && (
        <Card className="p-5">
          <p className="text-xs uppercase tracking-wide text-[var(--text-dim)] mb-3">Progressão</p>
          <div className="space-y-2">
            {progressing.slice(0, 3).map((s) => (
              <ExerciseSuggestionRow key={s.exerciseId} exerciseId={s.exerciseId} message={s.message} suggestedWeight={s.suggestedWeight} tone="positive" />
            ))}
            {stagnant.slice(0, 3).map((s) => (
              <ExerciseSuggestionRow key={s.exerciseId} exerciseId={s.exerciseId} message={s.message} tone="warn" />
            ))}
          </div>
        </Card>
      )}

      {/* Recent PRs */}
      {recentPRs.length > 0 && (
        <Card className="p-5">
          <p className="text-xs uppercase tracking-wide text-[var(--text-dim)] mb-3">Recordes recentes</p>
          <div className="space-y-2">
            {recentPRs.map((pr) => {
              const ex = data.exercises.find((e) => e.id === pr.exerciseId);
              return (
                <div key={pr.id} className="flex items-center justify-between text-sm">
                  <span>🏆 {ex?.name ?? 'Exercício'}</span>
                  <span className="tabular font-semibold">
                    {pr.type === 'max_weight' && `${pr.value} kg`}
                    {pr.type === 'max_reps' && `${pr.value} reps`}
                    {pr.type === 'max_volume' && `${Math.round(pr.value)} kg vol.`}
                    {pr.type === 'estimated_1rm' && `~${pr.value} kg 1RM`}
                  </span>
                </div>
              );
            })}
          </div>
        </Card>
      )}
    </div>
  );
}

function ExerciseSuggestionRow({ exerciseId, message, suggestedWeight, tone }: { exerciseId: string; message: string; suggestedWeight?: number; tone: 'positive' | 'warn' }) {
  const { data } = useApp();
  const ex = data.exercises.find((e) => e.id === exerciseId);
  return (
    <div className="flex items-start justify-between gap-3 text-sm">
      <div>
        <span className="font-medium">{ex?.name ?? 'Exercício'}</span>
        <span className="text-[var(--text-dim)]"> — {message}</span>
      </div>
      {suggestedWeight != null && <Badge tone={tone}>{suggestedWeight} kg</Badge>}
    </div>
  );
}
