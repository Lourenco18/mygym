# MyGym

Aplicação pessoal de fitness / tracking de musculação. Corre 100% localmente
no browser, sem login, sem backend e sem serviços externos — todos os dados
ficam guardados no `localStorage` do teu browser.

> **Alterar o nome da aplicação:** edita a constante `APP_NAME` em
> `src/config.ts`. É a única linha que precisas de mudar.

## Como executar

Precisas de ter o [Node.js](https://nodejs.org) instalado (versão 18 ou
superior).

```bash
npm install
npm run dev
```

Depois abre o endereço que aparece no terminal, normalmente:

```
http://localhost:5173
```

Para gerar uma versão de produção (ficheiros estáticos otimizados):

```bash
npm run build
npm run preview   # serve a versão de produção localmente
```

A aplicação funciona completamente offline depois de carregada — não faz
pedidos a nenhum servidor externo (exceto o carregamento inicial das fontes
tipográficas do Google Fonts, puramente estético).

## Conceito principal

A aplicação separa sempre **o que planeaste** de **o que realmente fizeste**:

- Um **Plano de treino** define dias, exercícios, séries/repetições/peso
  objetivo — é a tua referência.
- Uma **Sessão de treino** guarda o que efetivamente registaste durante o
  treino (peso, repetições, séries extra) — nunca é sobrescrita quando
  editas o plano.

Isto permite comparar sempre **Objetivo vs. Realizado**.

## Estrutura do projeto

```
src/
  config.ts              nome da app, chaves de storage
  types.ts               todas as entidades de dados (Exercise, WorkoutPlan, WorkoutSession, ...)
  index.css              tema (cores, tipografia, dark/light mode)

  lib/
    id.ts                 geração de IDs únicos
    seed.ts                biblioteca inicial de exercícios comuns
    storage.ts              persistência em localStorage, export/import JSON e CSV
    calculations.ts          volume, 1RM estimado, PRs, streaks, sugestões de progressão

  context/
    AppContext.tsx          estado global da app + todas as ações (criar plano, registar série, etc.)

  components/
    ui.tsx                  componentes visuais partilhados (Button, Card, Modal, ...)
    Layout.tsx                sidebar (desktop) / navegação inferior (mobile), dark/light mode
    Dashboard.tsx              ecrã principal: treino de hoje, resumo da semana, progressão, PRs
    Plans.tsx                   criador e editor de planos (dias, exercícios, drag & drop)
    Exercises.tsx                 biblioteca de exercícios + histórico e gráficos por exercício
    Workout.tsx                    Modo Treino: séries e registo em tempo real
    History.tsx                      calendário mensal + histórico de sessões, marcar treinos perdidos
    Stats.tsx                          estatísticas gerais e gráficos (volume, frequência, peso corporal)
    BodyWeight.tsx                       peso corporal e medidas
    Nutrition.tsx                           tracking simples de calorias/proteína
    Goals.tsx                                 objetivos personalizados com progresso
    Feedback.tsx                               análise/observações geradas a partir dos dados reais
    Settings.tsx                                 perfil, tema, exportar/importar backup (JSON/CSV)
```

## Funcionalidades incluídas

- Criação de planos de treino com múltiplos dias, dias de descanso e
  exercícios reordenáveis (drag & drop ou setas ▲▼)
- Biblioteca de exercícios reutilizável — um exercício existe uma única vez
  e o seu histórico mantém-se associado mesmo que seja usado em vários planos
- Modo Treino guiado, exercício a exercício, com:
  - último treino registado para esse exercício
  - séries com peso/repetições flexíveis ou duração (ex.: prancha)
  - exercícios de peso corporal registam apenas repetições, exceto os definidos por duração
  - possibilidade de adicionar ou remover séries durante o treino
- Histórico completo por exercício com gráficos (peso, repetições, volume)
- Deteção automática de recordes pessoais (peso máximo, mais repetições,
  volume máximo numa sessão, estimativa de 1RM)
- Sugestões de progressão baseadas nos dados (nunca altera o plano
  automaticamente — a decisão é sempre tua)
- Adiar treinos: o botão **Adiar treino** (Dashboard e Calendário) empurra o treino para o dia seguinte e os seguintes avançam também, até ao primeiro dia de descanso. Cada treino guarda o dia original ("↷ Adiado · dia original: ..."); **Repor agenda original** no Calendário desfaz os adiamentos
- Calendário mensal com estado de cada dia (concluído / planeado / perdido /
  descanso) e possibilidade de marcar motivo de treino perdido
- Cumprimento do plano e streak de dias seguidos
- Peso corporal e medidas (cintura, braço, peito, perna) com gráfico
- Tracking simples de nutrição (calorias e proteína) com objetivos
- Objetivos personalizados com barra de progresso
- Página de Análise com observações escritas exclusivamente a partir dos
  dados registados (nunca inventa conclusões nem diagnósticos)
- Exportar dados completos em JSON (backup) e histórico em CSV
- Importar backup JSON para recuperar todos os dados
- Modo claro / escuro com preferência guardada
- Layout otimizado para telemóvel (navegação inferior, botões grandes) e
  desktop (sidebar lateral)

## Guardar os teus dados em segurança

Os dados só existem no `localStorage` deste browser, neste computador.
Fechar o browser **não apaga nada**, mas limpar os dados de navegação do
browser, sim. Usa regularmente **Definições → Exportar dados (JSON)** para
teres uma cópia de segurança, e **Importar dados (JSON)** para a restaurares
sempre que precisares (por exemplo, num browser ou computador novo).
