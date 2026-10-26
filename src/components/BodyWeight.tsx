import React, { useState } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { useApp } from '../context/AppContext';
import { Button, Card, Field, Input, Modal, BigStat, EmptyState } from './ui';
import { isoDate } from '../lib/calculations';
import { useTranslation } from '../lib/i18n';

export function BodyWeightPage() {
  const { data, addBodyWeight, removeBodyWeight } = useApp();
  const { t, dateLocale } = useTranslation();
  const [showAdd, setShowAdd] = useState(false);

  const sorted = [...data.bodyWeightEntries].sort((a, b) => (a.date < b.date ? 1 : -1));
  const current = sorted[0];
  const initial = sorted[sorted.length - 1];
  const diff = current && initial ? current.weight - initial.weight : null;

  const last7 = sorted.slice(0, 7);
  const weeklyAvg = last7.length ? last7.reduce((s, e) => s + e.weight, 0) / last7.length : null;

  const chartData = [...sorted].reverse().map((e) => ({
    date: new Date(e.date + 'T00:00:00').toLocaleDateString(dateLocale, { day: '2-digit', month: '2-digit' }),
    peso: e.weight,
  }));

  return (
    <div className="p-4 md:p-8 max-w-3xl mx-auto space-y-5">
      <header className="flex items-center justify-between">
        <h1 className="font-display text-3xl font-bold tracking-tight">{t('Peso corporal')}</h1>
        <Button onClick={() => setShowAdd(true)}>{t('Registar')}</Button>
      </header>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="p-4"><BigStat label={t('Atual')} value={current ? `${current.weight} kg` : '–'} /></Card>
        <Card className="p-4"><BigStat label={t('Inicial')} value={initial ? `${initial.weight} kg` : '–'} /></Card>
        <Card className="p-4"><BigStat label={t('Diferença')} value={diff != null ? `${diff >= 0 ? '+' : ''}${diff.toFixed(1)} kg` : '–'} tone={diff == null ? 'neutral' : diff > 0 ? 'positive' : diff < 0 ? 'negative' : 'neutral'} /></Card>
        <Card className="p-4"><BigStat label={t('Média semanal')} value={weeklyAvg != null ? `${weeklyAvg.toFixed(1)} kg` : '–'} /></Card>
      </div>

      {chartData.length > 1 && (
        <Card className="p-4">
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: 'var(--text-dim)' }} />
              <YAxis tick={{ fontSize: 11, fill: 'var(--text-dim)' }} width={36} domain={['dataMin - 2', 'dataMax + 2']} />
              <Tooltip contentStyle={{ background: 'var(--bg-raised)', border: '1px solid var(--border)', fontSize: 12 }} />
              <Line type="monotone" dataKey="peso" stroke="var(--accent)" strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </Card>
      )}

      {sorted.length === 0 ? (
        <EmptyState title={t('Sem registos')} message={t('Regista o teu peso para começares a ver a evolução.')} action={<Button onClick={() => setShowAdd(true)}>{t('Registar peso')}</Button>} />
      ) : (
        <div className="space-y-2">
          {sorted.map((e) => (
            <Card key={e.id} className="p-3 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium tabular">{e.weight} kg</p>
                <p className="text-xs text-[var(--text-dim)]">
                  {new Date(e.date + 'T00:00:00').toLocaleDateString(dateLocale)}
                  {(e.waist || e.arm || e.chest || e.leg) && ' · '}
                  {[e.waist && `Cintura ${e.waist}cm`, e.arm && `Braço ${e.arm}cm`, e.chest && `Peito ${e.chest}cm`, e.leg && `Perna ${e.leg}cm`].filter(Boolean).join(' · ')}
                </p>
              </div>
              <button onClick={() => removeBodyWeight(e.id)} className="text-xs text-[var(--negative)]">{t('Remover')}</button>
            </Card>
          ))}
        </div>
      )}

      <AddWeightModal open={showAdd} onClose={() => setShowAdd(false)} />
    </div>
  );
}

function AddWeightModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { addBodyWeight } = useApp();
  const { t } = useTranslation();
  const [date, setDate] = useState(isoDate());
  const [weight, setWeight] = useState('');
  const [waist, setWaist] = useState('');
  const [arm, setArm] = useState('');
  const [chest, setChest] = useState('');
  const [leg, setLeg] = useState('');

  function save() {
    if (!weight) return;
    addBodyWeight({
      date, weight: Number(weight),
      waist: waist ? Number(waist) : undefined,
      arm: arm ? Number(arm) : undefined,
      chest: chest ? Number(chest) : undefined,
      leg: leg ? Number(leg) : undefined,
    });
    setWeight(''); setWaist(''); setArm(''); setChest(''); setLeg('');
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose} title={t('Registar peso')}>
      <div className="space-y-4">
        <Field label={t('Data')}><Input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></Field>
        <Field label={t('Peso (kg)')}><Input type="number" step={0.1} value={weight} onChange={(e) => setWeight(e.target.value)} autoFocus /></Field>
        <p className="text-xs text-[var(--text-dim)]">{t('Medidas (opcional)')}</p>
        <div className="grid grid-cols-2 gap-3">
          <Field label={t('Cintura (cm)')}><Input type="number" step={0.5} value={waist} onChange={(e) => setWaist(e.target.value)} /></Field>
          <Field label={t('Braço (cm)')}><Input type="number" step={0.5} value={arm} onChange={(e) => setArm(e.target.value)} /></Field>
          <Field label={t('Peito (cm)')}><Input type="number" step={0.5} value={chest} onChange={(e) => setChest(e.target.value)} /></Field>
          <Field label={t('Perna (cm)')}><Input type="number" step={0.5} value={leg} onChange={(e) => setLeg(e.target.value)} /></Field>
        </div>
        <Button className="w-full" onClick={save} disabled={!weight}>{t('Guardar')}</Button>
      </div>
    </Modal>
  );
}
