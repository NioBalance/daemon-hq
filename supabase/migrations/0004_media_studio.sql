-- DÆMON Production HQ — Fase 3: Media Studio (tag multipli + obiettivo + Photoroom).
-- Esegui in Supabase Dashboard → SQL Editor, dopo 0001-0003 → Run. Idempotente.
--
-- Modello: un media è un asset unico; l'appartenenza alle righe del Media
-- Studio (colonne Sito / Creative / Instagram) passa da tag multipli in
-- media_tags — un asset può vivere in più righe senza duplicati (es. un reel
-- taggato anche per Sito e Creative). I media esistenti restano senza tag e
-- compaiono nella fascia "Da classificare" della pagina.

begin;

-- Campo "obiettivo/concept" (usato dalle righe Adv-Idee e Stories).
alter table public.media add column if not exists obiettivo text;

create table if not exists public.media_tags (
  id uuid primary key default gen_random_uuid(),
  media_id uuid not null references public.media(id) on delete cascade,
  tag text not null check (tag in (
    'indossati', 'bg-removed', 'mobile', 'pc', 'loghi', 'shooting-archivio',
    'adv-pronte', 'adv-idee', 'removed-bg', 'in-edit',
    'stories', 'post', 'bozze', 'reel'
  )),
  created_at timestamptz not null default now(),
  unique (media_id, tag)
);
create index if not exists media_tags_tag_idx on public.media_tags(tag);
create index if not exists media_tags_media_id_idx on public.media_tags(media_id);

alter table public.media_tags enable row level security;

drop policy if exists "media_tags_select_authenticated" on public.media_tags;
create policy "media_tags_select_authenticated"
  on public.media_tags for select to authenticated using (true);

drop policy if exists "media_tags_insert_authenticated" on public.media_tags;
create policy "media_tags_insert_authenticated"
  on public.media_tags for insert to authenticated with check (true);

drop policy if exists "media_tags_update_authenticated" on public.media_tags;
create policy "media_tags_update_authenticated"
  on public.media_tags for update to authenticated using (true) with check (true);

drop policy if exists "media_tags_delete_authenticated" on public.media_tags;
create policy "media_tags_delete_authenticated"
  on public.media_tags for delete to authenticated using (true);

-- Photoroom nei link rapidi del brand (collegato anche dalla riga Removed-bg).
insert into public.links (id, label, url, ordine) values
  ('a0000008-0000-0000-0000-000000000007', 'Photoroom', 'https://www.photoroom.com', 6)
on conflict (id) do nothing;

commit;
