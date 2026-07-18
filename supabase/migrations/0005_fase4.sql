-- DÆMON Production HQ — Fase 4: Note/Memo, Tech Pack cartelle, calendario embed.
-- Esegui in Supabase Dashboard → SQL Editor, dopo 0001-0004 → Run.
-- Idempotente e transazionale: un rilancio non rompe nulla.

begin;

-- ============================================================
-- NOTE / MEMO — bacheca team (§5.3): autore, pin, tag colore.
-- RLS "notes-style": tutti leggono, chiunque crea firmando come sé,
-- ma solo l'autore modifica/cancella (pin compreso).
-- ============================================================
create table if not exists public.team_memos (
  id uuid primary key default gen_random_uuid(),
  author_id uuid references public.profiles(id) on delete set null,
  author_name text not null,
  testo text not null,
  pin boolean not null default false,
  colore text check (colore in ('decisione', 'idea', 'urgente')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
drop trigger if exists team_memos_set_updated_at on public.team_memos;
create trigger team_memos_set_updated_at
  before update on public.team_memos
  for each row execute function public.set_updated_at();

alter table public.team_memos enable row level security;

drop policy if exists "team_memos_select_authenticated" on public.team_memos;
create policy "team_memos_select_authenticated"
  on public.team_memos for select to authenticated using (true);

drop policy if exists "team_memos_insert_own" on public.team_memos;
create policy "team_memos_insert_own"
  on public.team_memos for insert to authenticated with check (author_id = auth.uid());

drop policy if exists "team_memos_update_own" on public.team_memos;
create policy "team_memos_update_own"
  on public.team_memos for update to authenticated
  using (author_id = auth.uid()) with check (author_id = auth.uid());

drop policy if exists "team_memos_delete_own" on public.team_memos;
create policy "team_memos_delete_own"
  on public.team_memos for delete to authenticated using (author_id = auth.uid());

-- ============================================================
-- TECH PACK → FILE MANAGER (§5.2, decisione: upload REALI per
-- thumbnail/PDF leggeri su Storage; video e file pesanti come link Drive).
-- ============================================================
create table if not exists public.techpack_files (
  id uuid primary key default gen_random_uuid(),
  techpack_id uuid not null references public.techpacks(id) on delete cascade,
  nome text not null,
  tipo text not null check (tipo in ('img', 'pdf', 'link')),
  path text,
  url text,
  created_at timestamptz not null default now()
);
create index if not exists techpack_files_techpack_id_idx on public.techpack_files(techpack_id);

alter table public.techpack_files enable row level security;

drop policy if exists "techpack_files_select_authenticated" on public.techpack_files;
create policy "techpack_files_select_authenticated"
  on public.techpack_files for select to authenticated using (true);

drop policy if exists "techpack_files_insert_authenticated" on public.techpack_files;
create policy "techpack_files_insert_authenticated"
  on public.techpack_files for insert to authenticated with check (true);

drop policy if exists "techpack_files_update_authenticated" on public.techpack_files;
create policy "techpack_files_update_authenticated"
  on public.techpack_files for update to authenticated using (true) with check (true);

drop policy if exists "techpack_files_delete_authenticated" on public.techpack_files;
create policy "techpack_files_delete_authenticated"
  on public.techpack_files for delete to authenticated using (true);

-- Il changelog dei tech pack riusa le note firmate: 'techpacks' entra tra
-- i tipi ammessi. Drop+add del check è idempotente per costruzione.
alter table public.notes drop constraint if exists notes_entity_type_check;
alter table public.notes add constraint notes_entity_type_check
  check (entity_type in ('articoli', 'gadgets', 'inspo', 'media', 'chats', 'techpacks'));

-- I PDF dei tech pack vengono caricati davvero: il bucket deve accettarli.
-- Update assoluto della lista → idempotente.
update storage.buckets
set allowed_mime_types = array[
  'image/jpeg', 'image/png', 'image/webp', 'audio/mpeg',
  'video/mp4', 'video/quicktime', 'application/pdf'
]
where id = 'media';

-- ============================================================
-- CALENDARIO EMBED (§6.1): l'URL dell'iframe di Google Calendar vive in
-- una riga fissa di links, configurabile dall'app.
-- ============================================================
insert into public.links (id, label, url, ordine) values
  ('a0000008-0000-0000-0000-000000000008', 'Google Calendar — Embed', null, 7)
on conflict (id) do nothing;

commit;
