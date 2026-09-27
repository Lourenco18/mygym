import React, { useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { Button, Card, Field, Input, Textarea, Modal, Badge, EmptyState, Select } from './ui';
import type { PlannedExercise, RepType, WorkoutDay } from '../types';

const DOW_LABELS = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

export function PlansList() {
  const { data, addPlan, setActivePlan, duplicatePlan, archivePlan, deletePlan } = useApp();
  const navigate = useNavigate();
  const [showCreate, setShowCreate] = useState(false);

  const active = data.plans.filter((p) => !p.archived);
  const archived = data.plans.filter((p) => p.archived);

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto space-y-5">
      <header className="flex items-center justify-between">
        <h1 className="font-display text-3xl font-bold tracking-tight">Planos de treino</h1>
        <Button onClick={() => setShowCreate(true)}>+ Criar plano</Button>
      </header>

      {active.length === 0 ? (
        <Card className="p-5">
          <EmptyState
            title="Ainda sem planos"
            message="Cria o teu primeiro plano de treino para começares a organizar os teus dias e exercícios."
            action={<Button onClick={() => setShowCreate(true)}>+ Criar plano</Button>}
          />
        </Card>
      ) : (
        <div className="space-y-3">
          {active.map((plan) => {
            const trainingDays = plan.days.filter((d) => !d.isRestDay).length;
            return (
              <Card key={plan.id} accent={plan.isActive} className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <Link to={`/planos/${plan.id}`} className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-display text-xl font-semibold">{plan.name}</p>
                      {plan.isActive && <Badge tone="accent">Ativo</Badge>}
                    </div>
                    {plan.description && <p className="text-sm text-[var(--text-dim)] mt-0.5">{plan.description}</p>}
                    <p className="text-xs text-[var(--text-dim)] mt-1">{trainingDays} dias de treino · {plan.days.length - trainingDays} descanso</p>
                  </Link>
                  <div className="flex flex-col gap-1.5 shrink-0">
                    {!plan.isActive && (
                      <Button size="sm" variant="secondary" onClick={() => setActivePlan(plan.id)}>Ativar</Button>
                    )}
                    <Button size="sm" variant="ghost" onClick={() => duplicatePlan(plan.id)}>Duplicar</Button>
                    <Button size="sm" variant="ghost" onClick={() => archivePlan(plan.id)}>Arquivar</Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {archived.length > 0 && (
        <div>
          <p className="text-xs uppercase tracking-wide text-[var(--text-dim)] mb-2 mt-6">Arquivados</p>
          <div className="space-y-2">
            {archived.map((plan) => (
              <Card key={plan.id} className="p-3 opacity-70">
                <div className="flex items-center justify-between">
                  <span className="text-sm">{plan.name}</span>
                  <div className="flex gap-2">
                    <Button size="sm" variant="ghost" onClick={() => archivePlan(plan.id)}>Restaurar</Button>
                    <Button size="sm" variant="danger" onClick={() => { if (confirm('Apagar plano definitivamente? Os treinos realizados não são apagados.')) deletePlan(plan.id); }}>Apagar</Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      <CreatePlanModal open={showCreate} onClose={() => setShowCreate(false)} onCreated={(id) => navigate(`/planos/${id}`)} />
    </div>
  );
}

function CreatePlanModal({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: (id: string) => void }) {
  const { addPlan, addDay } = useApp();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [numDays, setNumDays] = useState(6);

  function handleCreate() {
    if (!name.trim()) return;
    const plan = addPlan({ name: name.trim(), description: description.trim() || undefined });
    for (let i = 0; i < numDays; i++) {
      const dow = (i + 1) % 7; // start on Monday
      addDay(plan.id, { name: DOW_LABELS[dow], dayOfWeek: dow, isRestDay: false });
    }
    setName(''); setDescription(''); setNumDays(6);
    onClose();
    onCreated(plan.id);
  }

  return (
    <Modal open={open} onClose={onClose} title="Criar plano">
      <div className="space-y-4">
        <Field label="Nome do plano">
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Lean Bulk 2026" autoFocus />
        </Field>
        <Field label="Descrição (opcional)">
          <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Ganho de massa muscular" rows={2} />
        </Field>
        <Field label="Número de dias" hint="Podes ajustar cada dia depois de criares o plano.">
          <Input type="number" min={1} max={7} value={numDays} onChange={(e) => setNumDays(Number(e.target.value))} />
        </Field>
        <Button className="w-full" size="lg" onClick={handleCreate} disabled={!name.trim()}>Criar plano</Button>
      </div>
    </Modal>
  );
}

export function PlanEditor() {
  const { id } = useParams();
  const { data, updatePlan, addDay, updateDay, deleteDay, duplicateDay, setActivePlan } = useApp();
  const plan = data.plans.find((p) => p.id === id);
  const [activeDayId, setActiveDayId] = useState<string | null>(plan?.days[0]?.id ?? null);
  const [editingName, setEditingName] = useState(false);
  const [showExercisePicker, setShowExercisePicker] = useState(false);
  const [editingPE, setEditingPE] = useState<PlannedExercise | null>(null);

  if (!plan) {
    return (
      <div className="p-8">
        <EmptyState title="Plano não encontrado" message="Este plano pode ter sido apagado." action={<Link to="/planos"><Button>Voltar aos planos</Button></Link>} />
      </div>
    );
  }

  const activeDay = plan.days.find((d) => d.id === activeDayId) ?? plan.days[0];

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto space-y-5">
      <div className="flex items-center gap-2 text-sm text-[var(--text-dim)]">
        <Link to="/planos" className="hover:text-[var(--text)]">Planos</Link> / {plan.name}
      </div>

      <header className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex-1 min-w-0">
          {editingName ? (
            <Input
              autoFocus
              defaultValue={plan.name}
              onBlur={(e) => { updatePlan(plan.id, { name: e.target.value || plan.name }); setEditingName(false); }}
              onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
              className="font-display text-2xl font-bold"
            />
          ) : (
            <h1 className="font-display text-3xl font-bold tracking-tight cursor-text" onClick={() => setEditingName(true)}>{plan.name}</h1>
          )}
        </div>
        {!plan.isActive && <Button variant="secondary" onClick={() => setActivePlan(plan.id)}>Ativar plano</Button>}
      </header>

      {/* Day tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
        {plan.days.map((day) => (
          <button
            key={day.id}
            onClick={() => setActiveDayId(day.id)}
            className={`shrink-0 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap border ${
              day.id === activeDay?.id
                ? 'bg-[var(--accent)] text-[var(--accent-text)] border-[var(--accent)]'
                : 'border-[var(--border)] text-[var(--text-dim)]'
            }`}
          >
            {day.name}{day.isRestDay ? ' 💤' : ''}
          </button>
        ))}
        <button
          onClick={() => addDay(plan.id, { name: `Dia ${plan.days.length + 1}`, dayOfWeek: plan.days.length % 7, isRestDay: false })}
          className="shrink-0 px-4 py-2 rounded-lg text-sm font-medium border border-dashed border-[var(--border)] text-[var(--text-dim)]"
        >
          + Dia
        </button>
      </div>

      {activeDay && (
        <DayEditorPanel
          plan={plan}
          day={activeDay}
          onEditExercise={(pe) => setEditingPE(pe)}
          onAddExercise={() => setShowExercisePicker(true)}
          onDeleteDay={() => {
            if (confirm(`Remover "${activeDay.name}"?`)) {
              deleteDay(plan.id, activeDay.id);
              setActiveDayId(plan.days.find((d) => d.id !== activeDay.id)?.id ?? null);
            }
          }}
          onDuplicateDay={() => duplicateDay(plan.id, activeDay.id)}
        />
      )}

      {activeDay && (
        <ExercisePickerModal
          open={showExercisePicker}
          onClose={() => setShowExercisePicker(false)}
          planId={plan.id}
          dayId={activeDay.id}
        />
      )}

      {activeDay && editingPE && (
        <PlannedExerciseModal
          planId={plan.id}
          dayId={activeDay.id}
          plannedExercise={editingPE}
          onClose={() => setEditingPE(null)}
        />
      )}
    </div>
  );
}

function DayEditorPanel({
  plan, day, onEditExercise, onAddExercise, onDeleteDay, onDuplicateDay,
}: {
  plan: import('../types').WorkoutPlan;
  day: WorkoutDay;
  onEditExercise: (pe: PlannedExercise) => void;
  onAddExercise: () => void;
  onDeleteDay: () => void;
  onDuplicateDay: () => void;
}) {
  const { data, updateDay, removePlannedExercise, reorderPlannedExercises } = useApp();
  const [dragId, setDragId] = useState<string | null>(null);

  const sorted = [...day.exercises].sort((a, b) => a.order - b.order);

  function move(idOrder: string[], from: number, to: number) {
    const arr = [...idOrder];
    const [item] = arr.splice(from, 1);
    arr.splice(to, 0, item);
    reorderPlannedExercises(plan.id, day.id, arr);
  }

  return (
    <Card className="p-4 md:p-5 space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <Input
            value={day.name}
            onChange={(e) => updateDay(plan.id, day.id, { name: e.target.value })}
            className="font-display text-lg font-semibold w-48"
          />
          <label className="flex items-center gap-1.5 text-sm text-[var(--text-dim)]">
            <input
              type="checkbox"
              checked={day.isRestDay}
              onChange={(e) => updateDay(plan.id, day.id, { isRestDay: e.target.checked })}
            />
            Descanso
          </label>
          <Select
            value={day.dayOfWeek}
            onChange={(e) => updateDay(plan.id, day.id, { dayOfWeek: Number(e.target.value) })}
            className="w-32"
          >
            {DOW_LABELS.map((label, i) => (
              <option key={i} value={i}>{label}</option>
            ))}
          </Select>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="ghost" onClick={onDuplicateDay}>Duplicar dia</Button>
          <Button size="sm" variant="danger" onClick={onDeleteDay}>Remover</Button>
        </div>
      </div>

      {day.isRestDay ? (
        <p className="text-sm text-[var(--text-dim)] py-6 text-center">Dia de descanso — sem exercícios.</p>
      ) : (
        <div className="space-y-2">
          {sorted.length === 0 && <p className="text-sm text-[var(--text-dim)] py-4">Sem exercícios ainda.</p>}
          {sorted.map((pe, idx) => {
            const ex = data.exercises.find((e) => e.id === pe.exerciseId);
            return (
              <div
                key={pe.id}
                draggable
                onDragStart={() => setDragId(pe.id)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => {
                  if (!dragId || dragId === pe.id) return;
                  const ids = sorted.map((s) => s.id);
                  const from = ids.indexOf(dragId);
                  const to = ids.indexOf(pe.id);
                  move(ids, from, to);
                  setDragId(null);
                }}
                className="flex items-center gap-2 p-3 rounded-lg border border-[var(--border)] bg-[var(--bg)] cursor-grab active:cursor-grabbing"
              >
                <span className="text-[var(--text-dim)] select-none" aria-hidden>⠿</span>
                <div className="flex-1 min-w-0" onClick={() => onEditExercise(pe)}>
                  <p className="font-medium text-sm truncate">{ex?.name ?? 'Exercício'}</p>
                  <p className="text-xs text-[var(--text-dim)] tabular">
                    {pe.sets}× {pe.repType === 'range' ? `${pe.repsMin ?? '?'}-${pe.repsMax ?? '?'}` : pe.repType === 'fixed' ? pe.repsMin : pe.repType === 'failure' ? 'até à falha' : 'tempo'}
                    {pe.targetWeight ? ` · ${pe.targetWeight} kg` : ''}
                    {pe.rirMin != null ? ` · RIR ${pe.rirMin}${pe.rirMax != null ? `-${pe.rirMax}` : ''}` : ''}
                  </p>
                </div>
                <div className="flex gap-1 shrink-0">
                  <button
                    className="w-8 h-8 text-sm rounded border border-[var(--border)] disabled:opacity-30"
                    disabled={idx === 0}
                    onClick={() => move(sorted.map((s) => s.id), idx, idx - 1)}
                    aria-label="Mover para cima"
                  >↑</button>
                  <button
                    className="w-8 h-8 text-sm rounded border border-[var(--border)] disabled:opacity-30"
                    disabled={idx === sorted.length - 1}
                    onClick={() => move(sorted.map((s) => s.id), idx, idx + 1)}
                    aria-label="Mover para baixo"
                  >↓</button>
                  <button
                    className="w-8 h-8 text-sm rounded border border-[var(--negative)]/40 text-[var(--negative)]"
                    onClick={() => removePlannedExercise(plan.id, day.id, pe.id)}
                    aria-label="Remover exercício"
                  >✕</button>
                </div>
              </div>
            );
          })}
          <Button variant="secondary" className="w-full" onClick={onAddExercise}>+ Adicionar exercício</Button>
        </div>
      )}
    </Card>
  );
}

function ExercisePickerModal({ open, onClose, planId, dayId }: { open: boolean; onClose: () => void; planId: string; dayId: string }) {
  const { data, addPlannedExercise } = useApp();
  const [search, setSearch] = useState('');
  const [showNewExercise, setShowNewExercise] = useState(false);

  const filtered = data.exercises
    .filter((e) => !e.archived)
    .filter((e) => e.name.toLowerCase().includes(search.toLowerCase()));

  function pick(exerciseId: string) {
    addPlannedExercise(planId, dayId, {
      exerciseId,
      sets: 3,
      repType: 'range',
      repsMin: 8,
      repsMax: 12,
      restSeconds: 90,
    });
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose} title="Adicionar exercício">
      <div className="space-y-3">
        <Input placeholder="Pesquisar exercício..." value={search} onChange={(e) => setSearch(e.target.value)} autoFocus />
        <div className="max-h-72 overflow-y-auto space-y-1">
          {filtered.map((ex) => (
            <button
              key={ex.id}
              onClick={() => pick(ex.id)}
              className="w-full text-left px-3 py-2.5 rounded-lg hover:bg-[var(--bg)] flex items-center justify-between"
            >
              <span className="text-sm font-medium">{ex.name}</span>
              <Badge>{ex.muscleGroup}</Badge>
            </button>
          ))}
          {filtered.length === 0 && <p className="text-sm text-[var(--text-dim)] py-3">Nenhum exercício encontrado.</p>}
        </div>
        <Button variant="secondary" className="w-full" onClick={() => setShowNewExercise(true)}>+ Criar novo exercício</Button>
      </div>
      <NewExerciseModal
        open={showNewExercise}
        onClose={() => setShowNewExercise(false)}
        onCreated={(exId) => { setShowNewExercise(false); pick(exId); }}
      />
    </Modal>
  );
}

export function NewExerciseModal({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: (id: string) => void }) {
  const { addExercise } = useApp();
  const [name, setName] = useState('');
  const [muscleGroup, setMuscleGroup] = useState('Peito');
  const [equipment, setEquipment] = useState('');
  const [isBodyweight, setIsBodyweight] = useState(false);

  function handleCreate() {
    if (!name.trim()) return;
    const ex = addExercise({ name: name.trim(), muscleGroup: muscleGroup as any, equipment: equipment.trim(), isBodyweight });
    setName(''); setEquipment(''); setIsBodyweight(false);
    onCreated(ex.id);
  }

  return (
    <Modal open={open} onClose={onClose} title="Criar exercício">
      <div className="space-y-4">
        <Field label="Nome"><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Remada unilateral" autoFocus /></Field>
        <Field label="Grupo muscular">
          <Select value={muscleGroup} onChange={(e) => setMuscleGroup(e.target.value)}>
            {['Peito', 'Costas', 'Ombros', 'Bíceps', 'Tríceps', 'Quadríceps', 'Posterior', 'Glúteos', 'Gémeos', 'Abdominais', 'Trapézio', 'Cardio', 'Outro'].map((g) => (
              <option key={g} value={g}>{g}</option>
            ))}
          </Select>
        </Field>
        <Field label="Equipamento"><Input value={equipment} onChange={(e) => setEquipment(e.target.value)} placeholder="Halter" /></Field>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={isBodyweight} onChange={(e) => setIsBodyweight(e.target.checked)} />
          Exercício de peso corporal
        </label>
        <Button className="w-full" onClick={handleCreate} disabled={!name.trim()}>Criar exercício</Button>
      </div>
    </Modal>
  );
}

function PlannedExerciseModal({ planId, dayId, plannedExercise, onClose }: { planId: string; dayId: string; plannedExercise: PlannedExercise; onClose: () => void }) {
  const { data, updatePlannedExercise, removePlannedExercise } = useApp();
  const ex = data.exercises.find((e) => e.id === plannedExercise.exerciseId);
  const [form, setForm] = useState(plannedExercise);

  function save() {
    updatePlannedExercise(planId, dayId, plannedExercise.id, form);
    onClose();
  }

  return (
    <Modal open onClose={onClose} title={ex?.name ?? 'Exercício'}>
      <div className="space-y-4">
        <Field label="Séries">
          <Input type="number" min={1} value={form.sets} onChange={(e) => setForm({ ...form, sets: Number(e.target.value) })} />
        </Field>
        <Field label="Tipo de repetições">
          <Select value={form.repType} onChange={(e) => setForm({ ...form, repType: e.target.value as RepType })}>
            <option value="range">Intervalo (ex: 8-12)</option>
            <option value="fixed">Fixo</option>
            <option value="failure">Até à falha</option>
            <option value="time">Tempo</option>
          </Select>
        </Field>
        {form.repType === 'range' && (
          <div className="grid grid-cols-2 gap-3">
            <Field label="Mín. repetições"><Input type="number" value={form.repsMin ?? ''} onChange={(e) => setForm({ ...form, repsMin: Number(e.target.value) })} /></Field>
            <Field label="Máx. repetições"><Input type="number" value={form.repsMax ?? ''} onChange={(e) => setForm({ ...form, repsMax: Number(e.target.value) })} /></Field>
          </div>
        )}
        {form.repType === 'fixed' && (
          <Field label="Repetições"><Input type="number" value={form.repsMin ?? ''} onChange={(e) => setForm({ ...form, repsMin: Number(e.target.value), repsMax: Number(e.target.value) })} /></Field>
        )}
        <Field label="Peso objetivo (kg)">
          <Input type="number" step={0.5} value={form.targetWeight ?? ''} onChange={(e) => setForm({ ...form, targetWeight: e.target.value ? Number(e.target.value) : undefined })} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="RIR mín."><Input type="number" value={form.rirMin ?? ''} onChange={(e) => setForm({ ...form, rirMin: e.target.value ? Number(e.target.value) : undefined })} /></Field>
          <Field label="RIR máx."><Input type="number" value={form.rirMax ?? ''} onChange={(e) => setForm({ ...form, rirMax: e.target.value ? Number(e.target.value) : undefined })} /></Field>
        </div>
        <Field label="Descanso (segundos)">
          <Input type="number" step={15} value={form.restSeconds} onChange={(e) => setForm({ ...form, restSeconds: Number(e.target.value) })} />
        </Field>
        <Field label="Notas">
          <Textarea value={form.notes ?? ''} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} placeholder="Controlar a descida." />
        </Field>
        <div className="flex gap-2">
          <Button className="flex-1" onClick={save}>Guardar</Button>
          <Button variant="danger" onClick={() => { removePlannedExercise(planId, dayId, plannedExercise.id); onClose(); }}>Remover</Button>
        </div>
      </div>
    </Modal>
  );
}
