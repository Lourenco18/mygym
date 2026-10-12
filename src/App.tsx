import React from 'react';
import { HashRouter, Routes, Route } from 'react-router-dom';
import { AppProvider } from './context/AppContext';
import { Layout } from './components/Layout';
import { Dashboard } from './components/Dashboard';
import { CalendarView } from './components/History';
import { PlansList, PlanEditor } from './components/Plans';
import { ExerciseLibrary, ExerciseDetail } from './components/Exercises';
import { NewWorkoutRedirect, WorkoutMode, WorkoutSummary } from './components/Workout';
import { Stats } from './components/Stats';
import { BodyWeightPage } from './components/BodyWeight';
import { NutritionPage } from './components/Nutrition';
import { GoalsPage } from './components/Goals';
import { FeedbackPage } from './components/Feedback';
import { SettingsPage } from './components/Settings';

export default function App() {
  return (
    <AppProvider>
      <HashRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<Dashboard />} />
            <Route path="calendario" element={<CalendarView />} />
            <Route path="planos" element={<PlansList />} />
            <Route path="planos/:id" element={<PlanEditor />} />
            <Route path="exercicios" element={<ExerciseLibrary />} />
            <Route path="exercicios/:id" element={<ExerciseDetail />} />
            <Route path="progresso" element={<Stats />} />
            <Route path="peso" element={<BodyWeightPage />} />
            <Route path="nutricao" element={<NutritionPage />} />
            <Route path="objetivos" element={<GoalsPage />} />
            <Route path="analise" element={<FeedbackPage />} />
            <Route path="definicoes" element={<SettingsPage />} />
          </Route>
          <Route path="treino/novo" element={<NewWorkoutRedirect />} />
          <Route path="treino/:sessionId" element={<WorkoutMode />} />
          <Route path="treino/:sessionId/resumo" element={<WorkoutSummary />} />
        </Routes>
      </HashRouter>
    </AppProvider>
  );
}
