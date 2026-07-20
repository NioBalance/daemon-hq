-- DÆMON Production HQ — Note firmate estese a drop, campioni, fornitori.
-- Esegui in Supabase Dashboard → SQL Editor, dopo 0001-0017 → Run.
-- Idempotente e transazionale.
--
-- La HQ Map permette di aggiungere una nota firmata dal nodo per QUALSIASI
-- entità della catena. Le note polimorfiche (tabella notes) finora coprivano
-- articoli/gadgets/inspo/media/chats/techpacks: aggiungo drops, samples,
-- fornitori. RLS invariata (le policy sono per riga, non per entity_type).

begin;

alter table public.notes drop constraint if exists notes_entity_type_check;
alter table public.notes add constraint notes_entity_type_check
  check (entity_type in ('articoli', 'gadgets', 'inspo', 'media', 'chats', 'techpacks', 'drops', 'samples', 'fornitori'));

commit;
