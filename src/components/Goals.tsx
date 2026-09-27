import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Button, Card, Field, Input, Select, Modal, EmptyState, Badge } from './ui';
import type { Goal, GoalMetric } from '../types';
import { weekSessions } from '../lib/calculations';

export function GoalsPage() {
  const { data, removeGoal } = useApp();
  const [showAdd, setShowAdd] = useState(false);

  return (
    <div className="p-4 md:p-8 max-w-3xl mx-auto space-y-5">
      <header className="flex items-center justify-between">
        <h1 className="font-display text-3xl font-bold tracking-tight">Objetivos</h1>
        <Button onClick={() => setShowAdd(true)}>+ Criar objetivo</Button>
      </header>

      {data.goals.length === 0 ? (
        <EmptyState title="Sem objetivos" message="Define objetivos de peso, força ou frequência de treino." action={<Button onClick={() => setShowAdd(true)}>+ Criar objetivo</Button>} />
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
          <p className="font-medium text-sm">{goal.title}{ex ? ` — ${ex.name}` : ''}</p>
          <p className="text-xs text-[var(--text-dim)] tabular mt-0.5">
            {current != null ? `${current} / ${target} ${goal.unit}` : `Objetivo: ${target} ${goal.unit}`}
          </p>
        </div>
        <button onClick={onRemove} className="text-xs text-[var(--negative)]">Remover</button>
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
    <Modal open={open} onClose={onClose} title="Criar objetivo">
      <div className="space-y-4">
        <Field label="Título"><Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Chegar aos 80kg no supino" autoFocus /></Field>
        <Field label="Métrica">
          <Select value={metric} onChange={(e) => { setMetric(e.target.value as GoalMetric); setUnit(e.target.value === 'bodyweight' ? 'kg' : e.target.value === 'exercise_weight' ? 'kg' : e.target.value === 'exercise_reps' ? 'reps' : e.target.value === 'workouts_per_week' ? 'treinos' : ''); }}>
            <option value="bodyweight">Peso corporal</option>
            <option value="exercise_weight">Peso num exercício</option>
            <option value="exercise_reps">Repetições num exercício</option>
            <option value="workouts_per_week">Treinos por semana</option>
            <option value="custom">Personalizado</option>
          </Select>
        </Field>
        {(metric === 'exercise_weight' || metric === 'exercise_reps') && (
          <Field label="Exercício">
            <Select value={exerciseId} onChange={(e) => setExerciseId(e.target.value)}>
              <option value="">Seleciona um exercício</option>
              {data.exercises.filter((e) => !e.archived).map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
            </Select>
          </Field>
        )}
        <div className="grid grid-cols-2 gap-3">
          <Field label="Valor alvo"><Input type="number" value={target} onChange={(e) => setTarget(e.target.value)} /></Field>
          <Field label="Unidade"><Input value={unit} onChange={(e) => setUnit(e.target.value)} /></Field>
        </div>
        <Button className="w-full" onClick={save} disabled={!title.trim() || !target}>Criar objetivo</Button>
      </div>
    </Modal>
  );
}
