// ---------------------------------------------------------------------------
// Entidades principais da aplicação.
// ---------------------------------------------------------------------------

export type MuscleGroup =
  | 'Peito'
  | 'Costas'
  | 'Ombros'
  | 'Bíceps'
  | 'Tríceps'
  | 'Quadríceps'
  | 'Posterior'
  | 'Glúteos'
  | 'Gémeos'
  | 'Abdominais'
  | 'Trapézio'
  | 'Cardio'
  | 'Outro';

export const MUSCLE_GROUP_LIST: MuscleGroup[] = [
  'Peito', 'Costas', 'Ombros', 'Bíceps', 'Tríceps', 'Quadríceps',
  'Posterior', 'Glúteos', 'Gémeos', 'Abdominais', 'Trapézio', 'Cardio', 'Outro',
];

export type RepType = 'range' | 'fixed' | 'failure' | 'time';

export interface Exercise {
  id: string;
  name: string;
  muscleGroup: MuscleGroup;
  equipment: string;
  notes?: string;
  isBodyweight?: boolean;
  createdAt: string;
  archived?: boolean;
}

export interface PlannedExercise {
  id: string;
  exerciseId: string;
  order: number;
  sets: number;
  repType: RepType;
  repsMin?: number;
  repsMax?: number;
  targetWeight?: number;
  rirMin?: number;
  rirMax?: number;
  restSeconds: number;
  notes?: string;
}

export interface WorkoutDay {
  id: string;
  name: string; // e.g. "Peito + Tríceps + Abs"
  dayOfWeek: number; // 0 = Domingo ... 6 = Sábado
  isRestDay: boolean;
  exercises: PlannedExercise[];
}

export interface WorkoutPlan {
  id: string;
  name: string;
  description?: string;
  days: WorkoutDay[];
  isActive: boolean;
  archived: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ExerciseSet {
  id: string;
  setNumber: number;
  weight: number | null;
  bodyweight?: number | null; // for bodyweight-assisted exercises
  reps: number | null;
  rir?: number | null;
  rpe?: number | null;
  completed: boolean;
  isExtra?: boolean; // added beyond the plan
  notes?: string;
}

export interface PerformedExercise {
  id: string;
  exerciseId: string;
  plannedExerciseId?: string;
  order: number;
  sets: ExerciseSet[];
  notes?: string;
}

export type SessionStatus = 'completed' | 'in_progress' | 'missed';
export type MissedReason = 'Falta de tempo' | 'Descanso' | 'Indisposição' | 'Outro';

export interface WorkoutSession {
  id: string;
  planId?: string;
  dayId?: string;
  dayName: string;
  date: string; // ISO date (yyyy-mm-dd)
  startedAt?: string;
  finishedAt?: string;
  status: SessionStatus;
  performedExercises: PerformedExercise[];
  missedReason?: MissedReason;
  durationSeconds?: number;
}

export interface BodyWeightEntry {
  id: string;
  date: string;
  weight: number;
  waist?: number;
  arm?: number;
  chest?: number;
  leg?: number;
}

export interface CardioEntry {
  id: string;
  date: string;
  type: string;
  durationMinutes: number;
  distanceKm?: number;
  intensity: 'Leve' | 'Moderado' | 'Intenso';
  calories?: number;
  notes?: string;
}

export interface NutritionEntry {
  id: string;
  date: string;
  calories: number;
  protein: number;
}

export interface NutritionGoal {
  calories: number;
  protein: number;
}

export type GoalMetric = 'bodyweight' | 'exercise_weight' | 'exercise_reps' | 'workouts_per_week' | 'custom';

export interface Goal {
  id: string;
  title: string;
  metric: GoalMetric;
  exerciseId?: string;
  targetValue: number;
  startValue?: number;
  unit: string;
  createdAt: string;
  achieved?: boolean;
  achievedAt?: string;
}

export type PRType = 'max_weight' | 'max_reps' | 'max_volume' | 'estimated_1rm';

export interface PersonalRecord {
  id: string;
  exerciseId: string;
  type: PRType;
  value: number;
  date: string;
  sessionId: string;
  details?: string;
}

export interface UserProfile {
  name: string;
  startWeight?: number;
  reminders?: { dayOfWeek: number; time: string; label: string }[];
}

export interface AppData {
  version: number;
  profile: UserProfile;
  exercises: Exercise[];
  plans: WorkoutPlan[];
  sessions: WorkoutSession[];
  bodyWeightEntries: BodyWeightEntry[];
  cardioEntries: CardioEntry[];
  nutritionEntries: NutritionEntry[];
  nutritionGoal: NutritionGoal;
  goals: Goal[];
  personalRecords: PersonalRecord[];
}
