import type { Exercise } from '../types';
import { makeId } from './id';

interface SeedExercise {
  name: string;
  muscleGroup: Exercise['muscleGroup'];
  equipment: string;
  isBodyweight?: boolean;
}

const SEED: SeedExercise[] = [
  { name: 'Supino plano', muscleGroup: 'Peito', equipment: 'Barra' },
  { name: 'Supino inclinado', muscleGroup: 'Peito', equipment: 'Halteres' },
  { name: 'Crucifixo', muscleGroup: 'Peito', equipment: 'Halteres' },
  { name: 'Fundos', muscleGroup: 'Peito', equipment: 'Peso corporal', isBodyweight: true },
  { name: 'Remada curvada', muscleGroup: 'Costas', equipment: 'Barra' },
  { name: 'Remada unilateral', muscleGroup: 'Costas', equipment: 'Halter' },
  { name: 'Puxada alta', muscleGroup: 'Costas', equipment: 'Polia' },
  { name: 'Barra fixa', muscleGroup: 'Costas', equipment: 'Peso corporal', isBodyweight: true },
  { name: 'Peso morto', muscleGroup: 'Costas', equipment: 'Barra' },
  { name: 'Desenvolvimento militar', muscleGroup: 'Ombros', equipment: 'Barra' },
  { name: 'Elevação lateral', muscleGroup: 'Ombros', equipment: 'Halteres' },
  { name: 'Elevação frontal', muscleGroup: 'Ombros', equipment: 'Halteres' },
  { name: 'Rosca direta', muscleGroup: 'Bíceps', equipment: 'Barra' },
  { name: 'Rosca alternada', muscleGroup: 'Bíceps', equipment: 'Halteres' },
  { name: 'Tríceps corda', muscleGroup: 'Tríceps', equipment: 'Polia' },
  { name: 'Tríceps francês', muscleGroup: 'Tríceps', equipment: 'Halter' },
  { name: 'Agachamento', muscleGroup: 'Quadríceps', equipment: 'Barra' },
  { name: 'Leg press', muscleGroup: 'Quadríceps', equipment: 'Máquina' },
  { name: 'Cadeira extensora', muscleGroup: 'Quadríceps', equipment: 'Máquina' },
  { name: 'Cadeira flexora', muscleGroup: 'Posterior', equipment: 'Máquina' },
  { name: 'Stiff', muscleGroup: 'Posterior', equipment: 'Barra' },
  { name: 'Elevação pélvica', muscleGroup: 'Glúteos', equipment: 'Barra' },
  { name: 'Gémeos em pé', muscleGroup: 'Gémeos', equipment: 'Máquina' },
  { name: 'Prancha', muscleGroup: 'Abdominais', equipment: 'Peso corporal', isBodyweight: true },
  { name: 'Abdominal na máquina', muscleGroup: 'Abdominais', equipment: 'Máquina' },
  { name: 'Corrida', muscleGroup: 'Cardio', equipment: 'Nenhum' },
  { name: 'Bicicleta', muscleGroup: 'Cardio', equipment: 'Nenhum' },
];

export function buildSeedExercises(): Exercise[] {
  const now = new Date().toISOString();
  return SEED.map((s) => ({
    id: makeId(),
    name: s.name,
    muscleGroup: s.muscleGroup,
    equipment: s.equipment,
    isBodyweight: s.isBodyweight,
    createdAt: now,
  }));
}
