-- DÆMON Production HQ — Ripristino del Drop V — Autunno (annulla la 0015).
-- Esegui in Supabase Dashboard → SQL Editor, dopo 0001-0015 → Run.
-- Idempotente: reinserisce solo se le righe non ci sono (on conflict / not
-- exists), così un rilancio non duplica nulla.
--
-- La 0015 aveva tolto il Drop V pensandolo un placeholder, ma serviva come
-- base modificabile. Qui torna: drop + 7 fasi della pipeline (nomi brevi,
-- con date reali spalmate fino al lancio, tutte modificabili) + i 2 articoli
-- di esempio con le loro task.

begin;

insert into public.drops (id, nome, data_lancio, owner, note) values
  ('a0000002-0000-0000-0000-000000000001', 'Drop V — Autunno', '2026-10-15', 'logistica',
   'Lezione dal drop preordine: buffer produzione +15gg, date comunicate solo a merce in mano. Payout: 30% avvio, 70% dopo prima settimana vendite.')
on conflict (id) do nothing;

insert into public.drop_fasi (drop_id, nome, data, done, ordine)
select 'a0000002-0000-0000-0000-000000000001', v.nome, v.data::date, false, v.ordine
from (values
  ('Supplier & Sample', '2026-08-15', 0),
  ('Production Ready',  '2026-08-28', 1),
  ('Content Production', '2026-09-10', 2),
  ('Store Setup',       '2026-09-24', 3),
  ('Pre-Launch',        '2026-10-05', 4),
  ('Launch',            '2026-10-15', 5),
  ('Post-Launch',       '2026-10-28', 6)
) as v(nome, data, ordine)
where not exists (
  select 1 from public.drop_fasi
  where drop_id = 'a0000002-0000-0000-0000-000000000001' and nome = v.nome
);

insert into public.articoli (id, nome, categoria, colori, drop_id) values
  ('a0000003-0000-0000-0000-000000000001', 'Leggings Core V2', 'Leggings', 'Void Black · Ember', 'a0000002-0000-0000-0000-000000000001'),
  ('a0000003-0000-0000-0000-000000000002', 'Oversized Hoodie Æ', 'Felpe', 'Void Black', 'a0000002-0000-0000-0000-000000000001')
on conflict (id) do nothing;

insert into public.articolo_tasks (articolo_id, testo, done, ordine)
select 'a0000003-0000-0000-0000-000000000001', v.testo, false, v.ordine
from (values ('Tech pack definitivo', 0), ('Sample approvato', 1), ('Shooting', 2), ('Caricato su Shopify', 3)) as v(testo, ordine)
where not exists (
  select 1 from public.articolo_tasks
  where articolo_id = 'a0000003-0000-0000-0000-000000000001' and testo = v.testo
);

insert into public.articolo_tasks (articolo_id, testo, done, ordine)
select 'a0000003-0000-0000-0000-000000000002', v.testo, false, v.ordine
from (values ('Sketch finale', 0), ('Tech pack', 1)) as v(testo, ordine)
where not exists (
  select 1 from public.articolo_tasks
  where articolo_id = 'a0000003-0000-0000-0000-000000000002' and testo = v.testo
);

commit;
