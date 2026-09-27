import React, { useMemo } from 'react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { useApp } from '../context/AppContext';
import { Card, BigStat, Badge } from './ui';
import { sessionVolume, sessionSetCount, estimate1RM } from '../lib/calculations';

export function Stats() {
  const { data } = useApp();

  const completed = data.sessions.filter((s) => s.status === 'completed');

  const totalWorkouts = completed.length;
  const totalSets = completed.reduce((s, sess) => s + sessionSetCount(sess), 0);
  const totalReps = completed.reduce(
    (s, sess) => s + sess.performedExercises.reduce((a, pe) => a + pe.sets.filter((x) => x.completed).reduce((r, x) => r + (x.reps ?? 0), 0), 0),
    0,
  );
  const totalCardioMin = data.cardioEntries.reduce((s, c) => s + c.durationMinutes, 0);
  const totalDurationMin = Math.round(completed.reduce((s, sess) => s + (sess.durationSeconds ?? 0), 0) / 60);

  const weightData = [...data.bodyWeightEntries]
    .sort((a, b) => (a.date < b.date ? -1 : 1))
    .map((w) => ({ date: new Date(w.date + 'T00:00:00').toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit' }), peso: w.weight }));

  const weeklyVolume = useMemo(() => buildWeeklySeries(completed, (s) => sessionVolume(s)), [completed]);
  const weeklyFrequency = useMemo(() => buildWeeklySeries(completed, () => 1, true), [completed]);

  const muscleVolume = useMemo(() => {
    const byGroup: Record<string, number> = {};
    for (const s of completed) {
      for (const pe of s.performedExercises) {
        const ex = data.exercises.find((e) => e.id === pe.exerciseId);
        if (!ex) continue;
        const vol = pe.sets.reduce((sum, set) => sum + (set.completed && set.weight && set.reps ? set.weight * set.reps : 0), 0);
        byGroup[ex.muscleGroup] = (byGroup[ex.muscleGroup] ?? 0) + vol;
      }
    }
    return Object.entries(byGroup).map(([grupo, volume]) => ({ grupo, volume: Math.round(volume) })).sort((a, b) => b.volume - a.volume);
  }, [completed, data.exercises]);

  const prs = [...data.personalRecords].sort((a, b) => (a.date < b.date ? 1 : -1));

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto space-y-5">
      <h1 className="font-display text-3xl font-bold tracking-tight">Progresso</h1>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="p-4"><BigStat label="Treinos" value={String(totalWorkouts)} /></Card>
        <Card className="p-4"><BigStat label="Séries" value={String(totalSets)} /></Card>
        <Card className="p-4"><BigStat label="Repetições" value={String(totalReps)} /></Card>
        <Card className="p-4"><BigStat label="Cardio" value={`${totalCardioMin} min`} /></Card>
      </div>

      {weightData.length > 0 && (
        <Card className="p-4">
          <p className="text-xs uppercase tracking-wide text-[var(--text-dim)] mb-3">Peso corporal (kg)</p>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={weightData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: 'var(--text-dim)' }} />
              <YAxis tick={{ fontSize: 11, fill: 'var(--text-dim)' }} width={36} domain={['dataMin - 2', 'dataMax + 2']} />
              <Tooltip contentStyle={{ background: 'var(--bg-raised)', border: '1px solid var(--border)', fontSize: 12 }} />
              <Line type="monotone" dataKey="peso" stroke="var(--accent)" strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </Card>
      )}

      <div className="grid sm:grid-cols-2 gap-4">
        <Card className="p-4">
          <p className="text-xs uppercase tracking-wide text-[var(--text-dim)] mb-3">Volume semanal (kg)</p>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={weeklyVolume}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="week" tick={{ fontSize: 10, fill: 'var(--text-dim)' }} />
              <YAxis tick={{ fontSize: 10, fill: 'var(--text-dim)' }} width={40} />
              <Tooltip contentStyle={{ background: 'var(--bg-raised)', border: '1px solid var(--border)', fontSize: 12 }} />
              <Bar dataKey="value" fill="var(--accent)" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
        <Card className="p-4">
          <p className="text-xs uppercase tracking-wide text-[var(--text-dim)] mb-3">Frequência de treino (semana)</p>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={weeklyFrequency}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="week" tick={{ fontSize: 10, fill: 'var(--text-dim)' }} />
              <YAxis tick={{ fontSize: 10, fill: 'var(--text-dim)' }} width={24} allowDecimals={false} />
              <Tooltip contentStyle={{ background: 'var(--bg-raised)', border: '1px solid var(--border)', fontSize: 12 }} />
              <Bar dataKey="value" fill="var(--positive)" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {muscleVolume.length > 0 && (
        <Card className="p-4">
          <p className="text-xs uppercase tracking-wide text-[var(--text-dim)] mb-3">Volume por grupo muscular (total, kg)</p>
          <ResponsiveContainer width="100%" height={Math.max(180, muscleVolume.length * 32)}>
            <BarChart data={muscleVolume} layout="vertical" margin={{ left: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis type="number" tick={{ fontSize: 10, fill: 'var(--text-dim)' }} />
              <YAxis type="category" dataKey="grupo" tick={{ fontSize: 11, fill: 'var(--text-dim)' }} width={90} />
              <Tooltip contentStyle={{ background: 'var(--bg-raised)', border: '1px solid var(--border)', fontSize: 12 }} />
              <Bar dataKey="volume" fill="var(--warn)" radius={[0, 3, 3, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      )}

      <div>
        <p className="text-xs uppercase tracking-wide text-[var(--text-dim)] mb-2">Recordes pessoais</p>
        {prs.length === 0 ? (
          <p className="text-sm text-[var(--text-dim)]">Ainda sem recordes registados.</p>
        ) : (
          <div className="space-y-2">
            {prs.map((pr) => {
              const ex = data.exercises.find((e) => e.id === pr.exerciseId);
              return (
                <Card key={pr.id} className="p-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">🏆 {ex?.name}</p>
                    <p className="text-xs text-[var(--text-dim)]">{new Date(pr.date + 'T00:00:00').toLocaleDateString('pt-PT')}</p>
                  </div>
                  <Badge tone="accent">
                    {pr.type === 'max_weight' && `${pr.value} kg`}
                    {pr.type === 'max_reps' && `${pr.value} reps`}
                    {pr.type === 'max_volume' && `${Math.round(pr.value)} kg vol.`}
                    {pr.type === 'estimated_1rm' && `~${pr.value} kg 1RM`}
                  </Badge>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function buildWeeklySeries(sessions: import('../types').WorkoutSession[], value: (s: import('../types').WorkoutSession) => number, count = false) {
  const byWeek = new Map<string, number>();
  for (const s of sessions) {
    const d = new Date(s.date + 'T00:00:00');
    const monday = new Date(d);
    const dow = (d.getDay() + 6) % 7;
    monday.setDate(d.getDate() - dow);
    const key = monday.toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit' });
    byWeek.set(key, (byWeek.get(key) ?? 0) + value(s));
  }
  return Array.from(byWeek.entries())
    .map(([week, v]) => ({ week, value: count ? v : Math.round(v) }))
    .slice(-12);
}
