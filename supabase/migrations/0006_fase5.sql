-- DÆMON Production HQ — Fase 5: log attività (widget notifiche) + KPI snapshots.
-- Esegui in Supabase Dashboard → SQL Editor, dopo 0001-0005 → Run.
-- Idempotente e transazionale: un rilancio non rompe nulla.

begin;

-- ============================================================
-- LOG ATTIVITÀ (§7.1): ogni create/edit/delete significativo scrive una
-- riga {autore, azione, oggetto, tab}; l'app la mostra nel widget
-- "Notifiche — ultimi change" e la usa per il badge non-visti (timestamp
-- ultima visita in chiave locale per utente). Cap ~200 voci: il trim FIFO
-- lo fa l'app dopo l'insert (serve la policy di delete condivisa).
-- ============================================================
create table if not exists public.activity (
  id uuid primary key default gen_random_uuid(),
  author_id uuid references public.profiles(id) on delete set null,
  author_name text not null,
  azione text not null,
  oggetto text not null,
  tab text,
  created_at timestamptz not null default now()
);
create index if not exists activity_created_at_idx on public.activity (created_at desc);

alter table public.activity enable row level security;

drop policy if exists "activity_select_authenticated" on public.activity;
create policy "activity_select_authenticated"
  on public.activity for select to authenticated using (true);

drop policy if exists "activity_insert_own" on public.activity;
create policy "activity_insert_own"
  on public.activity for insert to authenticated with check (author_id = auth.uid());

drop policy if exists "activity_delete_authenticated" on public.activity;
create policy "activity_delete_authenticated"
  on public.activity for delete to authenticated using (true);

-- ============================================================
-- KPI SNAPSHOTS: metriche esterne inserite a mano dalla Overview
-- (follower, ordini, pacchi, waitlist, revenue). Un valore per metrica
-- per giorno (unique) così il re-inserimento in giornata fa upsert.
-- ============================================================
create table if not exists public.kpi_snapshots (
  id uuid primary key default gen_random_uuid(),
  metrica text not null check (metrica in (
    'instagram_followers', 'ordini_totali', 'pacchi_drop', 'waitlist', 'revenue_drop'
  )),
  valore numeric not null,
  data date not null default current_date,
  inserito_da text not null,
  created_at timestamptz not null default now(),
  unique (metrica, data)
);
create index if not exists kpi_snapshots_metrica_data_idx on public.kpi_snapshots (metrica, data);

alter table public.kpi_snapshots enable row level security;

drop policy if exists "kpi_snapshots_select_authenticated" on public.kpi_snapshots;
create policy "kpi_snapshots_select_authenticated"
  on public.kpi_snapshots for select to authenticated using (true);

drop policy if exists "kpi_snapshots_insert_authenticated" on public.kpi_snapshots;
create policy "kpi_snapshots_insert_authenticated"
  on public.kpi_snapshots for insert to authenticated with check (true);

drop policy if exists "kpi_snapshots_update_authenticated" on public.kpi_snapshots;
create policy "kpi_snapshots_update_authenticated"
  on public.kpi_snapshots for update to authenticated using (true) with check (true);

drop policy if exists "kpi_snapshots_delete_authenticated" on public.kpi_snapshots;
create policy "kpi_snapshots_delete_authenticated"
  on public.kpi_snapshots for delete to authenticated using (true);

commit;
