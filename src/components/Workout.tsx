import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams, Link } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { Button, Card, NumberStepper, Badge, EmptyState } from './ui';
import { performedHistoryForExercise } from '../lib/calculations';
import type { PlannedExercise } from '../types';

export function NewWorkoutRedirect() {
  const [params] = useSearchParams();
  const { data, startSession } = useApp();
  const navigate = useNavigate();
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const planId = params.get('planId') ?? undefined;
    const dayId = params.get('dayId') ?? undefined;
    const plan = data.plans.find((p) => p.id === planId);
    const day = plan?.days.find((d) => d.id === dayId);
    const session = startSession({ planId, dayId, dayName: day?.name ?? 'Treino livre' });
    navigate(`/treino/${session.id}`, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <div className="p-8 text-center text-[var(--text-dim)]">A preparar treino...</div>;
}

export function WorkoutMode() {
  const { sessionId } = useParams();
  const { data, getSession, addPerformedExercise, addSet, updateSet, removeSet, finishSession } = useApp();
  const navigate = useNavigate();
  const session = getSession(sessionId ?? '');

  const plan = data.plans.find((p) => p.id === session?.planId);
  const day = plan?.days.find((d) => d.id === session?.dayId);
  const plannedExercises = useMemo(
    () => [...(day?.exercises ?? [])].sort((a, b) => a.order - b.order),
    [day],
  );

  const [index, setIndex] = useState(0);
  const [restRemaining, setRestRemaining] = useState<number | null>(null);
  const [showAddExercise, setShowAddExercise] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  useEffect(() => {
    if (restRemaining == null) return;
    if (restRemaining <= 0) {
      if (timerRef.current) clearInterval(timerRef.current);
      setRestRemaining(null);
      return;
    }
    timerRef.current = setInterval(() => setRestRemaining((r) => (r == null ? null : r - 1)), 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [restRemaining === null]);

  if (!session) {
    return <div className="p-8"><EmptyState title="Treino não encontrado" message="Esta sessão pode ter sido apagada." action={<Link to="/"><Button>Voltar ao início</Button></Link>} /></div>;
  }

  const currentPlanned: PlannedExercise | undefined = plannedExercises[index];
  // Freestyle exercises added beyond the plan live only in performedExercises.
  const freestyle = session.performedExercises.filter(
    (pe) => !plannedExercises.some((p) => p.exerciseId === pe.exerciseId && p.id === pe.plannedExerciseId),
  );
  const totalSteps = plannedExercises.length + freestyle.filter((f) => !plannedExercises[index] || true).length;

  const showingFreestyleIndex = index - plannedExercises.length;
  const currentIsFreestyle = index >= plannedExercises.length;
  const currentFreestylePe = currentIsFreestyle ? freestyle[showingFreestyleIndex] : undefined;

  let performed = currentPlanned
    ? session.performedExercises.find((pe) => pe.plannedExerciseId === currentPlanned.id)
    : currentFreestylePe;

  const currentExerciseId = currentPlanned?.exerciseId ?? currentFreestylePe?.exerciseId;
  const ex = data.exercises.find((e) => e.id === currentExerciseId);

  // Lazily create the PerformedExercise + its planned sets on first view.
  useEffect(() => {
    if (!currentPlanned || performed) return;
    const pe = addPerformedExercise(session.id, currentPlanned.exerciseId, currentPlanned.id);
    for (let i = 0; i < currentPlanned.sets; i++) {
      addSet(session.id, pe.id, {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPlanned?.id]);

  const freshSession = getSession(session.id); // re-read after effects
  const livePerformed = currentPlanned
    ? freshSession?.performedExercises.find((pe) => pe.plannedExerciseId === currentPlanned.id)
    : freshSession?.performedExercises.find((pe) => pe.id === currentFreestylePe?.id);

  const history = currentExerciseId ? performedHistoryForExercise(data, currentExerciseId) : [];
  const lastSession = history[0];

  const isLastStep = index >= plannedExercises.length + freestyle.length - 1;

  function completeSet(setId: string, weight: number | null, reps: number | null, rir: number | null) {
    if (!livePerformed || !session) return;
    updateSet(session.id, livePerformed.id, setId, { weight, reps, rir, completed: true });
    const rest = currentPlanned?.restSeconds ?? 90;
    setRestRemaining(rest);
  }

  function goNext() {
    if (!session) return;
    setRestRemaining(null);
    if (isLastStep) {
      finishSession(session.id);
      navigate(`/treino/${session.id}/resumo`);
    } else {
      setIndex((i) => i + 1);
    }
  }

  return (
    <div className="min-h-screen p-4 md:p-8 max-w-2xl mx-auto space-y-4 pb-10">
      <div className="flex items-center justify-between">
        <Link to="/" className="text-sm text-[var(--text-dim)]">← Sair</Link>
        <p className="text-sm text-[var(--text-dim)]">{session.dayName}</p>
      </div>

      {/* Progress dots */}
      <div className="flex gap-1.5 flex-wrap">
        {plannedExercises.map((pe, i) => (
          <div key={pe.id} className={`h-1.5 flex-1 min-w-[16px] rounded-full ${i < index ? 'bg-[var(--positive)]' : i === index ? 'bg-[var(--accent)]' : 'bg-[var(--border)]'}`} />
        ))}
      </div>

      {ex && (
        <Card accent className="p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-display text-2xl font-bold">{ex.name}</p>
              {currentPlanned && (
                <p className="text-sm text-[var(--text-dim)] mt-0.5 tabular">
                  Objetivo: {currentPlanned.sets} × {currentPlanned.repType === 'range' ? `${currentPlanned.repsMin}-${currentPlanned.repsMax}` : currentPlanned.repType === 'failure' ? 'até à falha' : currentPlanned.repsMin}
                  {currentPlanned.targetWeight ? ` @ ${currentPlanned.targetWeight} kg` : ''}
                </p>
              )}
            </div>
            <Badge>{index + 1} / {plannedExercises.length + freestyle.length}</Badge>
          </div>

          {lastSession && (
            <div className="mt-3 pt-3 border-t border-[var(--border)] text-xs text-[var(--text-dim)]">
              Último treino ({new Date(lastSession.session.date + 'T00:00:00').toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit' })}):{' '}
              <span className="tabular text-[var(--text)]">
                {lastSession.pe.sets.filter((s) => s.completed).map((s) => `${s.weight}×${s.reps}`).join(' / ')}
              </span>
            </div>
          )}

          {currentPlanned?.notes && (
            <p className="mt-2 text-xs italic text-[var(--text-dim)]">"{currentPlanned.notes}"</p>
          )}
        </Card>
      )}

      {restRemaining != null && (
        <RestTimer
          seconds={restRemaining}
          onAdjust={(delta) => setRestRemaining((r) => Math.max(0, (r ?? 0) + delta))}
          onSkip={() => setRestRemaining(null)}
        />
      )}

      {livePerformed && (
        <div className="space-y-3">
          {livePerformed.sets.map((set, i) => (
            <SetEditor
              key={set.id}
              index={i}
              set={set}
              isBodyweight={!!ex?.isBodyweight}
              onComplete={(weight, reps, rir) => completeSet(set.id, weight, reps, rir)}
              onUpdate={(patch) => updateSet(session.id, livePerformed.id, set.id, patch)}
              onRemove={() => removeSet(session.id, livePerformed.id, set.id)}
            />
          ))}
          <Button
            variant="secondary"
            className="w-full"
            onClick={() => addSet(session.id, livePerformed.id, { isExtra: true })}
          >
            + Adicionar série
          </Button>
        </div>
      )}

      <div className="flex gap-2 pt-2">
        <Button
          variant="ghost"
          disabled={index === 0}
          onClick={() => { setRestRemaining(null); setIndex((i) => Math.max(0, i - 1)); }}
        >
          ← Anterior
        </Button>
        <Button className="flex-1" size="lg" onClick={goNext}>
          {isLastStep ? 'Terminar treino' : 'Próximo exercício →'}
        </Button>
      </div>
    </div>
  );
}

function SetEditor({
  index, set, isBodyweight, onComplete, onUpdate, onRemove,
}: {
  index: number;
  set: import('../types').ExerciseSet;
  isBodyweight: boolean;
  onComplete: (weight: number | null, reps: number | null, rir: number | null) => void;
  onUpdate: (patch: Partial<import('../types').ExerciseSet>) => void;
  onRemove: () => void;
}) {
  const [weight, setWeight] = useState(set.weight ?? 0);
  const [reps, setReps] = useState(set.reps ?? 0);
  const [rir, setRir] = useState(set.rir ?? 2);

  return (
    <Card className={`p-4 ${set.completed ? 'opacity-70' : ''}`}>
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-semibold">
          Série {index + 1} {set.isExtra && <Badge tone="accent">extra</Badge>}
        </p>
        <button onClick={onRemove} className="text-xs text-[var(--negative)]">Remover</button>
      </div>
      <div className="grid grid-cols-2 gap-3 mb-3">
        <div>
          <p className="text-xs text-[var(--text-dim)] mb-1">{isBodyweight ? 'Peso adicional (kg)' : 'Peso (kg)'}</p>
          <NumberStepper value={weight} onChange={setWeight} step={2.5} min={0} decimals={1} />
        </div>
        <div>
          <p className="text-xs text-[var(--text-dim)] mb-1">Repetições</p>
          <NumberStepper value={reps} onChange={setReps} step={1} min={0} />
        </div>
      </div>
      <div className="mb-3">
        <p className="text-xs text-[var(--text-dim)] mb-1">RIR</p>
        <NumberStepper value={rir} onChange={setRir} step={1} min={0} />
      </div>
      {set.completed ? (
        <Badge tone="positive">✓ Concluída — {set.weight} kg × {set.reps}</Badge>
      ) : (
        <Button className="w-full" onClick={() => onComplete(weight, reps, rir)}>✓ Concluir série</Button>
      )}
    </Card>
  );
}

function RestTimer({ seconds, onAdjust, onSkip }: { seconds: number; onAdjust: (d: number) => void; onSkip: () => void }) {
  const mm = Math.floor(seconds / 60).toString().padStart(2, '0');
  const ss = (seconds % 60).toString().padStart(2, '0');
  return (
    <Card className="p-5 text-center bg-[var(--accent)]/5 border-[var(--accent)]/30">
      <p className="text-xs uppercase tracking-wide text-[var(--text-dim)] mb-1">Descanso</p>
      <p className="font-display text-5xl font-bold tabular text-[var(--accent)]">{mm}:{ss}</p>
      <div className="flex justify-center gap-2 mt-4">
        <Button size="sm" variant="secondary" onClick={() => onAdjust(-30)}>−30s</Button>
        <Button size="sm" variant="secondary" onClick={() => onAdjust(30)}>+30s</Button>
        <Button size="sm" variant="ghost" onClick={onSkip}>Saltar</Button>
      </div>
    </Card>
  );
}

export function WorkoutSummary() {
  const { sessionId } = useParams();
  const { data } = useApp();
  const session = data.sessions.find((s) => s.id === sessionId);

  if (!session) return <div className="p-8"><EmptyState title="Sessão não encontrada" message="" /></div>;

  const totalSets = session.performedExercises.reduce((s, pe) => s + pe.sets.filter((x) => x.completed).length, 0);
  const totalVolume = session.performedExercises.reduce(
    (s, pe) => s + pe.sets.reduce((v, set) => v + (set.completed && set.weight && set.reps ? set.weight * set.reps : 0), 0),
    0,
  );

  return (
    <div className="p-4 md:p-8 max-w-2xl mx-auto space-y-5 text-center">
      <p className="font-display text-3xl font-bold mt-6">Treino concluído 💪</p>
      <p className="text-[var(--text-dim)]">{session.dayName}</p>
      <div className="grid grid-cols-2 gap-4 max-w-sm mx-auto">
        <Card className="p-4"><p className="text-xs text-[var(--text-dim)]">Séries</p><p className="font-display text-3xl font-bold tabular">{totalSets}</p></Card>
        <Card className="p-4"><p className="text-xs text-[var(--text-dim)]">Volume</p><p className="font-display text-3xl font-bold tabular">{Math.round(totalVolume)} kg</p></Card>
      </div>
      <Link to="/"><Button size="lg">Voltar ao dashboard</Button></Link>
    </div>
  );
}
