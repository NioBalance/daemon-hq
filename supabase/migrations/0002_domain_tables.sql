-- DÆMON Production HQ — Step 3: tabelle di dominio + bucket storage.
-- Esegui in Supabase Dashboard → SQL Editor (progetto clsyjggifbfwnrdbzprk),
-- dopo 0001_profiles.sql → Run. Idempotente: puoi rieseguirlo se qualcosa fallisce a metà.

begin;

create extension if not exists pgcrypto;

-- ============================================================
-- FORNITORI
-- ============================================================
create table if not exists public.fornitori (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  luogo text,
  ruolo text check (ruolo in ('core', 'capsule', 'backup')),
  contatto text,
  lead_time text,
  materiali text,
  stato text check (stato in ('da-contattare', 'vetting', 'attivo', 'scartato')) not null default 'da-contattare',
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
drop trigger if exists fornitori_set_updated_at on public.fornitori;
create trigger fornitori_set_updated_at
  before update on public.fornitori
  for each row execute function public.set_updated_at();

-- ============================================================
-- DROPS + FASI PIPELINE
-- ============================================================
create table if not exists public.drops (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  data_lancio date,
  owner text check (owner in ('design', 'logistica', 'fornitori')),
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
drop trigger if exists drops_set_updated_at on public.drops;
create trigger drops_set_updated_at
  before update on public.drops
  for each row execute function public.set_updated_at();

create table if not exists public.drop_fasi (
  id uuid primary key default gen_random_uuid(),
  drop_id uuid not null references public.drops(id) on delete cascade,
  nome text not null,
  data date,
  done boolean not null default false,
  ordine int not null default 0
);
create index if not exists drop_fasi_drop_id_idx on public.drop_fasi(drop_id);

-- ============================================================
-- ARTICOLI + TASK
-- ============================================================
create table if not exists public.articoli (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  categoria text,
  colori text,
  drop_id uuid references public.drops(id) on delete set null,
  img_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists articoli_drop_id_idx on public.articoli(drop_id);
drop trigger if exists articoli_set_updated_at on public.articoli;
create trigger articoli_set_updated_at
  before update on public.articoli
  for each row execute function public.set_updated_at();

create table if not exists public.articolo_tasks (
  id uuid primary key default gen_random_uuid(),
  articolo_id uuid not null references public.articoli(id) on delete cascade,
  testo text not null,
  done boolean not null default false,
  ordine int not null default 0
);
create index if not exists articolo_tasks_articolo_id_idx on public.articolo_tasks(articolo_id);

-- ============================================================
-- DESIGN (kanban) — ordine per la posizione nella colonna
-- ============================================================
create table if not exists public.designs (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  categoria text,
  fase text check (fase in ('idea', 'sketch', 'techpack', 'campione', 'approvato')) not null default 'idea',
  owner text check (owner in ('design', 'logistica', 'fornitori')),
  note text,
  ordine int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
drop trigger if exists designs_set_updated_at on public.designs;
create trigger designs_set_updated_at
  before update on public.designs
  for each row execute function public.set_updated_at();

-- ============================================================
-- TECH PACK
-- ============================================================
create table if not exists public.techpacks (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  categoria text,
  colorway text,
  materiali text,
  taglie text,
  fornitore_id uuid references public.fornitori(id) on delete set null,
  stato text check (stato in ('bozza', 'inviato', 'confermato', 'in-produzione')) not null default 'bozza',
  owner text check (owner in ('design', 'logistica', 'fornitori')),
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists techpacks_fornitore_id_idx on public.techpacks(fornitore_id);
drop trigger if exists techpacks_set_updated_at on public.techpacks;
create trigger techpacks_set_updated_at
  before update on public.techpacks
  for each row execute function public.set_updated_at();

-- ============================================================
-- CAMPIONI
-- ============================================================
create table if not exists public.samples (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  fornitore_id uuid references public.fornitori(id) on delete set null,
  data_arrivo date,
  fit int check (fit between 1 and 5),
  tessuto int check (tessuto between 1 and 5),
  cuciture int check (cuciture between 1 and 5),
  colore int check (colore between 1 and 5),
  verdetto text check (verdetto in ('in-review', 'approvato', 'revisione', 'scartato')) not null default 'in-review',
  owner text check (owner in ('design', 'logistica', 'fornitori')),
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists samples_fornitore_id_idx on public.samples(fornitore_id);
drop trigger if exists samples_set_updated_at on public.samples;
create trigger samples_set_updated_at
  before update on public.samples
  for each row execute function public.set_updated_at();

-- ============================================================
-- ARCHIVIO: gadget, inspirazione, link — ordine per riordino manuale
-- ============================================================
create table if not exists public.gadgets (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  img_path text,
  ordine int not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.inspo (
  id uuid primary key default gen_random_uuid(),
  titolo text not null,
  img_path text,
  ordine int not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.links (
  id uuid primary key default gen_random_uuid(),
  label text not null,
  url text,
  ordine int not null default 0,
  created_at timestamptz not null default now()
);

-- ============================================================
-- AI + CANALI CHAT (liste fisse di link rapidi)
-- ============================================================
create table if not exists public.ai_links (
  id uuid primary key default gen_random_uuid(),
  label text not null,
  url text
);

create table if not exists public.chat_channels (
  id uuid primary key default gen_random_uuid(),
  label text not null,
  url text
);

-- ============================================================
-- CUSTOMER CARE
-- ============================================================
create table if not exists public.chats (
  id uuid primary key default gen_random_uuid(),
  cliente text not null,
  canale text check (canale in ('wa', 'ig', 'email')) not null default 'wa',
  stato text check (stato in ('aperta', 'in-attesa', 'chiusa')) not null default 'aperta',
  owner text check (owner in ('design', 'logistica', 'fornitori')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
drop trigger if exists chats_set_updated_at on public.chats;
create trigger chats_set_updated_at
  before update on public.chats
  for each row execute function public.set_updated_at();

-- ============================================================
-- MEDIA — ordine per riordino manuale nella galleria
-- ============================================================
create table if not exists public.media (
  id uuid primary key default gen_random_uuid(),
  titolo text not null,
  tipo text check (tipo in ('foto', 'video', 'logo')) not null default 'foto',
  url text,
  img_path text,
  ordine int not null default 0,
  created_at timestamptz not null default now()
);

-- ============================================================
-- CALENDARIO
-- ============================================================
create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  titolo text not null,
  data date not null,
  tipo text check (tipo in ('meeting', 'deadline', 'lancio')) not null default 'meeting',
  note text,
  created_at timestamptz not null default now()
);
create index if not exists events_data_idx on public.events(data);

-- ============================================================
-- NOTE firmate, polimorfiche (articoli, gadgets, inspo, media, chats)
-- ============================================================
create table if not exists public.notes (
  id uuid primary key default gen_random_uuid(),
  entity_type text check (entity_type in ('articoli', 'gadgets', 'inspo', 'media', 'chats')) not null,
  entity_id uuid not null,
  author_id uuid references public.profiles(id) on delete set null,
  author_name text not null,
  testo text not null,
  created_at timestamptz not null default now()
);
create index if not exists notes_entity_idx on public.notes(entity_type, entity_id);

-- ============================================================
-- RLS — tutti gli autenticati leggono/scrivono tutto (tool di team
-- condiviso), tranne "notes": chiunque scrive, ma solo l'autore
-- modifica o cancella le proprie note.
-- ============================================================
do $$
declare
  t text;
  shared_tables text[] := array[
    'fornitori', 'drops', 'drop_fasi', 'articoli', 'articolo_tasks', 'designs',
    'techpacks', 'samples', 'gadgets', 'inspo', 'links', 'ai_links', 'chat_channels',
    'chats', 'media', 'events'
  ];
begin
  foreach t in array shared_tables loop
    execute format('alter table public.%I enable row level security', t);

    execute format('drop policy if exists %I on public.%I', t || '_select_authenticated', t);
    execute format(
      'create policy %I on public.%I for select to authenticated using (true)',
      t || '_select_authenticated', t
    );

    execute format('drop policy if exists %I on public.%I', t || '_insert_authenticated', t);
    execute format(
      'create policy %I on public.%I for insert to authenticated with check (true)',
      t || '_insert_authenticated', t
    );

    execute format('drop policy if exists %I on public.%I', t || '_update_authenticated', t);
    execute format(
      'create policy %I on public.%I for update to authenticated using (true) with check (true)',
      t || '_update_authenticated', t
    );

    execute format('drop policy if exists %I on public.%I', t || '_delete_authenticated', t);
    execute format(
      'create policy %I on public.%I for delete to authenticated using (true)',
      t || '_delete_authenticated', t
    );
  end loop;
end $$;

alter table public.notes enable row level security;

drop policy if exists "notes_select_authenticated" on public.notes;
create policy "notes_select_authenticated"
  on public.notes for select
  to authenticated
  using (true);

drop policy if exists "notes_insert_own" on public.notes;
create policy "notes_insert_own"
  on public.notes for insert
  to authenticated
  with check (author_id = auth.uid());

drop policy if exists "notes_update_own" on public.notes;
create policy "notes_update_own"
  on public.notes for update
  to authenticated
  using (author_id = auth.uid())
  with check (author_id = auth.uid());

drop policy if exists "notes_delete_own" on public.notes;
create policy "notes_delete_own"
  on public.notes for delete
  to authenticated
  using (author_id = auth.uid());

-- ============================================================
-- STORAGE — bucket "media": foto/video/loghi/audio del brand.
-- Limite 5 MB per file, solo i formati elencati (enforced dal bucket
-- stesso, non solo dal client). Lettura pubblica, scrittura riservata
-- agli utenti autenticati.
-- ============================================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'media', 'media', true, 5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'audio/mpeg', 'video/mp4', 'video/quicktime']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "media_bucket_public_read" on storage.objects;
create policy "media_bucket_public_read"
  on storage.objects for select
  using (bucket_id = 'media');

drop policy if exists "media_bucket_authenticated_insert" on storage.objects;
create policy "media_bucket_authenticated_insert"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'media');

drop policy if exists "media_bucket_authenticated_update" on storage.objects;
create policy "media_bucket_authenticated_update"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'media')
  with check (bucket_id = 'media');

drop policy if exists "media_bucket_authenticated_delete" on storage.objects;
create policy "media_bucket_authenticated_delete"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'media');

commit;
