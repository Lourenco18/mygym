import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams, Link } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { Button, Card, NumberStepper, Badge, EmptyState } from './ui';
import { performedHistoryForExercise, isCardioExercise } from '../lib/calculations';
import type { PlannedExercise, ExerciseSet } from '../types';
import { translatePlanDayName, translateSeedExerciseName, useTranslation } from '../lib/i18n';

export function NewWorkoutRedirect() {
  const [params] = useSearchParams();
  const { data, startSession } = useApp();
  const { t } = useTranslation();
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

  return <div className="p-8 text-center text-[var(--text-dim)]">{t('A preparar treino...')}</div>;
}

export function WorkoutMode() {
  const { sessionId } = useParams();
  const { data, getSession, addPerformedExercise, addSet, updateSet, removeSet, finishSession } = useApp();
  const { t, dateLocale } = useTranslation();
  const navigate = useNavigate();
  const session = getSession(sessionId ?? '');

  const plan = data.plans.find((p) => p.id === session?.planId);
  const day = plan?.days.find((d) => d.id === session?.dayId);
  const plannedExercises = useMemo(
    () => [...(day?.exercises ?? [])].sort((a, b) => a.order - b.order),
    [day],
  );

  const [index, setIndex] = useState(0);
  const [showAddExercise, setShowAddExercise] = useState(false);

  const currentPlanned: PlannedExercise | undefined = plannedExercises[index];
  // Freestyle exercises added beyond the plan live only in performedExercises.
  const freestyle = session?.performedExercises.filter(
    (pe) => !plannedExercises.some((p) => p.exerciseId === pe.exerciseId && p.id === pe.plannedExerciseId),
  ) ?? [];
  const totalSteps = plannedExercises.length + freestyle.filter((f) => !plannedExercises[index] || true).length;

  const showingFreestyleIndex = index - plannedExercises.length;
  const currentIsFreestyle = index >= plannedExercises.length;
  const currentFreestylePe = currentIsFreestyle ? freestyle[showingFreestyleIndex] : undefined;

  let performed = currentPlanned
    ? session?.performedExercises.find((pe) => pe.plannedExerciseId === currentPlanned.id)
    : currentFreestylePe;

  const currentExerciseId = currentPlanned?.exerciseId ?? currentFreestylePe?.exerciseId;
  const ex = data.exercises.find((e) => e.id === currentExerciseId);

  // Lazily create the PerformedExercise + its planned sets on first view.
  useEffect(() => {
    if (!session || !currentPlanned || performed) return;
    const pe = addPerformedExercise(session.id, currentPlanned.exerciseId, currentPlanned.id);
    const exForPlanned = data.exercises.find((e) => e.id === currentPlanned.exerciseId);
    if (isCardioExercise(exForPlanned)) {
      addSet(session.id, pe.id, {
        durationSeconds: currentPlanned.targetDurationSeconds ?? null,
        distanceKm: currentPlanned.targetDistanceKm ?? null,
      });
    } else if (currentPlanned.repType === 'time') {
      for (let i = 0; i < currentPlanned.sets; i++) {
        addSet(session.id, pe.id, {
          durationSeconds: currentPlanned.targetDurationSeconds ?? null,
        });
      }
    } else {
      for (let i = 0; i < currentPlanned.sets; i++) {
        addSet(session.id, pe.id, {});
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPlanned?.id]);

  if (!session) {
    return <div className="p-8"><EmptyState title={t('Treino não encontrado')} message={t('Esta sessão pode ter sido apagada.')} action={<Link to="/"><Button>{t('Voltar ao início')}</Button></Link>} /></div>;
  }

  const freshSession = getSession(session.id); // re-read after effects
  const livePerformed = currentPlanned
    ? freshSession?.performedExercises.find((pe) => pe.plannedExerciseId === currentPlanned.id)
    : freshSession?.performedExercises.find((pe) => pe.id === currentFreestylePe?.id);

  const history = currentExerciseId ? performedHistoryForExercise(data, currentExerciseId) : [];
  const lastSession = history[0];

  const isLastStep = index >= plannedExercises.length + freestyle.length - 1;

  function completeSet(setId: string, patch: Partial<ExerciseSet>) {
    if (!livePerformed || !session) return;
    updateSet(session.id, livePerformed.id, setId, { ...patch, completed: true });
  }

  function goNext() {
    if (!session) return;
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
        <Link to="/" className="text-sm text-[var(--text-dim)]">← {t('Sair')}</Link>
        <p className="text-sm text-[var(--text-dim)]">{translatePlanDayName(session.dayName, t)}</p>
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
              <p className="font-display text-2xl font-bold">{translateSeedExerciseName(ex.name, t)}</p>
              {currentPlanned && (
                <p className="text-sm text-[var(--text-dim)] mt-0.5 tabular">
                  {isCardioExercise(ex) ? (
                    <>
                      {t('Objetivo:')} {currentPlanned.targetDurationSeconds ? `${Math.round(currentPlanned.targetDurationSeconds / 60)} ${t('min')}` : t('tempo livre')}
                      {currentPlanned.targetDistanceKm ? ` · ${currentPlanned.targetDistanceKm} km` : ''}
                    </>
                  ) : currentPlanned.repType === 'time' ? (
                    <>{t('Objetivo:')} {currentPlanned.sets} × {currentPlanned.targetDurationSeconds ? formatDuration(currentPlanned.targetDurationSeconds, t) : t('tempo livre')}</>
                  ) : (
                    <>
                      {t('Objetivo:')} {currentPlanned.sets} × {currentPlanned.repType === 'range' ? `${currentPlanned.repsMin}-${currentPlanned.repsMax}` : currentPlanned.repType === 'failure' ? t('até à falha') : currentPlanned.repsMin}
                      {!ex.isBodyweight && currentPlanned.targetWeight ? ` @ ${currentPlanned.targetWeight} kg` : ''}
                    </>
                  )}
                </p>
              )}
            </div>
            <Badge>{index + 1} / {plannedExercises.length + freestyle.length}</Badge>
          </div>

          {lastSession && (
            <div className="mt-3 pt-3 border-t border-[var(--border)] text-xs text-[var(--text-dim)]">
              {t('Último treino ({{date}}):', { date: new Date(lastSession.session.date + 'T00:00:00').toLocaleDateString(dateLocale, { day: '2-digit', month: '2-digit' }) })}{' '}
              <span className="tabular text-[var(--text)]">
                {isCardioExercise(ex)
                  ? lastSession.pe.sets.filter((s) => s.completed).map((s) => `${s.durationSeconds ? Math.round(s.durationSeconds / 60) : '–'} ${t('min')}${s.distanceKm ? ` · ${s.distanceKm} km` : ''}`).join(' / ')
                  : currentPlanned?.repType === 'time'
                    ? lastSession.pe.sets.filter((s) => s.completed).map((s) => formatDuration(s.durationSeconds ?? 0, t)).join(' / ')
                    : lastSession.pe.sets.filter((s) => s.completed).map((s) => ex.isBodyweight ? `${s.reps} ${t('reps')}` : `${s.weight}×${s.reps}`).join(' / ')}
              </span>
            </div>
          )}

          {currentPlanned?.notes && (
            <p className="mt-2 text-xs italic text-[var(--text-dim)]">"{currentPlanned.notes}"</p>
          )}
        </Card>
      )}

      {livePerformed && (
        <div className="space-y-3">
          {livePerformed.sets.map((set, i) => (
            <SetEditor
              key={set.id}
              index={i}
              set={set}
              isBodyweight={!!ex?.isBodyweight}
              isCardio={isCardioExercise(ex)}
              isTimed={currentPlanned?.repType === 'time'}
              onComplete={(patch) => completeSet(set.id, patch)}
              onUpdate={(patch) => updateSet(session.id, livePerformed.id, set.id, patch)}
              onRemove={() => removeSet(session.id, livePerformed.id, set.id)}
            />
          ))}
          <Button
            variant="secondary"
            className="w-full"
            onClick={() => addSet(session.id, livePerformed.id, { isExtra: true })}
          >
            + {t('Adicionar série')}
          </Button>
        </div>
      )}


      <div className="flex gap-2 pt-2">
        <Button
          variant="ghost"
          disabled={index === 0}
          onClick={() => setIndex((i) => Math.max(0, i - 1))}
        >
          ← {t('Anterior')}
        </Button>
        <Button className="flex-1" size="lg" onClick={goNext}>
          {isLastStep ? t('Terminar treino') : `${t('Próximo exercício')} →`}
        </Button>
      </div>
    </div>
  );
}

function SetEditor({
  index, set, isBodyweight, isCardio, isTimed, onComplete, onUpdate, onRemove,
}: {
  index: number;
  set: import('../types').ExerciseSet;
  isBodyweight: boolean;
  isCardio: boolean;
  isTimed: boolean;
  onComplete: (patch: Partial<import('../types').ExerciseSet>) => void;
  onUpdate: (patch: Partial<import('../types').ExerciseSet>) => void;
  onRemove: () => void;
}) {
  const { t } = useTranslation();
  const [reps, setReps] = useState(set.reps ?? 0);
  const [weight, setWeight] = useState(set.weight ?? 0);
  const [durationMin, setDurationMin] = useState(set.durationSeconds != null ? set.durationSeconds / 60 : 0);
  const [durationSeconds, setDurationSeconds] = useState(set.durationSeconds ?? 0);
  const [distance, setDistance] = useState(set.distanceKm ?? 0);

  if (isCardio) {
    return (
      <Card className={`p-4 ${set.completed ? 'opacity-70' : ''}`}>
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-semibold">{t('Cardio')} {set.isExtra && <Badge tone="accent">{t('extra')}</Badge>}</p>
          <button onClick={onRemove} className="text-xs text-[var(--negative)]">{t('Remover')}</button>
        </div>
        <div className="grid grid-cols-2 gap-3 mb-3">
          <div>
            <p className="text-xs text-[var(--text-dim)] mb-1">{t('Duração (min)')}</p>
            <NumberStepper value={durationMin} onChange={setDurationMin} step={1} min={0} />
          </div>
          <div>
            <p className="text-xs text-[var(--text-dim)] mb-1">{t('Distância (km, opcional)')}</p>
            <NumberStepper value={distance} onChange={setDistance} step={0.5} min={0} decimals={1} />
          </div>
        </div>
        {set.completed ? (
          <Badge tone="positive">✓ {t('Concluído')} — {set.durationSeconds ? Math.round(set.durationSeconds / 60) : 0} {t('min')}{set.distanceKm ? ` · ${set.distanceKm} km` : ''}</Badge>
        ) : (
          <Button
            className="w-full"
            onClick={() => onComplete({ durationSeconds: Math.round(durationMin * 60), distanceKm: distance || undefined })}
          >
            ✓ {t('Concluir')}
          </Button>
        )}
      </Card>
    );
  }

  if (isTimed) {
    return (
      <Card className={`p-4 ${set.completed ? 'opacity-70' : ''}`}>
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-semibold">
            {t('Série')} {index + 1} {set.isExtra && <Badge tone="accent">{t('extra')}</Badge>}
          </p>
          <button onClick={onRemove} className="text-xs text-[var(--negative)]">{t('Remover')}</button>
        </div>
        <div className="mb-3">
          <p className="text-xs text-[var(--text-dim)] mb-1">{t('Duração (segundos)')}</p>
          <NumberStepper value={durationSeconds} onChange={setDurationSeconds} step={5} min={0} />
        </div>
        {set.completed ? (
          <Badge tone="positive">✓ {t('Concluída')} — {formatDuration(set.durationSeconds ?? 0, t)}</Badge>
        ) : (
          <Button className="w-full" onClick={() => onComplete({ durationSeconds })}>✓ {t('Concluir série')}</Button>
        )}
      </Card>
    );
  }

  return (
    <Card className={`p-4 ${set.completed ? 'opacity-70' : ''}`}>
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-semibold">
          {t('Série')} {index + 1} {set.isExtra && <Badge tone="accent">{t('extra')}</Badge>}
        </p>
        <button onClick={onRemove} className="text-xs text-[var(--negative)]">{t('Remover')}</button>
      </div>
      <div className={`grid ${isBodyweight ? 'grid-cols-1' : 'grid-cols-2'} gap-3 mb-3`}>
        {!isBodyweight && (
          <div>
            <p className="text-xs text-[var(--text-dim)] mb-1">{t('Peso (kg)')}</p>
            <NumberStepper value={weight} onChange={setWeight} step={2.5} min={0} decimals={1} />
          </div>
        )}
        <div>
          <p className="text-xs text-[var(--text-dim)] mb-1">{t('Repetições')}</p>
          <NumberStepper value={reps} onChange={setReps} step={1} min={0} />
        </div>
      </div>
      {set.completed ? (
        <Badge tone="positive">
          ✓ {t('Concluída')} — {isBodyweight ? `${set.reps} ${t('reps')}` : `${set.weight} kg × ${set.reps}`}
        </Badge>
      ) : (
        <Button className="w-full" onClick={() => onComplete(isBodyweight ? { reps } : { weight, reps })}>✓ {t('Concluir série')}</Button>
      )}
    </Card>
  );
}

export function WorkoutSummary() {
  const { sessionId } = useParams();
  const { data } = useApp();
  const { t } = useTranslation();
  const session = data.sessions.find((s) => s.id === sessionId);

  if (!session) return <div className="p-8"><EmptyState title={t('Sessão não encontrada')} message="" /></div>;

  const totalSets = session.performedExercises.reduce(
    (s, pe) => s + (isCardioExercise(data.exercises.find((ex) => ex.id === pe.exerciseId)) ? 0 : pe.sets.filter((x) => x.completed).length),
    0,
  );
  const totalVolume = session.performedExercises.reduce(
    (s, pe) => s + pe.sets.reduce((v, set) => v + (set.completed && set.weight && set.reps ? set.weight * set.reps : 0), 0),
    0,
  );
  const totalCardioMin = Math.round(session.performedExercises.reduce(
    (s, pe) => s + (isCardioExercise(data.exercises.find((ex) => ex.id === pe.exerciseId))
      ? pe.sets.reduce((v, set) => v + (set.completed && set.durationSeconds ? set.durationSeconds / 60 : 0), 0)
      : 0),
    0,
  ));

  return (
    <div className="p-4 md:p-8 max-w-2xl mx-auto space-y-5 text-center">
      <p className="font-display text-3xl font-bold mt-6">{t('Treino concluído 💪')}</p>
      <p className="text-[var(--text-dim)]">{translatePlanDayName(session.dayName, t)}</p>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 max-w-sm sm:max-w-md mx-auto">
        <Card className="p-4"><p className="text-xs text-[var(--text-dim)]">{t('Séries')}</p><p className="font-display text-3xl font-bold tabular">{totalSets}</p></Card>
        <Card className="p-4"><p className="text-xs text-[var(--text-dim)]">{t('Volume')}</p><p className="font-display text-3xl font-bold tabular">{Math.round(totalVolume)} kg</p></Card>
        {totalCardioMin > 0 && (
          <Card className="p-4"><p className="text-xs text-[var(--text-dim)]">{t('Cardio')}</p><p className="font-display text-3xl font-bold tabular">{totalCardioMin} {t('min')}</p></Card>
        )}
      </div>
      <Link to="/"><Button size="lg">{t('Voltar ao dashboard')}</Button></Link>
    </div>
  );
}

function formatDuration(seconds: number, t: ReturnType<typeof useTranslation>['t']): string {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  if (minutes === 0) return `${seconds} ${t('s')}`;
  return remainingSeconds === 0 ? `${minutes} ${t('min')}` : `${minutes} ${t('min')} ${remainingSeconds} ${t('s')}`;
}
