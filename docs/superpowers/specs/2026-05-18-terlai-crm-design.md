# TERLAI SYSTEM CRM — Design Spec

**Data:** 2026-05-18  
**Stack:** React 18 + Vite + TypeScript + Tailwind CSS + Supabase

---

## Arquitetura

SPA com React Router v6. Supabase como backend completo (auth, DB, storage). Sem SSR.

```
src/
  components/       # UI compartilhado
  pages/            # Dashboard, Receipts, Dynamics, Reports, Admin, Login
  hooks/            # useAuth, useReceipts, useDynamics, useReports
  lib/              # supabase.ts, formatters
  types/            # interfaces globais
```

---

## Design System

- **darkMode:** `'class'` no Tailwind — NUNCA usar classe `dark`
- Script inline no `<head>`: `document.documentElement.classList.remove('dark')`
- `html` sempre com `class="light"`
- Background: `#F2F2F0`
- Sidebar: `#FFFFFF`, borda `1px solid #E5E5E5`
- Cards: `rgba(255,255,255,0.75)` + `backdrop-blur-md` + borda `rgba(0,0,0,0.06)` + `rounded-xl`
- Texto primário: `#1A1A1A` | Secundário: `#999999`
- Labels: `#AAAAAA` uppercase, `font-size: 11px`, `letter-spacing: 0.08em`
- Valores grandes: `#111111 font-weight 600`
- Botão primário: bg `#1A1A1A`, texto branco
- Item ativo sidebar: bg `#1A1A1A`, texto branco
- Gráficos: monocromático cinza
- Fonte: Inter (Google Fonts)
- Zero cores vibrantes

---

## Autenticação

- Supabase Auth (email + senha)
- Trigger SQL `on_auth_user_created` → insere em `profiles`
- Primeiro usuário → `role = 'admin'`; demais → `role = 'vendedor'`
- `ProtectedRoute` para rotas autenticadas
- `AdminRoute` para rotas exclusivas de admin

---

## Banco de Dados

### profiles
```sql
id uuid PK (references auth.users)
full_name text
email text
role text default 'vendedor'
active boolean default true
created_at timestamptz
```

### receipts
```sql
id uuid PK
user_id uuid FK profiles
file_url text
file_type text
amount numeric
deposit_date date
bank text
notes text
status text default 'pending' -- pending | approved | rejected
created_at timestamptz
```

### dynamics_cards
```sql
id uuid PK
board text  -- 'board1' | 'board2'
column_id text
title text
description text
category text
attachment_url text
attachment_name text
attachment_type text
position integer
created_by uuid FK profiles
created_at timestamptz
```

### weekly_planner
```sql
id uuid PK
card_id uuid FK dynamics_cards
day_of_week text  -- SEG|TER|QUA|QUI|SEX|SAB|DOM
position integer
scheduled_date date
created_at timestamptz
```

### Storage Buckets
- `receipts` — público
- `dynamics-attachments` — público

### RLS
- `vendedor`: SELECT/INSERT/UPDATE onde `user_id = auth.uid()`
- `admin`: acesso total via policy com `role = 'admin'` no profiles

---

## Telas

### 1. Dashboard
- Cards: Total Equipe, Vendedores, Depósitos, Média/Vendedor
- Filtros: HOJE / 7D / 15D / 30D (pills)
- LineChart: depósitos diários (fill gradiente cinza)
- DonutChart: índice de eficiência da equipe
- Top Performer card
- Leaderboard com BarChart

### 2. Comprovantes
- Form: valor, data, banco, observação + upload PDF/imagem
- Tabela: vendedor, valor, data, banco, status
- Drawer lateral: visualizar arquivo inline

### 3. Dinâmicas (Kanban)
- Board 1: Alavancagem de Capital | Recuperação de Capital | Entrada Assertiva | Disparos
- Board 2: SEG | TER | QUA | QUI | SEX | SAB | DOM
- Drag and drop com @dnd-kit (dentro e entre boards)
- Card: título, descrição, categoria, anexo
- Visualizador inline de anexos
- Posições salvas no Supabase

### 4. Relatórios (admin only)
- Cards: Volume Semanal, Melhor Dia, Pico
- BarChart: depósitos por dia da semana
- Ranking com tags de dinâmicas clicáveis
- Drawer lateral com detalhes da dinâmica

### 5. Admin
- Tabela de usuários: mudar role, ativar/desativar
- Todos os comprovantes com ações aprovar/rejeitar

---

## Dependências principais
- `@supabase/supabase-js`
- `react-router-dom`
- `@dnd-kit/core` + `@dnd-kit/sortable` + `@dnd-kit/utilities`
- `recharts`
- `react-hook-form`
- `date-fns`
