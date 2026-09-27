import React, { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react';
import type {
  AppData, Exercise, WorkoutPlan, WorkoutDay, WorkoutSession, PerformedExercise,
  ExerciseSet, BodyWeightEntry, CardioEntry, NutritionEntry, Goal, PersonalRecord,
  MissedReason, PRType,
} from '../types';
import { loadData, saveData, saveDataImmediate } from '../lib/storage';
import { makeId } from '../lib/id';
import { estimate1RM, isoDate } from '../lib/calculations';

interface AppContextValue {
  data: AppData;
  setData: React.Dispatch<React.SetStateAction<AppData>>;

  // Exercises
  addExercise: (ex: Omit<Exercise, 'id' | 'createdAt'>) => Exercise;
  updateExercise: (id: string, patch: Partial<Exercise>) => void;
  archiveExercise: (id: string) => void;

  // Plans
  addPlan: (plan: Omit<WorkoutPlan, 'id' | 'createdAt' | 'updatedAt' | 'days' | 'isActive' | 'archived'>) => WorkoutPlan;
  updatePlan: (id: string, patch: Partial<WorkoutPlan>) => void;
  deletePlan: (id: string) => void;
  duplicatePlan: (id: string) => void;
  setActivePlan: (id: string) => void;
  archivePlan: (id: string) => void;
  addDay: (planId: string, day: Omit<WorkoutDay, 'id' | 'exercises'>) => void;
  updateDay: (planId: string, dayId: string, patch: Partial<WorkoutDay>) => void;
  deleteDay: (planId: string, dayId: string) => void;
  duplicateDay: (planId: string, dayId: string) => void;
  addPlannedExercise: (planId: string, dayId: string, plannedExercise: Omit<import('../types').PlannedExercise, 'id' | 'order'>) => void;
  updatePlannedExercise: (planId: string, dayId: string, peId: string, patch: Partial<import('../types').PlannedExercise>) => void;
  removePlannedExercise: (planId: string, dayId: string, peId: string) => void;
  reorderPlannedExercises: (planId: string, dayId: string, orderedIds: string[]) => void;

  // Sessions / workout mode
  startSession: (opts: { planId?: string; dayId?: string; dayName: string }) => WorkoutSession;
  getSession: (id: string) => WorkoutSession | undefined;
  updateSession: (id: string, patch: Partial<WorkoutSession>) => void;
  finishSession: (id: string) => void;
  markMissed: (opts: { planId?: string; dayId?: string; dayName: string; date: string; reason?: MissedReason }) => void;
  addPerformedExercise: (sessionId: string, exerciseId: string, plannedExerciseId?: string) => PerformedExercise;
  addSet: (sessionId: string, performedExerciseId: string, set?: Partial<ExerciseSet>) => void;
  updateSet: (sessionId: string, performedExerciseId: string, setId: string, patch: Partial<ExerciseSet>) => void;
  removeSet: (sessionId: string, performedExerciseId: string, setId: string) => void;
  deleteSession: (id: string) => void;

  // Body weight / cardio / nutrition
  addBodyWeight: (entry: Omit<BodyWeightEntry, 'id'>) => void;
  updateBodyWeight: (id: string, patch: Partial<BodyWeightEntry>) => void;
  removeBodyWeight: (id: string) => void;
  addCardio: (entry: Omit<CardioEntry, 'id'>) => void;
  updateCardio: (id: string, patch: Partial<CardioEntry>) => void;
  removeCardio: (id: string) => void;
  addNutrition: (entry: Omit<NutritionEntry, 'id'>) => void;
  setNutritionGoal: (calories: number, protein: number) => void;

  // Goals
  addGoal: (goal: Omit<Goal, 'id' | 'createdAt'>) => void;
  updateGoal: (id: string, patch: Partial<Goal>) => void;
  removeGoal: (id: string) => void;

  // Import/export handled in Settings directly via storage.ts helpers
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState<AppData>(() => loadData());

  useEffect(() => {
    saveData(data);
  }, [data]);

  // Flush on unload so navigating away never loses last edits.
  useEffect(() => {
    const handler = () => saveDataImmediate(data);
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [data]);

  const addExercise = useCallback((ex: Omit<Exercise, 'id' | 'createdAt'>) => {
    const newEx: Exercise = { ...ex, id: makeId(), createdAt: new Date().toISOString() };
    setData((d) => ({ ...d, exercises: [...d.exercises, newEx] }));
    return newEx;
  }, []);

  const updateExercise = useCallback((id: string, patch: Partial<Exercise>) => {
    setData((d) => ({
      ...d,
      exercises: d.exercises.map((e) => (e.id === id ? { ...e, ...patch } : e)),
    }));
  }, []);

  const archiveExercise = useCallback((id: string) => {
    setData((d) => ({
      ...d,
      exercises: d.exercises.map((e) => (e.id === id ? { ...e, archived: true } : e)),
    }));
  }, []);

  const addPlan = useCallback((plan: Omit<WorkoutPlan, 'id' | 'createdAt' | 'updatedAt' | 'days' | 'isActive' | 'archived'>) => {
    const now = new Date().toISOString();
    const newPlan: WorkoutPlan = {
      ...plan,
      id: makeId(),
      days: [],
      isActive: false,
      archived: false,
      createdAt: now,
      updatedAt: now,
    };
    setData((d) => ({ ...d, plans: [...d.plans, newPlan] }));
    return newPlan;
  }, []);

  const touchPlan = (d: AppData, planId: string, fn: (p: WorkoutPlan) => WorkoutPlan): AppData => ({
    ...d,
    plans: d.plans.map((p) => (p.id === planId ? { ...fn(p), updatedAt: new Date().toISOString() } : p)),
  });

  const updatePlan = useCallback((id: string, patch: Partial<WorkoutPlan>) => {
    setData((d) => touchPlan(d, id, (p) => ({ ...p, ...patch })));
  }, []);

  const deletePlan = useCallback((id: string) => {
    setData((d) => ({ ...d, plans: d.plans.filter((p) => p.id !== id) }));
  }, []);

  const duplicatePlan = useCallback((id: string) => {
    setData((d) => {
      const original = d.plans.find((p) => p.id === id);
      if (!original) return d;
      const now = new Date().toISOString();
      const clone: WorkoutPlan = {
        ...original,
        id: makeId(),
        name: `${original.name} (cópia)`,
        isActive: false,
        createdAt: now,
        updatedAt: now,
        days: original.days.map((day) => ({
          ...day,
          id: makeId(),
          exercises: day.exercises.map((pe) => ({ ...pe, id: makeId() })),
        })),
      };
      return { ...d, plans: [...d.plans, clone] };
    });
  }, []);

  const setActivePlan = useCallback((id: string) => {
    setData((d) => ({
      ...d,
      plans: d.plans.map((p) => ({ ...p, isActive: p.id === id })),
    }));
  }, []);

  const archivePlan = useCallback((id: string) => {
    setData((d) => touchPlan(d, id, (p) => ({ ...p, archived: !p.archived })));
  }, []);

  const addDay = useCallback((planId: string, day: Omit<WorkoutDay, 'id' | 'exercises'>) => {
    setData((d) => touchPlan(d, planId, (p) => ({
      ...p,
      days: [...p.days, { ...day, id: makeId(), exercises: [] }],
    })));
  }, []);

  const updateDay = useCallback((planId: string, dayId: string, patch: Partial<WorkoutDay>) => {
    setData((d) => touchPlan(d, planId, (p) => ({
      ...p,
      days: p.days.map((day) => (day.id === dayId ? { ...day, ...patch } : day)),
    })));
  }, []);

  const deleteDay = useCallback((planId: string, dayId: string) => {
    setData((d) => touchPlan(d, planId, (p) => ({
      ...p,
      days: p.days.filter((day) => day.id !== dayId),
    })));
  }, []);

  const duplicateDay = useCallback((planId: string, dayId: string) => {
    setData((d) => touchPlan(d, planId, (p) => {
      const original = p.days.find((day) => day.id === dayId);
      if (!original) return p;
      const clone: WorkoutDay = {
        ...original,
        id: makeId(),
        name: `${original.name} (cópia)`,
        exercises: original.exercises.map((pe) => ({ ...pe, id: makeId() })),
      };
      return { ...p, days: [...p.days, clone] };
    }));
  }, []);

  const addPlannedExercise = useCallback((planId: string, dayId: string, pe: Omit<import('../types').PlannedExercise, 'id' | 'order'>) => {
    setData((d) => touchPlan(d, planId, (p) => ({
      ...p,
      days: p.days.map((day) => day.id === dayId
        ? { ...day, exercises: [...day.exercises, { ...pe, id: makeId(), order: day.exercises.length }] }
        : day),
    })));
  }, []);

  const updatePlannedExercise = useCallback((planId: string, dayId: string, peId: string, patch: Partial<import('../types').PlannedExercise>) => {
    setData((d) => touchPlan(d, planId, (p) => ({
      ...p,
      days: p.days.map((day) => day.id === dayId
        ? { ...day, exercises: day.exercises.map((pe) => (pe.id === peId ? { ...pe, ...patch } : pe)) }
        : day),
    })));
  }, []);

  const removePlannedExercise = useCallback((planId: string, dayId: string, peId: string) => {
    setData((d) => touchPlan(d, planId, (p) => ({
      ...p,
      days: p.days.map((day) => day.id === dayId
        ? { ...day, exercises: day.exercises.filter((pe) => pe.id !== peId) }
        : day),
    })));
  }, []);

  const reorderPlannedExercises = useCallback((planId: string, dayId: string, orderedIds: string[]) => {
    setData((d) => touchPlan(d, planId, (p) => ({
      ...p,
      days: p.days.map((day) => {
        if (day.id !== dayId) return day;
        const byId = new Map(day.exercises.map((pe) => [pe.id, pe]));
        const reordered = orderedIds.map((id, idx) => ({ ...byId.get(id)!, order: idx }));
        return { ...day, exercises: reordered };
      }),
    })));
  }, []);

  const startSession = useCallback((opts: { planId?: string; dayId?: string; dayName: string }) => {
    const session: WorkoutSession = {
      id: makeId(),
      planId: opts.planId,
      dayId: opts.dayId,
      dayName: opts.dayName,
      date: isoDate(),
      startedAt: new Date().toISOString(),
      status: 'in_progress',
      performedExercises: [],
    };
    setData((d) => ({ ...d, sessions: [session, ...d.sessions] }));
    return session;
  }, []);

  const getSession = useCallback((id: string) => data.sessions.find((s) => s.id === id), [data.sessions]);

  const touchSession = (d: AppData, sessionId: string, fn: (s: WorkoutSession) => WorkoutSession): AppData => ({
    ...d,
    sessions: d.sessions.map((s) => (s.id === sessionId ? fn(s) : s)),
  });

  const updateSession = useCallback((id: string, patch: Partial<WorkoutSession>) => {
    setData((d) => touchSession(d, id, (s) => ({ ...s, ...patch })));
  }, []);

  const detectAndRecordPRs = (d: AppData, session: WorkoutSession): AppData => {
    let newRecords: PersonalRecord[] = [...d.personalRecords];
    for (const pe of session.performedExercises) {
      const completedSets = pe.sets.filter((s) => s.completed && s.weight != null && s.reps != null);
      if (!completedSets.length) continue;

      const priorSessions = d.sessions.filter((s) => s.status === 'completed' && s.id !== session.id && s.date <= session.date);
      const priorSets = priorSessions.flatMap((s) =>
        s.performedExercises.filter((p) => p.exerciseId === pe.exerciseId).flatMap((p) => p.sets),
      ).filter((s) => s.completed && s.weight != null && s.reps != null);

      const checkPR = (type: PRType, currentBest: number, computeFromSet: (s: ExerciseSet) => number) => {
        const priorBest = priorSets.length
          ? Math.max(...priorSets.map(computeFromSet))
          : -Infinity;
        if (currentBest > priorBest) {
          newRecords = newRecords.filter((r) => !(r.exerciseId === pe.exerciseId && r.type === type && r.sessionId !== session.id && r.date > session.date));
          newRecords.push({
            id: makeId(),
            exerciseId: pe.exerciseId,
            type,
            value: currentBest,
            date: session.date,
            sessionId: session.id,
          });
        }
      };

      checkPR('max_weight', Math.max(...completedSets.map((s) => s.weight!)), (s) => s.weight!);
      checkPR('max_reps', Math.max(...completedSets.map((s) => s.reps!)), (s) => s.reps!);
      const volume = completedSets.reduce((sum, s) => sum + s.weight! * s.reps!, 0);
      checkPR('max_volume', volume, () => 0); // volume compared against session totals below is approximate
      const best1RM = Math.max(...completedSets.map((s) => estimate1RM(s.weight!, s.reps!)));
      checkPR('estimated_1rm', best1RM, (s) => estimate1RM(s.weight!, s.reps!));
    }
    return { ...d, personalRecords: newRecords };
  };

  const finishSession = useCallback((id: string) => {
    setData((d) => {
      const session = d.sessions.find((s) => s.id === id);
      if (!session) return d;
      const finished: WorkoutSession = {
        ...session,
        status: 'completed',
        finishedAt: new Date().toISOString(),
        durationSeconds: session.startedAt
          ? Math.round((Date.now() - new Date(session.startedAt).getTime()) / 1000)
          : undefined,
      };
      let next = touchSession(d, id, () => finished);
      next = detectAndRecordPRs(next, finished);
      return next;
    });
  }, []);

  const markMissed = useCallback((opts: { planId?: string; dayId?: string; dayName: string; date: string; reason?: MissedReason }) => {
    const session: WorkoutSession = {
      id: makeId(),
      planId: opts.planId,
      dayId: opts.dayId,
      dayName: opts.dayName,
      date: opts.date,
      status: 'missed',
      performedExercises: [],
      missedReason: opts.reason,
    };
    setData((d) => ({ ...d, sessions: [session, ...d.sessions] }));
  }, []);

  const addPerformedExercise = useCallback((sessionId: string, exerciseId: string, plannedExerciseId?: string) => {
    const pe: PerformedExercise = {
      id: makeId(),
      exerciseId,
      plannedExerciseId,
      order: 0,
      sets: [],
    };
    setData((d) => touchSession(d, sessionId, (s) => ({
      ...s,
      performedExercises: [...s.performedExercises, { ...pe, order: s.performedExercises.length }],
    })));
    return pe;
  }, []);

  const addSet = useCallback((sessionId: string, performedExerciseId: string, set?: Partial<ExerciseSet>) => {
    setData((d) => touchSession(d, sessionId, (s) => ({
      ...s,
      performedExercises: s.performedExercises.map((pe) => {
        if (pe.id !== performedExerciseId) return pe;
        const newSet: ExerciseSet = {
          id: makeId(),
          setNumber: pe.sets.length + 1,
          weight: set?.weight ?? null,
          reps: set?.reps ?? null,
          rir: set?.rir ?? null,
          completed: false,
          isExtra: set?.isExtra ?? pe.sets.length >= (set?.setNumber ?? Infinity) ? set?.isExtra : undefined,
        };
        return { ...pe, sets: [...pe.sets, newSet] };
      }),
    })));
  }, []);

  const updateSet = useCallback((sessionId: string, performedExerciseId: string, setId: string, patch: Partial<ExerciseSet>) => {
    setData((d) => touchSession(d, sessionId, (s) => ({
      ...s,
      performedExercises: s.performedExercises.map((pe) => pe.id !== performedExerciseId ? pe : ({
        ...pe,
        sets: pe.sets.map((set) => (set.id === setId ? { ...set, ...patch } : set)),
      })),
    })));
  }, []);

  const removeSet = useCallback((sessionId: string, performedExerciseId: string, setId: string) => {
    setData((d) => touchSession(d, sessionId, (s) => ({
      ...s,
      performedExercises: s.performedExercises.map((pe) => pe.id !== performedExerciseId ? pe : ({
        ...pe,
        sets: pe.sets.filter((set) => set.id !== setId).map((set, idx) => ({ ...set, setNumber: idx + 1 })),
      })),
    })));
  }, []);

  const deleteSession = useCallback((id: string) => {
    setData((d) => ({ ...d, sessions: d.sessions.filter((s) => s.id !== id) }));
  }, []);

  const addBodyWeight = useCallback((entry: Omit<BodyWeightEntry, 'id'>) => {
    setData((d) => ({ ...d, bodyWeightEntries: [...d.bodyWeightEntries, { ...entry, id: makeId() }] }));
  }, []);
  const updateBodyWeight = useCallback((id: string, patch: Partial<BodyWeightEntry>) => {
    setData((d) => ({ ...d, bodyWeightEntries: d.bodyWeightEntries.map((e) => (e.id === id ? { ...e, ...patch } : e)) }));
  }, []);
  const removeBodyWeight = useCallback((id: string) => {
    setData((d) => ({ ...d, bodyWeightEntries: d.bodyWeightEntries.filter((e) => e.id !== id) }));
  }, []);

  const addCardio = useCallback((entry: Omit<CardioEntry, 'id'>) => {
    setData((d) => ({ ...d, cardioEntries: [...d.cardioEntries, { ...entry, id: makeId() }] }));
  }, []);
  const updateCardio = useCallback((id: string, patch: Partial<CardioEntry>) => {
    setData((d) => ({ ...d, cardioEntries: d.cardioEntries.map((e) => (e.id === id ? { ...e, ...patch } : e)) }));
  }, []);
  const removeCardio = useCallback((id: string) => {
    setData((d) => ({ ...d, cardioEntries: d.cardioEntries.filter((e) => e.id !== id) }));
  }, []);

  const addNutrition = useCallback((entry: Omit<NutritionEntry, 'id'>) => {
    setData((d) => {
      const withoutSameDate = d.nutritionEntries.filter((e) => e.date !== entry.date);
      return { ...d, nutritionEntries: [...withoutSameDate, { ...entry, id: makeId() }] };
    });
  }, []);

  const setNutritionGoal = useCallback((calories: number, protein: number) => {
    setData((d) => ({ ...d, nutritionGoal: { calories, protein } }));
  }, []);

  const addGoal = useCallback((goal: Omit<Goal, 'id' | 'createdAt'>) => {
    setData((d) => ({ ...d, goals: [...d.goals, { ...goal, id: makeId(), createdAt: new Date().toISOString() }] }));
  }, []);
  const updateGoal = useCallback((id: string, patch: Partial<Goal>) => {
    setData((d) => ({ ...d, goals: d.goals.map((g) => (g.id === id ? { ...g, ...patch } : g)) }));
  }, []);
  const removeGoal = useCallback((id: string) => {
    setData((d) => ({ ...d, goals: d.goals.filter((g) => g.id !== id) }));
  }, []);

  const value = useMemo<AppContextValue>(() => ({
    data, setData,
    addExercise, updateExercise, archiveExercise,
    addPlan, updatePlan, deletePlan, duplicatePlan, setActivePlan, archivePlan,
    addDay, updateDay, deleteDay, duplicateDay,
    addPlannedExercise, updatePlannedExercise, removePlannedExercise, reorderPlannedExercises,
    startSession, getSession, updateSession, finishSession, markMissed,
    addPerformedExercise, addSet, updateSet, removeSet, deleteSession,
    addBodyWeight, updateBodyWeight, removeBodyWeight,
    addCardio, updateCardio, removeCardio,
    addNutrition, setNutritionGoal,
    addGoal, updateGoal, removeGoal,
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [data]);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp deve ser usado dentro de <AppProvider>');
  return ctx;
}
