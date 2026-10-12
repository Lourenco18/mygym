import type { AppData } from '../types';
import { STORAGE_KEY, STORAGE_VERSION } from '../config';
import { buildSeedExercises } from './seed';

function defaultData(): AppData {
  return {
    version: STORAGE_VERSION,
    profile: { name: 'Atleta' },
    exercises: buildSeedExercises(),
    plans: [],
    sessions: [],
    bodyWeightEntries: [],
    nutritionEntries: [],
    nutritionGoal: { calories: 2800, protein: 160 },
    goals: [],
    personalRecords: [],
  };
}

export function loadData(): AppData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const fresh = defaultData();
      saveData(fresh);
      return fresh;
    }
    const parsed = JSON.parse(raw) as Partial<AppData>;
    // Merge with defaults so newly-added fields never crash old data.
    const base = defaultData();
    return {
      ...base,
      ...parsed,
      profile: { ...base.profile, ...(parsed.profile ?? {}) },
      nutritionGoal: { ...base.nutritionGoal, ...(parsed.nutritionGoal ?? {}) },
      exercises: parsed.exercises && parsed.exercises.length ? parsed.exercises : base.exercises,
    };
  } catch (err) {
    console.error('Falha ao carregar dados, a usar dados por omissão.', err);
    return defaultData();
  }
}

let saveTimeout: ReturnType<typeof setTimeout> | null = null;

export function saveData(data: AppData) {
  // Debounce slightly so rapid successive updates (e.g. typing) don't thrash storage.
  if (saveTimeout) clearTimeout(saveTimeout);
  saveTimeout = setTimeout(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (err) {
      console.error('Falha ao guardar dados.', err);
    }
  }, 150);
}

export function saveDataImmediate(data: AppData) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (err) {
    console.error('Falha ao guardar dados.', err);
  }
}

export function exportJSON(data: AppData): string {
  return JSON.stringify(data, null, 2);
}

export function importJSON(json: string): AppData {
  const parsed = JSON.parse(json) as AppData;
  if (!parsed || typeof parsed !== 'object' || !Array.isArray(parsed.exercises)) {
    throw new Error('Ficheiro inválido.');
  }
  return parsed;
}

export function exportSessionsCSV(data: AppData): string {
  const rows: string[] = [];
  rows.push(['Data', 'Treino', 'Exercicio', 'Serie', 'Peso', 'Reps', 'RPE', 'Duracao(min)', 'Distancia(km)', 'Concluida'].join(';'));
  for (const session of data.sessions) {
    for (const pe of session.performedExercises) {
      const ex = data.exercises.find((e) => e.id === pe.exerciseId);
      for (const set of pe.sets) {
        rows.push(
          [
            session.date,
            session.dayName,
            ex?.name ?? pe.exerciseId,
            String(set.setNumber),
            set.weight ?? '',
            set.reps ?? '',
            set.rpe ?? '',
            set.durationSeconds != null ? (set.durationSeconds / 60).toFixed(1) : '',
            set.distanceKm ?? '',
            set.completed ? 'sim' : 'nao',
          ].join(';'),
        );
      }
    }
  }
  return rows.join('\n');
}
