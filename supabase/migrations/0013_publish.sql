-- DÆMON Production HQ — Fase 4: Publish (pipeline contenuti).
-- Esegui in Supabase Dashboard → SQL Editor, dopo 0001-0012 → Run.
-- Idempotente e transazionale.
--
-- publish_items = board a 5 fasi (Idea → In-Edit → Pronto → Programmato →
-- Pubblicato). Ogni contenuto: titolo, tipo (post/reel/story), canale,
-- data programmata, asset collegato dal Media Studio (media_id), owner.
-- RLS condivisa come le altre tabelle di dominio.

begin;

create table if not exists public.publish_items (
  id uuid primary key default gen_random_uuid(),
  titolo text not null,
  tipo text not null check (tipo in ('post', 'reel', 'story')) default 'post',
  canale text,
  fase text not null check (fase in ('idea', 'in-edit', 'pronto', 'programmato', 'pubblicato')) default 'idea',
  data_programmata date,
  media_id uuid references public.media(id) on delete set null,
  owner text check (owner in ('design', 'logistica', 'fornitori')),
  note text,
  ordine int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists publish_items_fase_ordine_idx on public.publish_items (fase, ordine);

alter table public.publish_items enable row level security;

drop policy if exists "publish_items_select_authenticated" on public.publish_items;
create policy "publish_items_select_authenticated"
  on public.publish_items for select to authenticated using (true);
drop policy if exists "publish_items_insert_authenticated" on public.publish_items;
create policy "publish_items_insert_authenticated"
  on public.publish_items for insert to authenticated with check (true);
drop policy if exists "publish_items_update_authenticated" on public.publish_items;
create policy "publish_items_update_authenticated"
  on public.publish_items for update to authenticated using (true) with check (true);
drop policy if exists "publish_items_delete_authenticated" on public.publish_items;
create policy "publish_items_delete_authenticated"
  on public.publish_items for delete to authenticated using (true);

commit;
