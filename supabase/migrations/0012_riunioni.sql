-- DÆMON Production HQ — Fase 4: Riunioni (meetings + meeting_actions).
-- Esegui in Supabase Dashboard → SQL Editor, dopo 0001-0011 → Run.
-- Idempotente e transazionale.
--
-- meetings = una riunione del team (data, partecipanti, verbale, stato).
-- meeting_actions = gli action item (testo, assegnatario, scadenza, done).
-- L'agenda "spunti dalle urgenze" NON è persistita: la pagina la calcola
-- live riusando le fonti di Oggi. RLS condivisa come le altre tabelle di
-- dominio (strumento di team, nessun isolamento per autore).

begin;

create table if not exists public.meetings (
  id uuid primary key default gen_random_uuid(),
  titolo text not null,
  data date,
  partecipanti text,
  note text,
  stato text not null check (stato in ('pianificata', 'conclusa')) default 'pianificata',
  author_id uuid references public.profiles(id) on delete set null,
  author_name text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists meetings_data_idx on public.meetings (data desc);

alter table public.meetings enable row level security;

drop policy if exists "meetings_select_authenticated" on public.meetings;
create policy "meetings_select_authenticated"
  on public.meetings for select to authenticated using (true);
drop policy if exists "meetings_insert_authenticated" on public.meetings;
create policy "meetings_insert_authenticated"
  on public.meetings for insert to authenticated with check (true);
drop policy if exists "meetings_update_authenticated" on public.meetings;
create policy "meetings_update_authenticated"
  on public.meetings for update to authenticated using (true) with check (true);
drop policy if exists "meetings_delete_authenticated" on public.meetings;
create policy "meetings_delete_authenticated"
  on public.meetings for delete to authenticated using (true);

create table if not exists public.meeting_actions (
  id uuid primary key default gen_random_uuid(),
  meeting_id uuid not null references public.meetings(id) on delete cascade,
  testo text not null,
  assegnatario text,
  scadenza date,
  done boolean not null default false,
  ordine int not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists meeting_actions_meeting_id_idx on public.meeting_actions (meeting_id);
create index if not exists meeting_actions_done_idx on public.meeting_actions (done);

alter table public.meeting_actions enable row level security;

drop policy if exists "meeting_actions_select_authenticated" on public.meeting_actions;
create policy "meeting_actions_select_authenticated"
  on public.meeting_actions for select to authenticated using (true);
drop policy if exists "meeting_actions_insert_authenticated" on public.meeting_actions;
create policy "meeting_actions_insert_authenticated"
  on public.meeting_actions for insert to authenticated with check (true);
drop policy if exists "meeting_actions_update_authenticated" on public.meeting_actions;
create policy "meeting_actions_update_authenticated"
  on public.meeting_actions for update to authenticated using (true) with check (true);
drop policy if exists "meeting_actions_delete_authenticated" on public.meeting_actions;
create policy "meeting_actions_delete_authenticated"
  on public.meeting_actions for delete to authenticated using (true);

commit;
