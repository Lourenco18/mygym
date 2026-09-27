import React, { useEffect, useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { APP_NAME, THEME_KEY } from '../config';

const NAV = [
  { to: '/', label: 'Dashboard', icon: '🏠', end: true },
  { to: '/calendario', label: 'Calendário', icon: '📅' },
  { to: '/planos', label: 'Planos', icon: '📋' },
  { to: '/exercicios', label: 'Exercícios', icon: '🏋️' },
  { to: '/progresso', label: 'Progresso', icon: '📈' },
  { to: '/peso', label: 'Peso', icon: '⚖️' },
  { to: '/cardio', label: 'Cardio', icon: '🏃' },
  { to: '/nutricao', label: 'Nutrição', icon: '🍽️' },
  { to: '/objetivos', label: 'Objetivos', icon: '🎯' },
  { to: '/analise', label: 'Análise', icon: '💡' },
  { to: '/definicoes', label: 'Definições', icon: '⚙️' },
];

const BOTTOM_NAV = [
  { to: '/', label: 'Início', icon: '🏠', end: true },
  { to: '/calendario', label: 'Calendário', icon: '📅' },
  { to: '/planos', label: 'Plano', icon: '🏋️' },
  { to: '/progresso', label: 'Progresso', icon: '📈' },
  { to: '/definicoes', label: 'Mais', icon: '⚙️' },
];

function useTheme() {
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const saved = localStorage.getItem(THEME_KEY);
    if (saved === 'light' || saved === 'dark') return saved;
    return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem(THEME_KEY, theme);
  }, [theme]);

  return { theme, setTheme };
}

export function Layout() {
  const { theme, setTheme } = useTheme();

  return (
    <div className="min-h-screen flex" style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
      {/* Desktop sidebar */}
      <aside
        className="hidden md:flex md:flex-col w-60 shrink-0 sticky top-0 h-screen px-4 py-6"
        style={{ background: 'var(--sidebar-bg)', color: 'var(--sidebar-text)' }}
      >
        <div className="px-2 mb-8 flex items-center gap-2">
          <span className="w-8 h-8 rounded-md bg-[var(--accent)] flex items-center justify-center font-display font-bold text-[var(--accent-text)]">M</span>
          <span className="font-display text-xl font-bold tracking-tight">{APP_NAME}</span>
        </div>
        <nav className="flex-1 flex flex-col gap-1">
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive ? 'bg-white/10 text-white' : 'text-white/60 hover:text-white hover:bg-white/5'
                }`
              }
            >
              <span aria-hidden>{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
        </nav>
        <button
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          className="mt-4 flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-white/60 hover:text-white hover:bg-white/5"
        >
          {theme === 'dark' ? '☀️ Modo claro' : '🌙 Modo escuro'}
        </button>
      </aside>

      {/* Main content */}
      <main className="flex-1 min-w-0 pb-24 md:pb-8">
        <Outlet context={{ theme, setTheme }} />
      </main>

      {/* Mobile bottom nav */}
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 border-t flex justify-around"
        style={{
          background: 'var(--bg-raised)',
          borderColor: 'var(--border)',
          paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        }}
      >
        {BOTTOM_NAV.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              `flex flex-col items-center gap-0.5 py-2.5 px-3 text-xs font-medium ${
                isActive ? 'text-[var(--accent)]' : 'text-[var(--text-dim)]'
              }`
            }
          >
            <span className="text-xl leading-none" aria-hidden>{item.icon}</span>
            {item.label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
