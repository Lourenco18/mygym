import React, { useRef, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { Button, Card, Field, Input } from './ui';
import { exportJSON, exportSessionsCSV, importJSON } from '../lib/storage';
import { APP_NAME } from '../config';
import { LOCALES, useTranslation } from '../lib/i18n';

function download(filename: string, content: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function SettingsPage() {
  const { data, setData } = useApp();
  const { locale, setLocale, t } = useTranslation();
  const { theme, setTheme } = useOutletContext<{ theme: 'light' | 'dark'; setTheme: (t: 'light' | 'dark') => void }>();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState(data.profile.name);
  const [importError, setImportError] = useState('');
  const [importSuccess, setImportSuccess] = useState(false);

  function handleExportJSON() {
    download(`${APP_NAME.toLowerCase()}-backup-${new Date().toISOString().slice(0, 10)}.json`, exportJSON(data), 'application/json');
  }

  function handleExportCSV() {
    download(`${APP_NAME.toLowerCase()}-treinos-${new Date().toISOString().slice(0, 10)}.csv`, exportSessionsCSV(data), 'text/csv');
  }

  function handleImportClick() {
    setImportError('');
    setImportSuccess(false);
    fileInputRef.current?.click();
  }

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const imported = importJSON(String(reader.result));
        setData(imported);
        setImportSuccess(true);
      } catch (err) {
        setImportError(t('Ficheiro inválido. Verifica se é um backup exportado por esta aplicação.'));
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  }

  return (
    <div className="p-4 md:p-8 max-w-2xl mx-auto space-y-5">
      <h1 className="font-display text-3xl font-bold tracking-tight">{t('Definições')}</h1>

      <Card className="p-5 space-y-4">
        <p className="text-xs uppercase tracking-wide text-[var(--text-dim)]">{t('Perfil')}</p>
        <Field label={t('Nome')}>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={() => setData((d) => ({ ...d, profile: { ...d.profile, name } }))}
          />
        </Field>
      </Card>

      <Card className="p-5 space-y-3">
        <p className="text-xs uppercase tracking-wide text-[var(--text-dim)]">{t('Aparência')}</p>
        <div className="flex gap-2">
          <Button variant={theme === 'light' ? 'primary' : 'secondary'} onClick={() => setTheme('light')} className="flex-1">☀️ {t('Claro')}</Button>
          <Button variant={theme === 'dark' ? 'primary' : 'secondary'} onClick={() => setTheme('dark')} className="flex-1">🌙 {t('Escuro')}</Button>
        </div>
      </Card>

      <Card className="p-5 space-y-3">
        <p className="text-xs uppercase tracking-wide text-[var(--text-dim)]">{t('Idioma')}</p>
        <Field label={t('Idioma da aplicação')}>
          <select value={locale} onChange={(e) => setLocale(e.target.value as typeof locale)} className="w-full rounded-lg px-3 py-2.5 text-sm">
            {LOCALES.map((code) => <option key={code} value={code}>{t(code)}</option>)}
          </select>
        </Field>
      </Card>

      <Card className="p-5 space-y-3">
        <p className="text-xs uppercase tracking-wide text-[var(--text-dim)]">{t('Backup')}</p>
        <p className="text-sm text-[var(--text-dim)]">
          {t('Os teus dados ficam guardados apenas neste dispositivo (localStorage do browser). Exporta regularmente para não os perderes.')}
        </p>
        <div className="grid sm:grid-cols-2 gap-2">
          <Button variant="secondary" onClick={handleExportJSON}>{t('Backup JSON')}</Button>
          <Button variant="secondary" onClick={handleExportCSV}>{t('Exportar CSV')}</Button>
        </div>
        <Button variant="secondary" className="w-full" onClick={handleImportClick}>{t('Restaurar backup')}</Button>
        <input ref={fileInputRef} type="file" accept="application/json" className="hidden" onChange={handleFile} />
        {importError && <p className="text-xs text-[var(--negative)]">{importError}</p>}
        {importSuccess && <p className="text-xs text-[var(--positive)]">{t('Dados importados com sucesso.')}</p>}
      </Card>

      <Card className="p-5 space-y-1">
        <p className="text-xs uppercase tracking-wide text-[var(--text-dim)]">{t('Sobre')}</p>
        <p className="text-sm text-[var(--text-dim)]">{APP_NAME} · {t('dados guardados localmente · sem contas, sem servidores.')}</p>
      </Card>
    </div>
  );
}
