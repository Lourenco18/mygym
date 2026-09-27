import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Button, Card, Field, Input, Modal, Select, BigStat, EmptyState, Badge } from './ui';
import { isoDate, weekSessions } from '../lib/calculations';
import type { CardioEntry } from '../types';

const TYPES = ['Corrida', 'Bicicleta', 'Remo', 'Elíptica', 'Natação', 'Caminhada', 'Outro'];

export function CardioPage() {
  const { data, addCardio, removeCardio } = useApp();
  const [showAdd, setShowAdd] = useState(false);

  const sorted = [...data.cardioEntries].sort((a, b) => (a.date < b.date ? 1 : -1));

  const now = new Date();
  const weekStart = new Date(now);
  const dow = (now.getDay() + 6) % 7;
  weekStart.setDate(now.getDate() - dow);
  weekStart.setHours(0, 0, 0, 0);
  const weekEntries = sorted.filter((e) => new Date(e.date + 'T00:00:00') >= weekStart);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEntries = sorted.filter((e) => new Date(e.date + 'T00:00:00') >= monthStart);

  const weekMin = weekEntries.reduce((s, e) => s + e.durationMinutes, 0);
  const monthMin = monthEntries.reduce((s, e) => s + e.durationMinutes, 0);

  return (
    <div className="p-4 md:p-8 max-w-3xl mx-auto space-y-5">
      <header className="flex items-center justify-between">
        <h1 className="font-display text-3xl font-bold tracking-tight">Cardio</h1>
        <Button onClick={() => setShowAdd(true)}>+ Registar</Button>
      </header>

      <div className="grid grid-cols-2 gap-4">
        <Card className="p-4"><BigStat label="Esta semana" value={`${weekMin} min`} sub={`${weekEntries.length} sessões`} /></Card>
        <Card className="p-4"><BigStat label="Este mês" value={`${monthMin} min`} sub={`${monthEntries.length} sessões`} /></Card>
      </div>

      {sorted.length === 0 ? (
        <EmptyState title="Sem sessões de cardio" message="Regista a tua primeira sessão de cardio." action={<Button onClick={() => setShowAdd(true)}>+ Registar</Button>} />
      ) : (
        <div className="space-y-2">
          {sorted.map((e) => (
            <Card key={e.id} className="p-3 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">{e.type} <Badge>{e.intensity}</Badge></p>
                <p className="text-xs text-[var(--text-dim)] tabular">
                  {new Date(e.date + 'T00:00:00').toLocaleDateString('pt-PT')} · {e.durationMinutes} min
                  {e.distanceKm ? ` · ${e.distanceKm} km` : ''}
                  {e.calories ? ` · ${e.calories} kcal` : ''}
                </p>
                {e.notes && <p className="text-xs text-[var(--text-dim)] italic mt-0.5">{e.notes}</p>}
              </div>
              <button onClick={() => removeCardio(e.id)} className="text-xs text-[var(--negative)] shrink-0">Remover</button>
            </Card>
          ))}
        </div>
      )}

      <AddCardioModal open={showAdd} onClose={() => setShowAdd(false)} />
    </div>
  );
}

function AddCardioModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { addCardio } = useApp();
  const [date, setDate] = useState(isoDate());
  const [type, setType] = useState('Corrida');
  const [duration, setDuration] = useState('');
  const [distance, setDistance] = useState('');
  const [intensity, setIntensity] = useState<CardioEntry['intensity']>('Moderado');
  const [calories, setCalories] = useState('');
  const [notes, setNotes] = useState('');

  function save() {
    if (!duration) return;
    addCardio({
      date, type, durationMinutes: Number(duration),
      distanceKm: distance ? Number(distance) : undefined,
      intensity, calories: calories ? Number(calories) : undefined,
      notes: notes.trim() || undefined,
    });
    setDuration(''); setDistance(''); setCalories(''); setNotes('');
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose} title="Registar cardio">
      <div className="space-y-4">
        <Field label="Data"><Input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></Field>
        <Field label="Tipo">
          <Select value={type} onChange={(e) => setType(e.target.value)}>
            {TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </Select>
        </Field>
        <Field label="Duração (min)"><Input type="number" value={duration} onChange={(e) => setDuration(e.target.value)} autoFocus /></Field>
        <Field label="Distância (km, opcional)"><Input type="number" step={0.1} value={distance} onChange={(e) => setDistance(e.target.value)} /></Field>
        <Field label="Intensidade">
          <Select value={intensity} onChange={(e) => setIntensity(e.target.value as CardioEntry['intensity'])}>
            <option value="Leve">Leve</option>
            <option value="Moderado">Moderado</option>
            <option value="Intenso">Intenso</option>
          </Select>
        </Field>
        <Field label="Calorias (opcional)"><Input type="number" value={calories} onChange={(e) => setCalories(e.target.value)} /></Field>
        <Field label="Notas"><Input value={notes} onChange={(e) => setNotes(e.target.value)} /></Field>
        <Button className="w-full" onClick={save} disabled={!duration}>Guardar</Button>
      </div>
    </Modal>
  );
}
