-- DÆMON Production HQ — Step 4: dati seed del prototipo.
-- Esegui in Supabase Dashboard → SQL Editor, dopo 0001 e 0002 → Run.
-- Idempotente: usa id fissi e "on conflict do nothing", quindi rieseguirlo
-- non duplica righe né sovrascrive modifiche fatte a mano dopo il seed.

begin;

-- ============================================================
-- FORNITORI
-- ============================================================
insert into public.fornitori (id, nome, luogo, ruolo, materiali, stato, note) values
  ('a0000001-0000-0000-0000-000000000001', 'Giessegi', 'Vallà (Treviso)', 'core', null, 'vetting',
   'Priorità alta per la core line (volumi 1.000+/mese). Da chiedere: capacità mensile per categoria, lead time a regime, ramp-up, politica tessuti (stock o da ordinare + minimi filato), QC su lotti ripetuti.'),
  ('a0000001-0000-0000-0000-000000000002', 'Crea-Si', 'Carpi (Modena)', 'core', null, 'vetting',
   'Seconda priorità core line. Stesse domande di vetting di Giessegi.'),
  ('a0000001-0000-0000-0000-000000000003', 'REAM Confezioni', 'Carpi (Modena)', 'capsule', null, 'da-contattare',
   'Adatto a campionatura e capsule/drop limitati.'),
  ('a0000001-0000-0000-0000-000000000004', 'Profumi Sport', 'Prato', 'capsule', null, 'da-contattare',
   'Vicino a Lucca: utile per prototipi rapidi.'),
  ('a0000001-0000-0000-0000-000000000005', 'Sportswear of Tomorrow', 'Portogallo (Porto)', 'backup',
   'Jersey tecnici, sublimazione, sostenibilità', 'da-contattare',
   'Strada B. A 1.000+/mese competitivo: qualità EU costante.'),
  ('a0000001-0000-0000-0000-000000000006', 'Athleisure Basics', 'Portogallo', 'backup',
   'Rete di fabbriche, tessuti premium', 'da-contattare',
   'Modello agenzia: sviluppo + sourcing + produzione.')
on conflict (id) do nothing;

-- ============================================================
-- DROPS + FASI (pipeline 30 giorni standard, 7 fasi)
-- ============================================================
insert into public.drops (id, nome, data_lancio, owner, note) values
  ('a0000002-0000-0000-0000-000000000001', 'Drop V — Autunno', '2026-10-15', 'logistica',
   'Lezione dal drop preordine: buffer produzione +15gg, date comunicate solo a merce in mano. Payout: 30% avvio, 70% dopo prima settimana vendite.')
on conflict (id) do nothing;

insert into public.drop_fasi (drop_id, nome, data, done, ordine)
select 'a0000002-0000-0000-0000-000000000001', v.nome, null, false, v.ordine
from (values
  ('Supplier & Sample — sample ricevuti e approvati, prezzi e condizioni chiusi', 0),
  ('Production Ready — primo payout 30% + avvio produzione, tempi confermati', 1),
  ('Content Production — shooting con sample, video verticali, asset finali', 2),
  ('Store Setup — prodotti caricati, checkout testato, shipping/policy pronti', 3),
  ('Pre-Launch — teaser, waitlist, countdown, annuncio data drop', 4),
  ('LAUNCH — drop live, ads on, email blast, customer care attivo', 5),
  ('Post-Launch — analisi best seller, saldo fornitore 70%, bulk/riordino', 6)
) as v(nome, ordine)
where not exists (
  select 1 from public.drop_fasi
  where drop_id = 'a0000002-0000-0000-0000-000000000001' and nome = v.nome
);

-- ============================================================
-- ARTICOLI + TASK
-- ============================================================
insert into public.articoli (id, nome, categoria, colori, drop_id) values
  ('a0000003-0000-0000-0000-000000000001', 'Leggings Core V2', 'Leggings', 'Void Black · Ember', 'a0000002-0000-0000-0000-000000000001'),
  ('a0000003-0000-0000-0000-000000000002', 'Oversized Hoodie Æ', 'Felpe', 'Void Black', 'a0000002-0000-0000-0000-000000000001')
on conflict (id) do nothing;

insert into public.articolo_tasks (articolo_id, testo, done, ordine)
select 'a0000003-0000-0000-0000-000000000001', v.testo, false, v.ordine
from (values
  ('Tech pack definitivo', 0),
  ('Sample approvato', 1),
  ('Shooting', 2),
  ('Caricato su Shopify', 3)
) as v(testo, ordine)
where not exists (
  select 1 from public.articolo_tasks
  where articolo_id = 'a0000003-0000-0000-0000-000000000001' and testo = v.testo
);

insert into public.articolo_tasks (articolo_id, testo, done, ordine)
select 'a0000003-0000-0000-0000-000000000002', v.testo, false, v.ordine
from (values
  ('Sketch finale', 0),
  ('Tech pack', 1)
) as v(testo, ordine)
where not exists (
  select 1 from public.articolo_tasks
  where articolo_id = 'a0000003-0000-0000-0000-000000000002' and testo = v.testo
);

-- ============================================================
-- DESIGN (kanban)
-- ============================================================
insert into public.designs (id, nome, categoria, fase, owner, note, ordine) values
  ('a0000004-0000-0000-0000-000000000001', 'Leggings Core V2', 'Leggings', 'techpack', 'design',
   'Evoluzione del best seller del drop preordine.', 0),
  ('a0000004-0000-0000-0000-000000000002', 'Oversized Hoodie Æ', 'Felpe', 'sketch', 'design',
   'Ricamo Æ tono su tono, fit oversize.', 1)
on conflict (id) do nothing;

-- ============================================================
-- TECH PACK
-- ============================================================
insert into public.techpacks (id, nome, categoria, colorway, materiali, taglie, fornitore_id, stato, owner, note) values
  ('a0000005-0000-0000-0000-000000000001', 'Leggings Core V2', 'Leggings', 'Void Black / Ember',
   '78% poliammide, 22% elastan — squat-proof, compressione media', 'XS–XL',
   'a0000001-0000-0000-0000-000000000001', 'bozza', 'design',
   'Da definire: grammatura tessuto e altezza vita rispetto alla V1.')
on conflict (id) do nothing;

-- ============================================================
-- CAMPIONI
-- ============================================================
insert into public.samples (id, nome, fornitore_id, data_arrivo, fit, tessuto, cuciture, colore, verdetto, owner, note) values
  ('a0000006-0000-0000-0000-000000000001', 'Leggings Core V1 (rif. drop preordine)', null, null,
   4, 4, 3, 5, 'revisione', 'design',
   'Esempio di scheda review. Cuciture laterali da rinforzare.')
on conflict (id) do nothing;

-- ============================================================
-- ARCHIVIO: gadget + link
-- ============================================================
insert into public.gadgets (id, nome, ordine) values
  ('a0000007-0000-0000-0000-000000000001', 'Logbook palestra', 0)
on conflict (id) do nothing;

insert into public.notes (entity_type, entity_id, author_id, author_name, testo)
select 'gadgets', 'a0000007-0000-0000-0000-000000000001',
  (select id from public.profiles where nome ilike 'Andrea' limit 1),
  'Andrea',
  'Bonus del drop preordine — molto apprezzato, candidato a diventare gadget fisso.'
where not exists (
  select 1 from public.notes
  where entity_type = 'gadgets' and entity_id = 'a0000007-0000-0000-0000-000000000001'
);

insert into public.links (id, label, url, ordine) values
  ('a0000008-0000-0000-0000-000000000001', 'Google Drive — DÆMON', null, 0),
  ('a0000008-0000-0000-0000-000000000002', 'Instagram', null, 1),
  ('a0000008-0000-0000-0000-000000000003', 'TikTok', null, 2),
  ('a0000008-0000-0000-0000-000000000004', 'Documenti / Docs', null, 3),
  ('a0000008-0000-0000-0000-000000000005', 'Shopify Admin', null, 4),
  ('a0000008-0000-0000-0000-000000000006', 'eLogy', null, 5)
on conflict (id) do nothing;

-- ============================================================
-- AI + CANALI CHAT
-- ============================================================
insert into public.ai_links (id, label, url) values
  ('a0000009-0000-0000-0000-000000000001', 'Claude', 'https://claude.ai'),
  ('a0000009-0000-0000-0000-000000000002', 'ChatGPT', 'https://chat.openai.com'),
  ('a0000009-0000-0000-0000-000000000003', 'Midjourney', null),
  ('a0000009-0000-0000-0000-000000000004', 'n8n (automazioni)', null)
on conflict (id) do nothing;

insert into public.chat_channels (id, label, url) values
  ('a000000a-0000-0000-0000-000000000001', 'ManyChat', null),
  ('a000000a-0000-0000-0000-000000000002', 'WhatsApp Business', 'https://web.whatsapp.com'),
  ('a000000a-0000-0000-0000-000000000003', 'Instagram Direct', 'https://www.instagram.com/direct/inbox/')
on conflict (id) do nothing;

commit;
