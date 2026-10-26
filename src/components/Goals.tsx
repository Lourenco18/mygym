import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Button, Card, Field, Input, Select, Modal, EmptyState, Badge } from './ui';
import type { Goal, GoalMetric } from '../types';
import { weekSessions } from '../lib/calculations';
import { translateSeedExerciseName, useTranslation } from '../lib/i18n';

export function GoalsPage() {
  const { data, removeGoal } = useApp();
  const { t } = useTranslation();
  const [showAdd, setShowAdd] = useState(false);

  return (
    <div className="p-4 md:p-8 max-w-3xl mx-auto space-y-5">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-3xl font-bold tracking-tight">{t('Objetivos')}</h1>
        <Button size="sm" onClick={() => setShowAdd(true)}>{t('Novo objetivo')}</Button>
      </header>

      {data.goals.length === 0 ? (
        <EmptyState title={t('Sem objetivos')} message={t('Define objetivos de peso, força ou frequência de treino.')} action={<Button size="sm" onClick={() => setShowAdd(true)}>{t('Novo objetivo')}</Button>} />
      ) : (
        <div className="space-y-3">
          {data.goals.map((goal) => (
            <GoalCard key={goal.id} goal={goal} onRemove={() => removeGoal(goal.id)} />
          ))}
        </div>
      )}

      <AddGoalModal open={showAdd} onClose={() => setShowAdd(false)} />
    </div>
  );
}

function currentValueFor(data: ReturnType<typeof useApp>['data'], goal: Goal): number | null {
  if (goal.metric === 'bodyweight') {
    const sorted = [...data.bodyWeightEntries].sort((a, b) => (a.date < b.date ? 1 : -1));
    return sorted[0]?.weight ?? null;
  }
  if (goal.metric === 'exercise_weight' && goal.exerciseId) {
    const sessions = data.sessions.filter((s) => s.status === 'completed');
    let best = 0;
    for (const s of sessions) {
      for (const pe of s.performedExercises) {
        if (pe.exerciseId !== goal.exerciseId) continue;
        for (const set of pe.sets) {
          if (set.completed && set.weight != null) best = Math.max(best, set.weight);
        }
      }
    }
    return best || null;
  }
  if (goal.metric === 'exercise_reps' && goal.exerciseId) {
    const sessions = data.sessions.filter((s) => s.status === 'completed');
    let best = 0;
    for (const s of sessions) {
      for (const pe of s.performedExercises) {
        if (pe.exerciseId !== goal.exerciseId) continue;
        for (const set of pe.sets) {
          if (set.completed && set.reps != null) best = Math.max(best, set.reps);
        }
      }
    }
    return best || null;
  }
  if (goal.metric === 'workouts_per_week') {
    return weekSessions(data).filter((s) => s.status === 'completed').length;
  }
  return null;
}

function GoalCard({ goal, onRemove }: { goal: Goal; onRemove: () => void }) {
  const { data } = useApp();
  const { t } = useTranslation();
  const current = currentValueFor(data, goal);
  const start = goal.startValue ?? 0;
  const target = goal.targetValue;
  let progressPct = 0;
  if (current != null) {
    if (target === start) progressPct = 100;
    else progressPct = Math.max(0, Math.min(100, Math.round(((current - start) / (target - start)) * 100)));
  }
  const ex = goal.exerciseId ? data.exercises.find((e) => e.id === goal.exerciseId) : undefined;

  return (
    <Card className="p-4">
      <div className="flex items-start justify-between">
        <div>
          <p className="font-medium text-sm">{goal.title}{ex ? ` — ${translateSeedExerciseName(ex.name, t)}` : ''}</p>
          <p className="text-xs text-[var(--text-dim)] tabular mt-0.5">
            {current != null ? `${current} / ${target} ${t(goal.unit).toLowerCase()}` : `${t('Objetivo:')} ${target} ${t(goal.unit).toLowerCase()}`}
          </p>
        </div>
        <button onClick={onRemove} className="text-xs text-[var(--negative)]">{t('Remover')}</button>
      </div>
      {current != null && (
        <div className="mt-3">
          <div className="h-2 rounded-full bg-[var(--border)] overflow-hidden">
            <div className="h-full bg-[var(--accent)]" style={{ width: `${progressPct}%` }} />
          </div>
          <p className="text-xs text-[var(--text-dim)] mt-1 tabular">{progressPct}%</p>
        </div>
      )}
    </Card>
  );
}

function AddGoalModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { data, addGoal } = useApp();
  const { t } = useTranslation();
  const [title, setTitle] = useState('');
  const [metric, setMetric] = useState<GoalMetric>('bodyweight');
  const [exerciseId, setExerciseId] = useState('');
  const [target, setTarget] = useState('');
  const [unit, setUnit] = useState('kg');

  function save() {
    if (!title.trim() || !target) return;
    addGoal({
      title: title.trim(),
      metric,
      exerciseId: (metric === 'exercise_weight' || metric === 'exercise_reps') ? exerciseId : undefined,
      targetValue: Number(target),
      unit,
    });
    setTitle(''); setTarget('');
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose} title={t('Criar objetivo')}>
      <div className="space-y-4">
        <Field label={t('Título')}><Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={t('Chegar aos 80kg no supino')} autoFocus /></Field>
        <Field label={t('Métrica')}>
          <Select value={metric} onChange={(e) => { setMetric(e.target.value as GoalMetric); setUnit(e.target.value === 'bodyweight' ? 'kg' : e.target.value === 'exercise_weight' ? 'kg' : e.target.value === 'exercise_reps' ? 'reps' : e.target.value === 'workouts_per_week' ? 'treinos' : ''); }}>
            <option value="bodyweight">{t('Peso corporal')}</option>
            <option value="exercise_weight">{t('Peso num exercício')}</option>
            <option value="exercise_reps">{t('Repetições num exercício')}</option>
            <option value="workouts_per_week">{t('Treinos por semana')}</option>
            <option value="custom">{t('Personalizado')}</option>
          </Select>
        </Field>
        {(metric === 'exercise_weight' || metric === 'exercise_reps') && (
          <Field label={t('Exercícios')}>
            <Select value={exerciseId} onChange={(e) => setExerciseId(e.target.value)}>
              <option value="">{t('Seleciona um exercício')}</option>
              {data.exercises.filter((e) => !e.archived).map((e) => <option key={e.id} value={e.id}>{translateSeedExerciseName(e.name, t)}</option>)}
            </Select>
          </Field>
        )}
        <div className="grid grid-cols-2 gap-3">
          <Field label={t('Valor alvo')}><Input type="number" value={target} onChange={(e) => setTarget(e.target.value)} /></Field>
          <Field label={t('Unidade')}><Input value={unit} onChange={(e) => setUnit(e.target.value)} /></Field>
        </div>
        <Button className="w-full" onClick={save} disabled={!title.trim() || !target}>{t('Criar objetivo')}</Button>
      </div>
    </Modal>
  );
}
