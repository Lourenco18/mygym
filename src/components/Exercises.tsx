import React, { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { useApp } from '../context/AppContext';
import { Button, Card, EmptyState, Input, Select, Badge, EmptyState as Empty } from './ui';
import { NewExerciseModal } from './Plans';
import { MUSCLE_GROUP_LIST } from '../types';
import { performedHistoryForExercise, performedExerciseVolume, estimate1RM, suggestProgression } from '../lib/calculations';
import { translateSeedExerciseName, useTranslation } from '../lib/i18n';

export function ExerciseLibrary() {
  const { data, archiveExercise } = useApp();
  const { t } = useTranslation();
  const [search, setSearch] = useState('');
  const [group, setGroup] = useState('Todos');
  const [showNew, setShowNew] = useState(false);

  const visible = data.exercises
    .filter((e) => !e.archived)
    .filter((e) => e.name.toLowerCase().includes(search.toLowerCase()) || translateSeedExerciseName(e.name, t).toLowerCase().includes(search.toLowerCase()))
    .filter((e) => group === 'Todos' || e.muscleGroup === group);

  const grouped = visible.reduce<Record<string, typeof visible>>((acc, ex) => {
    (acc[ex.muscleGroup] ??= []).push(ex);
    return acc;
  }, {});

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto space-y-5">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-3xl font-bold tracking-tight">{t('Exercícios')}</h1>
        <Button size="sm" onClick={() => setShowNew(true)}>{t('Novo exercício')}</Button>
      </header>

      <div className="flex gap-2 flex-wrap">
        <Input placeholder={t('Pesquisar...')} value={search} onChange={(e) => setSearch(e.target.value)} className="flex-1 min-w-[160px]" />
        <Select value={group} onChange={(e) => setGroup(e.target.value)} className="w-44">
          <option value="Todos">{t('Todos os grupos')}</option>
          {MUSCLE_GROUP_LIST.map((g) => <option key={g} value={g}>{t(g)}</option>)}
        </Select>
      </div>

      {visible.length === 0 ? (
        <Empty title={t('Nenhum exercício')} message={t('Cria um exercício novo ou ajusta a pesquisa.')} />
      ) : (
        Object.entries(grouped).map(([g, exs]) => (
          <div key={g}>
            <p className="text-xs uppercase tracking-wide text-[var(--text-dim)] mb-2">{t(g)}</p>
            <div className="space-y-2">
              {exs.map((ex) => (
                <Link key={ex.id} to={`/exercicios/${ex.id}`}>
                  <Card className="p-3 flex items-center justify-between hover:border-[var(--accent)] transition-colors">
                    <div>
                      <p className="font-medium text-sm">{translateSeedExerciseName(ex.name, t)}</p>
                      <p className="text-xs text-[var(--text-dim)]">{ex.equipment}</p>
                    </div>
                    <span className="text-[var(--text-dim)]">›</span>
                  </Card>
                </Link>
              ))}
            </div>
          </div>
        ))
      )}

      <NewExerciseModal open={showNew} onClose={() => setShowNew(false)} onCreated={() => setShowNew(false)} />
    </div>
  );
}

export function ExerciseDetail() {
  const { id } = useParams();
  const { data, updateExercise, archiveExercise } = useApp();
  const { t, dateLocale } = useTranslation();
  const ex = data.exercises.find((e) => e.id === id);
  const [editing, setEditing] = useState(false);

  if (!ex) {
    return <div className="p-8"><EmptyState title={t('Exercício não encontrado')} message={t('Pode ter sido arquivado.')} /></div>;
  }

  const history = performedHistoryForExercise(data, ex.id);
  const suggestion = suggestProgression(data, ex.id);

  const chartData = [...history].reverse().map(({ session, pe }) => {
    const completedSets = pe.sets.filter((s) => s.completed && s.weight != null && s.reps != null);
    const maxWeight = completedSets.length ? Math.max(...completedSets.map((s) => s.weight!)) : 0;
    const maxReps = completedSets.length ? Math.max(...completedSets.map((s) => s.reps!)) : 0;
    const volume = performedExerciseVolume(pe);
    const est1RM = completedSets.length ? Math.max(...completedSets.map((s) => estimate1RM(s.weight!, s.reps!))) : 0;
    return {
      date: new Date(session.date + 'T00:00:00').toLocaleDateString(dateLocale, { day: '2-digit', month: '2-digit' }),
      peso: maxWeight,
      reps: maxReps,
      volume: Math.round(volume),
      rm1: est1RM,
    };
  });

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto space-y-5">
      <div className="flex items-center gap-2 text-sm text-[var(--text-dim)]">
        <Link to="/exercicios" className="hover:text-[var(--text)]">{t('Exercícios')}</Link> / {translateSeedExerciseName(ex.name, t)}
      </div>

      <header className="flex items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight">{translateSeedExerciseName(ex.name, t)}</h1>
          <div className="flex gap-2 mt-1">
            <Badge>{t(ex.muscleGroup)}</Badge>
            <Badge>{t(ex.equipment)}</Badge>
          </div>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="secondary" onClick={() => setEditing(true)}>{t('Editar')}</Button>
          <Button size="sm" variant="danger" onClick={() => { if (confirm(t('Arquivar exercício? O histórico é mantido.'))) archiveExercise(ex.id); }}>{t('Arquivar')}</Button>
        </div>
      </header>

      {suggestion && (
        <Card accent className="p-4">
          <p className="text-sm"><strong>{t('Sugestão:')}</strong> {t(suggestion.message, suggestion.stagnantSessions == null ? undefined : { count: suggestion.stagnantSessions })}{suggestion.suggestedWeight ? ` ${t('Experimenta {{weight}} kg no próximo treino.', { weight: suggestion.suggestedWeight })}` : ''}</p>
        </Card>
      )}

      {chartData.length > 0 ? (
        <>
          <Card className="p-4">
            <p className="text-xs uppercase tracking-wide text-[var(--text-dim)] mb-3">{t('Peso ao longo do tempo (kg)')}</p>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: 'var(--text-dim)' }} />
                <YAxis tick={{ fontSize: 11, fill: 'var(--text-dim)' }} width={32} />
                <Tooltip contentStyle={{ background: 'var(--bg-raised)', border: '1px solid var(--border)', fontSize: 12 }} />
                <Line type="monotone" dataKey="peso" stroke="var(--accent)" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </Card>
          <div className="grid sm:grid-cols-2 gap-4">
            <Card className="p-4">
              <p className="text-xs uppercase tracking-wide text-[var(--text-dim)] mb-3">{t('Repetições')}</p>
              <ResponsiveContainer width="100%" height={160}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'var(--text-dim)' }} />
                  <YAxis tick={{ fontSize: 10, fill: 'var(--text-dim)' }} width={28} />
                  <Tooltip contentStyle={{ background: 'var(--bg-raised)', border: '1px solid var(--border)', fontSize: 12 }} />
                  <Line type="monotone" dataKey="reps" stroke="var(--positive)" strokeWidth={2} dot={{ r: 2 }} />
                </LineChart>
              </ResponsiveContainer>
            </Card>
            <Card className="p-4">
              <p className="text-xs uppercase tracking-wide text-[var(--text-dim)] mb-3">{t('Volume (kg)')}</p>
              <ResponsiveContainer width="100%" height={160}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'var(--text-dim)' }} />
                  <YAxis tick={{ fontSize: 10, fill: 'var(--text-dim)' }} width={36} />
                  <Tooltip contentStyle={{ background: 'var(--bg-raised)', border: '1px solid var(--border)', fontSize: 12 }} />
                  <Line type="monotone" dataKey="volume" stroke="var(--warn)" strokeWidth={2} dot={{ r: 2 }} />
                </LineChart>
              </ResponsiveContainer>
            </Card>
          </div>
        </>
      ) : (
        <Card className="p-5"><p className="text-sm text-[var(--text-dim)]">{t('Ainda sem histórico registado para este exercício.')}</p></Card>
      )}

      <div>
        <p className="text-xs uppercase tracking-wide text-[var(--text-dim)] mb-2">{t('Histórico')}</p>
        <div className="space-y-3">
          {history.map(({ session, pe }) => (
            <Card key={pe.id} className="p-3">
              <p className="text-sm font-medium">{new Date(session.date + 'T00:00:00').toLocaleDateString(dateLocale, { day: '2-digit', month: '2-digit', year: 'numeric' })}</p>
              <div className="flex flex-wrap gap-2 mt-1.5">
                {pe.sets.filter((s) => s.completed).map((s) => (
                  <span key={s.id} className="text-xs tabular bg-[var(--bg)] border border-[var(--border)] rounded px-2 py-1">
                    {s.weight ?? '–'}×{s.reps ?? '–'}
                  </span>
                ))}
              </div>
            </Card>
          ))}
        </div>
      </div>

      {editing && (
        <EditExerciseModal ex={ex} onClose={() => setEditing(false)} />
      )}
    </div>
  );
}

function EditExerciseModal({ ex, onClose }: { ex: import('../types').Exercise; onClose: () => void }) {
  const { updateExercise } = useApp();
  const { t } = useTranslation();
  const [name, setName] = useState(ex.name);
  const [muscleGroup, setMuscleGroup] = useState(ex.muscleGroup);
  const [equipment, setEquipment] = useState(ex.equipment);
  const [isBodyweight, setIsBodyweight] = useState(!!ex.isBodyweight);

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50" onClick={onClose}>
      <div className="bg-[var(--bg)] w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl border border-[var(--border)] p-5 space-y-4" onClick={(e) => e.stopPropagation()}>
        <h2 className="font-display text-xl font-semibold">{t('Editar exercício')}</h2>
        <label className="block space-y-1">
          <span className="text-xs text-[var(--text-dim)]">{t('Nome')}</span>
          <Input value={name} onChange={(e) => setName(e.target.value)} />
        </label>
        <label className="block space-y-1">
          <span className="text-xs text-[var(--text-dim)]">{t('Grupo muscular')}</span>
          <Select value={muscleGroup} onChange={(e) => setMuscleGroup(e.target.value as typeof muscleGroup)}>
          {MUSCLE_GROUP_LIST.map((g) => <option key={g} value={g}>{t(g)}</option>)}
          </Select>
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={isBodyweight}
            onChange={(e) => {
              const bodyweight = e.target.checked;
              setIsBodyweight(bodyweight);
              setEquipment(bodyweight ? 'Peso corporal' : equipment === 'Peso corporal' ? '' : equipment);
            }}
          />
          {t('Exercício de peso corporal')}
        </label>
        {!isBodyweight && (
          <label className="block space-y-1">
            <span className="text-xs text-[var(--text-dim)]">{t('Equipamento')}</span>
            <Input value={equipment} onChange={(e) => setEquipment(e.target.value)} placeholder={t('Barra, halteres, máquina...')} />
          </label>
        )}
        <div className="flex gap-2">
          <Button className="flex-1" onClick={() => { updateExercise(ex.id, { name, muscleGroup, equipment, isBodyweight }); onClose(); }}>{t('Guardar')}</Button>
          <Button variant="ghost" onClick={onClose}>{t('Cancelar')}</Button>
        </div>
      </div>
    </div>
  );
}
