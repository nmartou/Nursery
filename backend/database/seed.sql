-- Sample data for development
-- Usage: npm run db:seed (only runs on a database without children)
-- Reports are created for Friday 2026-10-16.

BEGIN;

INSERT INTO nursery (id, name, address, capacity) VALUES
  ('a0000000-0000-4000-8000-000000000001', 'Crèche Les Petits Pas', '12 rue des Lilas, 75000 Paris', 40)
ON CONFLICT (id) DO NOTHING;

-- Five children enrolled since September, one starting in November and one
-- who left in July (enrollment_end NULL = end date not known yet).
INSERT INTO child (id, nursery_id, first_name, last_name, birth_date, enrollment_start, enrollment_end) VALUES
  ('c0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001', 'Léa',    'Martin',  '2024-03-12', '2026-09-01', '2027-07-30'),
  ('c0000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000001', 'Hugo',   'Bernard', '2025-01-08', '2026-09-01', NULL),
  ('c0000000-0000-4000-8000-000000000003', 'a0000000-0000-4000-8000-000000000001', 'Chloé',  'Dubois',  '2024-07-22', '2026-09-01', NULL),
  ('c0000000-0000-4000-8000-000000000004', 'a0000000-0000-4000-8000-000000000001', 'Nathan', 'Petit',   '2023-11-30', '2026-09-01', '2027-07-30'),
  ('c0000000-0000-4000-8000-000000000005', 'a0000000-0000-4000-8000-000000000001', 'Inès',   'Leroy',   '2024-05-17', '2026-09-01', NULL),
  ('c0000000-0000-4000-8000-000000000006', 'a0000000-0000-4000-8000-000000000001', 'Emma',   'Moreau',  '2026-04-02', '2026-11-02', NULL),
  ('c0000000-0000-4000-8000-000000000007', 'a0000000-0000-4000-8000-000000000001', 'Lucas',  'Garnier', '2022-12-15', '2024-09-02', '2026-07-31');

INSERT INTO parent (id, first_name, last_name, email, phone) VALUES
  ('b0000000-0000-4000-8000-000000000001', 'Claire',  'Martin',  'claire.martin@example.com',  '06 01 02 03 04'),
  ('b0000000-0000-4000-8000-000000000002', 'Thomas',  'Martin',  'thomas.martin@example.com',  '06 01 02 03 05'),
  ('b0000000-0000-4000-8000-000000000003', 'Sophie',  'Bernard', 'sophie.bernard@example.com', '06 11 22 33 44'),
  ('b0000000-0000-4000-8000-000000000004', 'Julien',  'Dubois',  'julien.dubois@example.com',  '06 77 88 99 00'),
  ('b0000000-0000-4000-8000-000000000005', 'Amélie',  'Petit',   'amelie.petit@example.com',   '06 99 88 77 66'),
  ('b0000000-0000-4000-8000-000000000006', 'Karim',   'Leroy',   'karim.leroy@example.com',    '06 55 44 33 22'),
  ('b0000000-0000-4000-8000-000000000007', 'Laura',   'Moreau',  'laura.moreau@example.com',   '07 12 34 56 78'),
  ('b0000000-0000-4000-8000-000000000008', 'Marc',    'Garnier', 'marc.garnier@example.com',   '06 21 43 65 87');

INSERT INTO child_parent (child_id, parent_id, relationship, position) VALUES
  ('c0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000001', 'mother', 0),
  ('c0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000002', 'father', 1),
  ('c0000000-0000-4000-8000-000000000002', 'b0000000-0000-4000-8000-000000000003', 'mother', 0),
  ('c0000000-0000-4000-8000-000000000003', 'b0000000-0000-4000-8000-000000000004', 'father', 0),
  ('c0000000-0000-4000-8000-000000000004', 'b0000000-0000-4000-8000-000000000005', 'mother', 0),
  ('c0000000-0000-4000-8000-000000000005', 'b0000000-0000-4000-8000-000000000006', 'father', 0),
  ('c0000000-0000-4000-8000-000000000006', 'b0000000-0000-4000-8000-000000000007', 'mother', 0),
  ('c0000000-0000-4000-8000-000000000007', 'b0000000-0000-4000-8000-000000000008', 'father', 0);

-- Other people to call
INSERT INTO child_contact (child_id, position, first_name, last_name, relationship, phone) VALUES
  ('c0000000-0000-4000-8000-000000000001', 0, 'Jeanne',  'Martin',  'Grand-mère', '06 10 20 30 40'),
  ('c0000000-0000-4000-8000-000000000001', 1, 'Michel',  'Martin',  'Grand-père', '06 10 20 30 41'),
  ('c0000000-0000-4000-8000-000000000002', 0, 'Nadia',   'Haddad',  'Voisine',    '07 88 77 66 55');

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
