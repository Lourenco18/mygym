import type {
  AppData,
  Exercise,
  ExerciseSet,
  PerformedExercise,
  WorkoutSession,
} from '../types';

export function isCardioExercise(ex: Exercise | undefined | null): boolean {
  return ex?.muscleGroup === 'Cardio';
}

export function setDurationMinutes(set: ExerciseSet): number {
  if (!set.completed || set.durationSeconds == null) return 0;
  return set.durationSeconds / 60;
}

export function sessionCardioMinutes(data: AppData, session: WorkoutSession): number {
  let total = 0;
  for (const pe of session.performedExercises) {
    const ex = data.exercises.find((e) => e.id === pe.exerciseId);
    if (!isCardioExercise(ex)) continue;
    for (const set of pe.sets) total += setDurationMinutes(set);
  }
  return total;
}

export function setVolume(set: ExerciseSet): number {
  if (!set.completed || set.weight == null || set.reps == null) return 0;
  return set.weight * set.reps;
}

export function performedExerciseVolume(pe: PerformedExercise): number {
  return pe.sets.reduce((sum, s) => sum + setVolume(s), 0);
}

export function sessionVolume(session: WorkoutSession): number {
  return session.performedExercises.reduce((sum, pe) => sum + performedExerciseVolume(pe), 0);
}

export function sessionSetCount(session: WorkoutSession): number {
  return session.performedExercises.reduce(
    (sum, pe) => sum + pe.sets.filter((s) => s.completed).length,
    0,
  );
}

/** Epley formula — used only as a statistical estimate, never shown as fact. */
export function estimate1RM(weight: number, reps: number): number {
  if (reps <= 1) return weight;
  return Math.round(weight * (1 + reps / 30) * 10) / 10;
}

export function bestSetOfExercise(pe: PerformedExercise): ExerciseSet | null {
  const completed = pe.sets.filter((s) => s.completed && s.weight != null && s.reps != null);
  if (!completed.length) return null;
  return completed.reduce((best, s) => {
    const bestVal = estimate1RM(best.weight!, best.reps!);
    const val = estimate1RM(s.weight!, s.reps!);
    return val > bestVal ? s : best;
  });
}

export function isoDate(d: Date = new Date()): string {
  return d.toISOString().slice(0, 10);
}

export function startOfWeek(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay(); // 0 Sun..6 Sat
  const diff = (day + 6) % 7; // days since Monday
  d.setDate(d.getDate() - diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function inRange(dateStr: string, start: Date, end: Date): boolean {
  const t = new Date(dateStr + 'T00:00:00').getTime();
  return t >= start.getTime() && t <= end.getTime();
}

export function weekSessions(data: AppData, reference: Date = new Date()): WorkoutSession[] {
  const start = startOfWeek(reference);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  return data.sessions.filter((s) => inRange(s.date, start, end));
}

export function lastNDaysSessions(data: AppData, n: number, reference: Date = new Date()): WorkoutSession[] {
  const end = new Date(reference);
  end.setHours(23, 59, 59, 999);
  const start = new Date(reference);
  start.setDate(start.getDate() - (n - 1));
  start.setHours(0, 0, 0, 0);
  return data.sessions.filter((s) => inRange(s.date, start, end));
}

export function complianceRate(sessions: WorkoutSession[]): { completed: number; planned: number; rate: number } {
  const planned = sessions.filter((s) => s.status !== undefined).length;
  const completed = sessions.filter((s) => s.status === 'completed').length;
  const rate = planned === 0 ? 0 : Math.round((completed / planned) * 100);
  return { completed, planned, rate };
}

/** Current consecutive-day streak of completed workouts, counting back from today. */
export function currentStreak(data: AppData): number {
  const completedDates = new Set(
    data.sessions.filter((s) => s.status === 'completed').map((s) => s.date),
  );
  let streak = 0;
  const cursor = new Date();
  // Allow "today" to not break the streak if no session yet logged today.
  if (!completedDates.has(isoDate(cursor))) {
    cursor.setDate(cursor.getDate() - 1);
  }
  while (completedDates.has(isoDate(cursor))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

export interface ProgressionSuggestion {
  exerciseId: string;
  message: string;
  suggestedWeight?: number;
}

/**
 * Looks only at the last completed session containing this exercise vs. its
 * plan target. Never mutates the plan — purely a suggestion for the user.
 */
export function suggestProgression(
  data: AppData,
  exerciseId: string,
): ProgressionSuggestion | null {
  const history = performedHistoryForExercise(data, exerciseId);
  if (history.length === 0) return null;
  const [latest] = history;
  const completedSets = latest.pe.sets.filter((s) => s.completed && s.weight != null && s.reps != null);
  if (completedSets.length === 0) return null;

  // Find the plan target (repsMax) from any plan referencing this exercise.
  let repsMax: number | undefined;
  for (const plan of data.plans) {
    for (const day of plan.days) {
      const match = day.exercises.find((e) => e.exerciseId === exerciseId);
      if (match?.repsMax) repsMax = match.repsMax;
    }
  }

  const allAtOrAboveTarget = repsMax
    ? completedSets.every((s) => (s.reps ?? 0) >= repsMax!)
    : false;

  if (allAtOrAboveTarget) {
    const maxWeight = Math.max(...completedSets.map((s) => s.weight ?? 0));
    const suggestedWeight = Math.round((maxWeight + (maxWeight >= 20 ? 2.5 : 1)) * 2) / 2;
    return {
      exerciseId,
      message: 'Boa oportunidade para aumentar o peso.',
      suggestedWeight,
    };
  }

  // Detect stagnation: same top weight across last 3+ sessions.
  if (history.length >= 3) {
    const topWeights = history.slice(0, 4).map((h) => {
      const sets = h.pe.sets.filter((s) => s.completed && s.weight != null);
      return sets.length ? Math.max(...sets.map((s) => s.weight ?? 0)) : 0;
    });
    const stagnant = topWeights.every((w) => w === topWeights[0]) && topWeights.length >= 3;
    if (stagnant) {
      return {
        exerciseId,
        message: `Sem progressão de peso há ${topWeights.length} sessões.`,
      };
    }
  }

  return null;
}

export function performedHistoryForExercise(
  data: AppData,
  exerciseId: string,
): { session: WorkoutSession; pe: PerformedExercise }[] {
  const result: { session: WorkoutSession; pe: PerformedExercise }[] = [];
  for (const session of data.sessions) {
    if (session.status !== 'completed') continue;
    for (const pe of session.performedExercises) {
      if (pe.exerciseId === exerciseId && pe.sets.some((s) => s.completed)) {
        result.push({ session, pe });
      }
    }
  }
  result.sort((a, b) => (a.session.date < b.session.date ? 1 : -1));
  return result;
}
