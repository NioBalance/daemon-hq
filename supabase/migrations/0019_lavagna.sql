-- DÆMON Production HQ — Lavagna: canvas libero (nodi + connessioni).
-- Esegui in Supabase Dashboard → SQL Editor, dopo 0001-0018 → Run.
-- Idempotente e transazionale.
--
-- Appunti visivi per brainstorming, SLEGATI dal dominio: i nodi non creano
-- entità reali. Persistiti per ritrovare la lavagna. RLS condivisa (team).
-- ref_* è un riferimento LIBERO opzionale a un'entità reale (link alla
-- scheda): niente FK, così cancellare l'entità non tocca l'appunto.

begin;

create table if not exists public.canvas_nodes (
  id uuid primary key default gen_random_uuid(),
  testo text not null default '',
  colore text not null default 'bone',
  forma text not null check (forma in ('rect', 'pill', 'ellisse')) default 'rect',
  x double precision not null default 0,
  y double precision not null default 0,
  w double precision not null default 170,
  h double precision not null default 72,
  ref_kind text,
  ref_id uuid,
  ref_label text,
  created_by text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.canvas_nodes enable row level security;
drop policy if exists "canvas_nodes_select_authenticated" on public.canvas_nodes;
create policy "canvas_nodes_select_authenticated" on public.canvas_nodes for select to authenticated using (true);
drop policy if exists "canvas_nodes_insert_authenticated" on public.canvas_nodes;
create policy "canvas_nodes_insert_authenticated" on public.canvas_nodes for insert to authenticated with check (true);
drop policy if exists "canvas_nodes_update_authenticated" on public.canvas_nodes;
create policy "canvas_nodes_update_authenticated" on public.canvas_nodes for update to authenticated using (true) with check (true);
drop policy if exists "canvas_nodes_delete_authenticated" on public.canvas_nodes;
create policy "canvas_nodes_delete_authenticated" on public.canvas_nodes for delete to authenticated using (true);

create table if not exists public.canvas_edges (
  id uuid primary key default gen_random_uuid(),
  source uuid not null references public.canvas_nodes(id) on delete cascade,
  target uuid not null references public.canvas_nodes(id) on delete cascade,
  created_at timestamptz not null default now()
);
create index if not exists canvas_edges_source_idx on public.canvas_edges(source);
create index if not exists canvas_edges_target_idx on public.canvas_edges(target);

alter table public.canvas_edges enable row level security;
drop policy if exists "canvas_edges_select_authenticated" on public.canvas_edges;
create policy "canvas_edges_select_authenticated" on public.canvas_edges for select to authenticated using (true);
drop policy if exists "canvas_edges_insert_authenticated" on public.canvas_edges;
create policy "canvas_edges_insert_authenticated" on public.canvas_edges for insert to authenticated with check (true);
drop policy if exists "canvas_edges_delete_authenticated" on public.canvas_edges;
create policy "canvas_edges_delete_authenticated" on public.canvas_edges for delete to authenticated using (true);

commit;
