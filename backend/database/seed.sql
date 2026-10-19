-- Sample data for development
-- Usage: npm run db:seed (only runs on an empty database)
-- Reports are created for Friday 2026-10-16.

BEGIN;

INSERT INTO nursery (id, name, address, capacity) VALUES
  ('a0000000-0000-4000-8000-000000000001', 'Crèche Les Petits Pas', '12 rue des Lilas, 75000 Paris', 40);

INSERT INTO child (id, nursery_id, first_name, last_name, birth_date) VALUES
  ('c0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001', 'Léa',    'Martin',  '2024-03-12'),
  ('c0000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000001', 'Hugo',   'Bernard', '2025-01-08'),
  ('c0000000-0000-4000-8000-000000000003', 'a0000000-0000-4000-8000-000000000001', 'Chloé',  'Dubois',  '2024-07-22'),
  ('c0000000-0000-4000-8000-000000000004', 'a0000000-0000-4000-8000-000000000001', 'Nathan', 'Petit',   '2023-11-30'),
  ('c0000000-0000-4000-8000-000000000005', 'a0000000-0000-4000-8000-000000000001', 'Inès',   'Leroy',   '2024-05-17');

INSERT INTO parent (id, first_name, last_name, email, phone) VALUES
  ('b0000000-0000-4000-8000-000000000001', 'Claire',  'Martin',  'claire.martin@example.com',  '0601020304'),
  ('b0000000-0000-4000-8000-000000000002', 'Thomas',  'Martin',  'thomas.martin@example.com',  '0601020305'),
  ('b0000000-0000-4000-8000-000000000003', 'Sophie',  'Bernard', 'sophie.bernard@example.com', '0611223344'),
  ('b0000000-0000-4000-8000-000000000004', 'Julien',  'Dubois',  'julien.dubois@example.com',  NULL),
  ('b0000000-0000-4000-8000-000000000005', 'Amélie',  'Petit',   'amelie.petit@example.com',   '0699887766'),
  ('b0000000-0000-4000-8000-000000000006', 'Karim',   'Leroy',   'karim.leroy@example.com',    '0655443322');

INSERT INTO child_parent (child_id, parent_id, relationship) VALUES
  ('c0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000001', 'mother'),
  ('c0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000002', 'father'),
  ('c0000000-0000-4000-8000-000000000002', 'b0000000-0000-4000-8000-000000000003', 'mother'),
  ('c0000000-0000-4000-8000-000000000003', 'b0000000-0000-4000-8000-000000000004', 'father'),
  ('c0000000-0000-4000-8000-000000000004', 'b0000000-0000-4000-8000-000000000005', 'mother'),
  ('c0000000-0000-4000-8000-000000000005', 'b0000000-0000-4000-8000-000000000006', 'father');

-- Daily reports for 2026-10-16
INSERT INTO daily_report
  (id, child_id, report_date, absent, absence_comment, arrival_time, departure_time,
   meal_comment, no_nap, nap_comment, stool_status, stool_comment, parent_note)
VALUES
  -- Léa: complete
  ('d0000000-0000-4000-8000-000000000001', 'c0000000-0000-4000-8000-000000000001', '2026-10-16',
   FALSE, NULL, '08:15', '17:30', 'A tout mangé avec appétit.', FALSE, 'Endormie rapidement.',
   'normal', NULL, 'Très bonne journée, beaucoup joué à la pâte à modeler.'),
  -- Hugo: in progress
  ('d0000000-0000-4000-8000-000000000002', 'c0000000-0000-4000-8000-000000000002', '2026-10-16',
   FALSE, NULL, '08:40', NULL, NULL, FALSE, NULL, 'normal', NULL, NULL),
  -- Chloé: to fill
  ('d0000000-0000-4000-8000-000000000003', 'c0000000-0000-4000-8000-000000000003', '2026-10-16',
   FALSE, NULL, NULL, NULL, NULL, FALSE, NULL, 'normal', NULL, NULL),
  -- Nathan: absent
  ('d0000000-0000-4000-8000-000000000004', 'c0000000-0000-4000-8000-000000000004', '2026-10-16',
   TRUE, 'Malade (otite), prévenu par sa maman.', NULL, NULL, NULL, FALSE, NULL, 'normal', NULL, NULL),
  -- Inès: in progress, abnormal stools
  ('d0000000-0000-4000-8000-000000000005', 'c0000000-0000-4000-8000-000000000005', '2026-10-16',
   FALSE, NULL, '07:55', NULL, NULL, FALSE, NULL,
   'other', 'Selles liquides en fin de matinée, à surveiller.', NULL);

INSERT INTO report_meal (report_id, position, label, quantity_grams) VALUES
  ('d0000000-0000-4000-8000-000000000001', 0, 'Purée de carottes',        150),
  ('d0000000-0000-4000-8000-000000000001', 1, 'Compote de pommes',        100),
  ('d0000000-0000-4000-8000-000000000005', 0, 'Haricots verts et poulet', 120);

INSERT INTO report_bottle (report_id, time, quantity_ml) VALUES
  ('d0000000-0000-4000-8000-000000000001', '15:30', 180),
  ('d0000000-0000-4000-8000-000000000002', '09:30', 210);

INSERT INTO report_nap (report_id, start_time, end_time) VALUES
  ('d0000000-0000-4000-8000-000000000001', '12:30', '14:45'),
  ('d0000000-0000-4000-8000-000000000002', '10:00', '10:45');

COMMIT;
