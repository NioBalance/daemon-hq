-- DÆMON Production HQ — Rimozione dati demo del seed (0003).
-- Esegui in Supabase Dashboard → SQL Editor, dopo 0001-0014 → Run.
-- Idempotente: cancella solo le righe con gli ID noti del seed; se le hai
-- già tolte a mano è un no-op, e i dati REALI (con ID diversi) non vengono
-- toccati.
--
-- Rimuove il drop demo "Drop V — Autunno" e i suoi placeholder: le 7 fasi
-- con la descrizione lunga come nome (cascade dal drop), i 2 articoli di
-- esempio e le loro task (cascade dagli articoli). Eventuali articoli che
-- HAI aggiunto tu a quel drop restano, orfani ("Senza drop") — non li tocco.

begin;

-- articoli demo (cascade → articolo_tasks)
delete from public.articoli
where id in (
  'a0000003-0000-0000-0000-000000000001',
  'a0000003-0000-0000-0000-000000000002'
);

-- drop demo (cascade → drop_fasi)
delete from public.drops
where id = 'a0000002-0000-0000-0000-000000000001';

commit;
