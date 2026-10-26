import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Button, Card, Field, Input, BigStat, EmptyState } from './ui';
import { isoDate } from '../lib/calculations';
import { useTranslation } from '../lib/i18n';

export function NutritionPage() {
  const { data, addNutrition, setNutritionGoal } = useApp();
  const { t, dateLocale } = useTranslation();
  const today = isoDate();
  const todayEntry = data.nutritionEntries.find((e) => e.date === today);

  const [calories, setCalories] = useState(todayEntry ? String(todayEntry.calories) : '');
  const [protein, setProtein] = useState(todayEntry ? String(todayEntry.protein) : '');
  const [editingGoal, setEditingGoal] = useState(false);
  const [goalCalories, setGoalCalories] = useState(String(data.nutritionGoal.calories));
  const [goalProtein, setGoalProtein] = useState(String(data.nutritionGoal.protein));

  const history = [...data.nutritionEntries].sort((a, b) => (a.date < b.date ? 1 : -1)).slice(0, 14);

  function saveToday() {
    if (!calories && !protein) return;
    addNutrition({ date: today, calories: Number(calories) || 0, protein: Number(protein) || 0 });
  }

  return (
    <div className="p-4 md:p-8 max-w-3xl mx-auto space-y-5">
      <h1 className="font-display text-3xl font-bold tracking-tight">{t('Nutrição')}</h1>

      <Card accent className="p-5">
        <p className="text-xs uppercase tracking-wide text-[var(--text-dim)] mb-3">{t('Hoje')}</p>
        <div className="grid grid-cols-2 gap-4 mb-4">
          <Field label={t('Calorias')}>
            <Input type="number" value={calories} onChange={(e) => setCalories(e.target.value)} placeholder={String(data.nutritionGoal.calories)} />
          </Field>
          <Field label={t('Proteína (g)')}>
            <Input type="number" value={protein} onChange={(e) => setProtein(e.target.value)} placeholder={String(data.nutritionGoal.protein)} />
          </Field>
        </div>
        <Button onClick={saveToday}>{t('Guardar hoje')}</Button>

        <div className="grid grid-cols-2 gap-4 mt-5 pt-5 border-t border-[var(--border)]">
          <BigStat
            label={t('Proteína')}
            value={`${todayEntry?.protein ?? (Number(protein) || 0)} / ${data.nutritionGoal.protein} g`}
          />
          <BigStat
            label={t('Calorias')}
            value={`${todayEntry?.calories ?? (Number(calories) || 0)} / ${data.nutritionGoal.calories}`}
          />
        </div>
      </Card>

      <Card className="p-5">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs uppercase tracking-wide text-[var(--text-dim)]">{t('Objetivos diários')}</p>
          <button className="text-xs text-[var(--accent)] font-medium" onClick={() => setEditingGoal((v) => !v)}>
            {editingGoal ? t('Cancelar') : t('Editar')}
          </button>
        </div>
        {editingGoal ? (
          <div className="grid grid-cols-2 gap-4">
            <Field label={t('Calorias')}><Input type="number" value={goalCalories} onChange={(e) => setGoalCalories(e.target.value)} /></Field>
            <Field label={t('Proteína (g)')}><Input type="number" value={goalProtein} onChange={(e) => setGoalProtein(e.target.value)} /></Field>
            <Button className="col-span-2" onClick={() => { setNutritionGoal(Number(goalCalories), Number(goalProtein)); setEditingGoal(false); }}>{t('Guardar objetivos')}</Button>
          </div>
        ) : (
          <p className="text-sm">{data.nutritionGoal.protein} g proteína · {data.nutritionGoal.calories} kcal</p>
        )}
      </Card>

      <div>
        <p className="text-xs uppercase tracking-wide text-[var(--text-dim)] mb-2">{t('Histórico')}</p>
        {history.length === 0 ? (
          <EmptyState title={t('Sem registos')} message={t('Regista as tuas calorias e proteína diariamente.')} />
        ) : (
          <div className="space-y-1.5">
            {history.map((e) => (
              <Card key={e.id} className="p-2.5 flex items-center justify-between text-sm">
                <span className="text-[var(--text-dim)]">{new Date(e.date + 'T00:00:00').toLocaleDateString(dateLocale)}</span>
                <span className="tabular">{e.protein} g · {e.calories} kcal</span>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
