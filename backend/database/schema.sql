-- Nursery database schema (PostgreSQL 13+)
-- Usage: psql -U nursery -d nursery -f database/schema.sql

CREATE EXTENSION IF NOT EXISTS pgcrypto; -- gen_random_uuid() on PostgreSQL < 13

-- ---------------------------------------------------------------------------
-- Nurseries, children and parents
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS nursery (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        VARCHAR(150) NOT NULL,
  address     VARCHAR(255) NOT NULL,
  capacity    INTEGER      NOT NULL CHECK (capacity > 0),
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS child (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nursery_id  UUID         NOT NULL REFERENCES nursery (id) ON DELETE CASCADE,
  first_name  VARCHAR(100) NOT NULL,
  last_name   VARCHAR(100) NOT NULL,
  birth_date  DATE         NOT NULL,
  active      BOOLEAN      NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_child_nursery ON child (nursery_id);

CREATE TABLE IF NOT EXISTS parent (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name  VARCHAR(100) NOT NULL,
  last_name   VARCHAR(100) NOT NULL,
  email       VARCHAR(255) NOT NULL UNIQUE,
  phone       VARCHAR(30),
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT now()
);

-- A child can have several parents/guardians and a parent several children.
CREATE TABLE IF NOT EXISTS child_parent (
  child_id      UUID        NOT NULL REFERENCES child (id) ON DELETE CASCADE,
  parent_id     UUID        NOT NULL REFERENCES parent (id) ON DELETE CASCADE,
  relationship  VARCHAR(30) NOT NULL DEFAULT 'parent', -- mother, father, guardian...
  PRIMARY KEY (child_id, parent_id)
);

-- ---------------------------------------------------------------------------
-- Daily reports (one per child per weekday)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS daily_report (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id         UUID         NOT NULL REFERENCES child (id) ON DELETE CASCADE,
  report_date      DATE         NOT NULL,
  absent           BOOLEAN      NOT NULL DEFAULT FALSE,
  absence_comment  VARCHAR(500),
  arrival_time     TIME,
  departure_time   TIME,
  meal_comment     VARCHAR(500),
  no_nap           BOOLEAN      NOT NULL DEFAULT FALSE,
  nap_comment      VARCHAR(500),
  stool_status     VARCHAR(10)  NOT NULL DEFAULT 'normal'
                   CHECK (stool_status IN ('normal', 'other')),
  stool_comment    VARCHAR(500),
  parent_note      VARCHAR(1000),
  created_at       TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ  NOT NULL DEFAULT now(),
  CONSTRAINT uq_daily_report_child_date UNIQUE (child_id, report_date),
  CONSTRAINT ck_daily_report_weekday CHECK (EXTRACT(ISODOW FROM report_date) < 6),
  CONSTRAINT ck_daily_report_stool_comment
    CHECK (stool_status = 'normal' OR stool_comment IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS idx_daily_report_date ON daily_report (report_date);

-- Solid meals, with quantity in grams
CREATE TABLE IF NOT EXISTS report_meal (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id       UUID         NOT NULL REFERENCES daily_report (id) ON DELETE CASCADE,
  position        SMALLINT     NOT NULL DEFAULT 0,
  label           VARCHAR(100) NOT NULL,
  quantity_grams  INTEGER      CHECK (quantity_grams >= 0)
);

CREATE INDEX IF NOT EXISTS idx_report_meal_report ON report_meal (report_id);

-- Bottles, each with its own time and quantity in ml
CREATE TABLE IF NOT EXISTS report_bottle (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id    UUID    NOT NULL REFERENCES daily_report (id) ON DELETE CASCADE,
  time         TIME    NOT NULL,
  quantity_ml  INTEGER CHECK (quantity_ml >= 0)
);

CREATE INDEX IF NOT EXISTS idx_report_bottle_report ON report_bottle (report_id);

CREATE TABLE IF NOT EXISTS report_nap (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id   UUID NOT NULL REFERENCES daily_report (id) ON DELETE CASCADE,
  start_time  TIME NOT NULL,
  end_time    TIME,
  CHECK (end_time IS NULL OR end_time > start_time)
);

CREATE INDEX IF NOT EXISTS idx_report_nap_report ON report_nap (report_id);
