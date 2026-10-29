import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { translatePlanDayName, translateSeedExerciseName, useTranslation } from '../lib/i18n';
import { Card, BigStat, Badge, Button, EmptyState } from './ui';
import {
  weekSessions, sessionVolume, currentStreak, isoDate, suggestProgression, sessionCardioMinutes,
} from '../lib/calculations';
import { getScheduled, findSessionForItem, isItemDone, addDaysISO, parseISODate } from '../lib/schedule';

function activePlanOf(plans: ReturnType<typeof useApp>['data']['plans']) {
  return plans.find((p) => p.isActive && !p.archived);
}

export function Dashboard() {
  const { data, postponeWorkout } = useApp();
  const { t, dateLocale } = useTranslation();
  const navigate = useNavigate();
  const plan = activePlanOf(data.plans);

  const today = new Date();
  const todayISO = isoDate(today);
  const todayItem = plan ? getScheduled(data, todayISO) : null;
  const todayDay = plan && todayItem ? plan.days.find((d) => d.id === todayItem.dayId) : undefined;
  const todaySession = todayItem ? findSessionForItem(data, todayItem) : undefined;
  const todaySessionDone = todaySession?.status === 'completed';
  const shortDate = (iso: string) => parseISODate(iso).toLocaleDateString(dateLocale, { weekday: 'short', day: '2-digit', month: '2-digit' });

  // Próximo treino pendente (respeita os adiamentos) e, se hoje foi adiado, para onde foi.
  const { nextDay, postponedTo } = useMemo(() => {
    let next: { day: NonNullable<typeof todayDay>; offset: number; date: string } | null = null;
    let moved: { day: NonNullable<typeof todayDay>; date: string } | null = null;
    if (plan) {
      for (let i = 1; i <= 14; i++) {
        const date = addDaysISO(todayISO, i);
        const item = getScheduled(data, date);
        if (!item || isItemDone(data, item)) continue;
        const day = plan.days.find((d) => d.id === item.dayId);
        if (!day) continue;
        if (!next) next = { day, offset: i, date };
        if (!moved && item.originalDate === todayISO) moved = { day, date };
      }
    }
    return { nextDay: next, postponedTo: moved };
  }, [data, plan, todayISO]);

  function handlePostpone() {
    if (!window.confirm(t('Adiar este treino? Os treinos seguintes também avançam um dia, até ao próximo dia de descanso.'))) return;
    if (!postponeWorkout(todayISO)) window.alert(t('Não há um dia livre nos próximos dias para absorver o adiamento.'));
  }

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
    <div className="p-5 md:p-10 max-w-6xl mx-auto space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-[var(--text-dim)]">
            {today.toLocaleDateString(dateLocale, { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
          <h1 className="font-display text-3xl md:text-4xl font-bold tracking-tight mt-1">{t('O teu resumo')}</h1>
        </div>
        {streak > 0 && (
          <Badge tone="accent">{t(streak === 1 ? 'Sequência · {{count}} dia' : 'Sequência · {{count}} dias', { count: streak })}</Badge>
        )}
      </header>

      {/* Today */}
      <Card accent className="p-6 md:p-7">
        <p className="text-sm font-semibold text-[var(--accent)] mb-3">{t('Treino de hoje')}</p>
        {!plan ? (
          <EmptyState
            title={t('Sem plano ativo')}
            message={t('Cria um plano de treino para veres aqui o treino de hoje.')}
            action={<Button onClick={() => navigate('/planos')}>{t('Criar plano')}</Button>}
          />
        ) : !todayDay || !todayItem ? (
          <div>
            {postponedTo ? (
              <>
                <p className="font-display text-2xl md:text-3xl font-semibold">{t('Treino adiado')}</p>
                <p className="text-sm text-[var(--text-dim)] mt-1">
                  {translatePlanDayName(postponedTo.day.name, t)} → {shortDate(postponedTo.date)}
                </p>
              </>
            ) : (
              <p className="font-display text-2xl md:text-3xl font-semibold">{t('Dia de descanso')}</p>
            )}
            {nextDay && (
              <p className="text-sm text-[var(--text-dim)] mt-1">
                {t('Próximo treino: ')}<span className="text-[var(--text)] font-medium">{translatePlanDayName(nextDay.day.name, t)}</span> ({nextDay.offset === 1 ? t('amanhã') : t('em {{count}} dias', { count: nextDay.offset })})
              </p>
            )}
          </div>
        ) : todaySessionDone ? (
          <div>
            <p className="font-display text-2xl md:text-3xl font-semibold mb-2">{translatePlanDayName(todayDay.name, t)}</p>
            <Badge tone="positive">✓ {t('Treino concluído hoje')}</Badge>
          </div>
        ) : (
          <div>
            <p className="font-display text-2xl md:text-3xl font-semibold">{translatePlanDayName(todayDay.name, t)}</p>
            {todayItem.originalDate !== todayISO && (
              <div className="mt-1"><Badge tone="warn">↷ {t('Adiado · dia original: {{date}}', { date: shortDate(todayItem.originalDate) })}</Badge></div>
            )}
            <p className="text-sm text-[var(--text-dim)] mt-1">
              {todayDay.exercises.length} {t('exercícios')} · {todayDay.exercises.reduce((s, e) => s + e.sets, 0)} {t('séries planeadas')}
            </p>
            <div className="mt-4 flex flex-col sm:flex-row gap-2">
              <Button
                size="lg"
                className="w-full sm:w-auto"
                onClick={() => todaySession?.status === 'in_progress'
                  ? navigate(`/treino/${todaySession.id}`)
                  : navigate(`/treino/novo?planId=${plan.id}&dayId=${todayDay.id}&plannedDate=${todayItem.originalDate}`)}
              >
                {todaySession?.status === 'in_progress' ? t('Continuar treino') : t('Começar treino')}
              </Button>
              {todaySession?.status !== 'in_progress' && (
                <Button size="lg" variant="secondary" className="w-full sm:w-auto" onClick={handlePostpone}>
                  {t('Adiar treino')}
                </Button>
              )}
            </div>
          </div>
        )}
      </Card>

      {/* This week */}
      <Card className="p-5 md:p-6">
        <p className="text-sm font-semibold mb-4">{t('Esta semana')}</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <BigStat label={t('Treinos')} value={`${completedThisWeek.length} / ${plannedTrainingDays || '–'}`} />
          <BigStat
            label={t('Cumprimento')}
            value={plannedTrainingDays > 0 ? `${complianceRate}%` : '–'}
            tone={plannedTrainingDays === 0 ? 'neutral' : complianceRate >= 80 ? 'positive' : complianceRate >= 50 ? 'neutral' : 'negative'}
          />
          <BigStat label={t('Volume')} value={`${Math.round(weekVolume).toLocaleString(dateLocale)} kg`} />
          <BigStat label={t('Cardio')} value={`${weekCardioMin} ${t('min')}`} />
        </div>
      </Card>

      {/* Progress */}
      <div className="grid sm:grid-cols-2 gap-5">
        <Card className="p-5 md:p-6">
          <p className="text-sm font-semibold mb-3">{t('Peso corporal')}</p>
          {currentWeight ? (
            <BigStat
              label=""
              value={`${currentWeight.weight} kg`}
              sub={weightDelta != null ? `${weightDelta >= 0 ? '+' : ''}${weightDelta.toFixed(1)} kg ${t('este mês')}` : undefined}
              tone={weightDelta == null ? 'neutral' : weightDelta > 0 ? 'positive' : weightDelta < 0 ? 'negative' : 'neutral'}
            />
          ) : (
            <p className="text-sm text-[var(--text-dim)]">{t('Sem registos ainda.')}</p>
          )}
        </Card>
        <Card className="p-5 md:p-6">
          <p className="text-sm font-semibold mb-3">{t('Volume este mês')}</p>
          <BigStat label="" value={`${Math.round(monthVolume).toLocaleString(dateLocale)} kg`} />
        </Card>
      </div>

      {/* Progression insight */}
      {(progressing.length > 0 || stagnant.length > 0) && (
        <Card className="p-5 md:p-6">
          <p className="text-sm font-semibold mb-3">{t('Sugestões para progredir')}</p>
          <div className="space-y-2">
            {progressing.slice(0, 3).map((s) => (
              <ExerciseSuggestionRow key={s.exerciseId} exerciseId={s.exerciseId} message={s.message} stagnantSessions={s.stagnantSessions} suggestedWeight={s.suggestedWeight} tone="positive" />
            ))}
            {stagnant.slice(0, 3).map((s) => (
              <ExerciseSuggestionRow key={s.exerciseId} exerciseId={s.exerciseId} message={s.message} stagnantSessions={s.stagnantSessions} tone="warn" />
            ))}
          </div>
        </Card>
      )}

      {/* Recent PRs */}
      {recentPRs.length > 0 && (
        <Card className="p-5 md:p-6">
          <p className="text-sm font-semibold mb-3">{t('Recordes pessoais recentes')}</p>
          <div className="space-y-2">
            {recentPRs.map((pr) => {
              const ex = data.exercises.find((e) => e.id === pr.exerciseId);
              return (
                <div key={pr.id} className="flex items-center justify-between gap-4 text-sm border-b last:border-0 border-[var(--border)] py-2 first:pt-0 last:pb-0">
                  <span>{ex ? translateSeedExerciseName(ex.name, t) : t('Exercício')}</span>
                  <span className="tabular font-semibold">
                    {pr.type === 'max_weight' && `${pr.value} kg`}
                    {pr.type === 'max_reps' && `${pr.value} ${t('reps')}`}
                    {pr.type === 'max_volume' && `${Math.round(pr.value)} kg ${t('vol.')}`}
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

function ExerciseSuggestionRow({ exerciseId, message, stagnantSessions, suggestedWeight, tone }: { exerciseId: string; message: string; stagnantSessions?: number; suggestedWeight?: number; tone: 'positive' | 'warn' }) {
  const { data } = useApp();
  const { t } = useTranslation();
  const ex = data.exercises.find((e) => e.id === exerciseId);
  return (
    <div className="flex items-start justify-between gap-3 text-sm">
      <div>
        <span className="font-medium">{ex ? translateSeedExerciseName(ex.name, t) : t('Exercício')}</span>
        <span className="text-[var(--text-dim)]"> — {t(message, stagnantSessions == null ? undefined : { count: stagnantSessions })}</span>
      </div>
      {suggestedWeight != null && <Badge tone={tone}>{suggestedWeight} kg</Badge>}
    </div>
  );
}
