import React, { useEffect, useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { APP_NAME, THEME_KEY } from '../config';

const NAV = [
  { to: '/', label: 'Início', icon: 'home', end: true },
  { to: '/calendario', label: 'Calendário', icon: 'calendar' },
  { to: '/planos', label: 'Planos', icon: 'plans' },
  { to: '/exercicios', label: 'Exercícios', icon: 'exercise' },
  { to: '/progresso', label: 'Progresso', icon: 'progress' },
  { to: '/peso', label: 'Peso corporal', icon: 'weight' },
  { to: '/nutricao', label: 'Nutrição', icon: 'nutrition' },
  { to: '/objetivos', label: 'Objetivos', icon: 'goals' },
  { to: '/analise', label: 'Análise', icon: 'insights' },
  { to: '/definicoes', label: 'Definições', icon: 'settings' },
];

const BOTTOM_NAV = [
  { to: '/', label: 'Início', icon: 'home', end: true },
  { to: '/calendario', label: 'Calendário', icon: 'calendar' },
  { to: '/planos', label: 'Planos', icon: 'plans' },
  { to: '/progresso', label: 'Progresso', icon: 'progress' },
  { to: '/definicoes', label: 'Mais', icon: 'settings' },
];

type IconName = typeof NAV[number]['icon'];

function NavIcon({ name }: { name: IconName }) {
  const paths: Record<IconName, React.ReactNode> = {
    home: <><path d="m3 10 9-7 9 7" /><path d="M5 9v11h14V9M9 20v-6h6v6" /></>,
    calendar: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M16 3v4M8 3v4M3 10h18" /></>,
    plans: <><path d="M8 6h13M8 12h13M8 18h13" /><path d="m3 6 1 1 2-2M3 12l1 1 2-2M3 18l1 1 2-2" /></>,
    exercise: <><path d="M6 8v8M3 10v4M18 8v8M21 10v4M6 12h12" /></>,
    progress: <><path d="M3 20h18M5 16l5-5 4 3 6-8" /><path d="M16 6h4v4" /></>,
    weight: <><rect x="4" y="3" width="16" height="18" rx="3" /><path d="M9 8a3 3 0 0 1 6 0M12 8l2 3" /></>,
    nutrition: <><path d="M3 12h18a9 9 0 0 1-18 0ZM12 3v3M7 5l2 3M17 5l-2 3" /></>,
    goals: <><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="5" /><circle cx="12" cy="12" r="1" /></>,
    insights: <><path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1m8.6 8.6 2.1 2.1m0-12.8-2.1 2.1m-8.6 8.6-2.1 2.1" /><circle cx="12" cy="12" r="4" /></>,
    settings: <><circle cx="12" cy="12" r="3" /><path d="m19.4 15 .1.1 1.4 1.1-1.4 2.4-1.7-.7a8 8 0 0 1-1.6.9l-.3 1.8h-2.8l-.3-1.8a8 8 0 0 1-1.6-.9l-1.7.7-1.4-2.4 1.4-1.1a7 7 0 0 1 0-1.9l-1.4-1.1 1.4-2.4 1.7.7a8 8 0 0 1 1.6-.9l.3-1.8h2.8l.3 1.8a8 8 0 0 1 1.6.9l1.7-.7 1.4 2.4-1.4 1.1a7 7 0 0 1-.1 1.9Z" transform="translate(-1 -1)" /></>,
  };

  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className="w-[18px] h-[18px] shrink-0">
      {paths[name]}
    </svg>
  );
}

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
      <aside
        className="hidden md:flex md:flex-col w-64 shrink-0 sticky top-0 h-screen px-4 py-6 border-r"
        style={{ background: 'var(--sidebar-bg)', color: 'var(--sidebar-text)', borderColor: 'var(--border)' }}
      >
        <div className="px-2 mb-8 flex items-center gap-3">
          <span className="w-9 h-9 rounded-xl bg-[var(--accent)] flex items-center justify-center text-white font-semibold text-sm shadow-sm">M</span>
          <div>
            <span className="block font-semibold tracking-tight">{APP_NAME}</span>
            <span className="block text-xs text-[var(--text-dim)]">O teu espaço de treino</span>
          </div>
        </div>
        <p className="px-3 mb-2 text-[11px] font-semibold uppercase tracking-wider text-[var(--text-dim)]">Menu</p>
        <nav className="flex-1 flex flex-col gap-1" aria-label="Navegação principal">
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `app-nav-link flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium ${isActive ? 'font-semibold' : ''}`
              }
            >
              <NavIcon name={item.icon} />
              {item.label}
            </NavLink>
          ))}
        </nav>
        <button
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          className="mt-4 flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm text-[var(--text-dim)] hover:text-[var(--text)] hover:bg-black/5 transition-colors"
        >
          <span aria-hidden>{theme === 'dark' ? '☼' : '◐'}</span>
          {theme === 'dark' ? 'Modo claro' : 'Modo escuro'}
        </button>
      </aside>

      <main className="flex-1 min-w-0 pb-24 md:pb-8">
        <Outlet context={{ theme, setTheme }} />
      </main>

      <nav
        aria-label="Navegação principal"
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 border-t flex justify-around backdrop-blur-xl"
        style={{
          background: 'color-mix(in srgb, var(--bg-raised) 92%, transparent)',
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
              `flex min-w-[56px] flex-col items-center gap-1 py-2.5 px-2 text-[10px] font-medium transition-colors ${
                isActive ? 'text-[var(--accent)]' : 'text-[var(--text-dim)]'
              }`
            }
          >
            <NavIcon name={item.icon} />
            {item.label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
