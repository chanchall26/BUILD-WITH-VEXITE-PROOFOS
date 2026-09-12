-- PROOFOS persistence schema (PostgreSQL 15+)
--
-- One principle shapes every table here: EVIDENCE IS STORED, SCORES ARE
-- DERIVED. There is no `score` column anywhere in this file. An observation is
-- the atomic row, and every number the product shows is a pure function over
-- observations, computed at read time by lib/evidence.ts. That is what makes a
-- disputed result answerable: recompute it and you get the same number, or you
-- find the bug.
--
-- The deployed demo does not need this. It runs stateless — the calibration
-- answer key travels sealed with AES-256-GCM, the result travels as a signed
-- credential the candidate holds, and the browser keeps its own pool. That is a
-- deliberate deployment choice, not an absence of design: zero configuration
-- means a judge can open the URL and it works.
--
-- This schema is what a real deployment persists, and the shape lib/domain.ts
-- already models. See docs/ARCHITECTURE.md for the mapping.

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ---------------------------------------------------------------- people

CREATE TABLE profiles (
  id            TEXT PRIMARY KEY,
  handle        TEXT UNIQUE,
  display_name  TEXT NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE profiles IS
  'A holder. Deliberately thin: PROOFOS stores no demographic data, because none of it is assessed.';

-- ---------------------------------------------------------------- challenges

CREATE TABLE challenges (
  id             TEXT PRIMARY KEY,
  domain         TEXT NOT NULL,
  title          TEXT NOT NULL,
  -- The full ChallengeSpec: situation, tools, beats, requirements, notice.
  spec           JSONB NOT NULL,
  -- 'gemini' or 'fixture'. Recorded so a result can say how it was produced.
  generated_by   TEXT NOT NULL,
  model          TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX challenges_domain_idx ON challenges (domain, created_at DESC, id DESC);

-- The calibration answer key, kept apart from the challenge so it can be
-- granted separately and never leaves the server.
CREATE TABLE calibration_keys (
  challenge_id  TEXT PRIMARY KEY REFERENCES challenges (id) ON DELETE CASCADE,
  items         JSONB NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------- sessions

CREATE TABLE sessions (
  id             TEXT PRIMARY KEY,
  profile_id     TEXT NOT NULL REFERENCES profiles (id) ON DELETE CASCADE,
  challenge_id   TEXT NOT NULL REFERENCES challenges (id) ON DELETE RESTRICT,
  state          TEXT NOT NULL DEFAULT 'in_progress'
                   CHECK (state IN ('in_progress', 'submitted', 'evaluated', 'abandoned')),
  -- The artifact, the transcript, the defence transcripts, the telemetry counts.
  -- Audio is never stored; it is transcribed and discarded at the edge.
  work           TEXT,
  transcript     JSONB NOT NULL DEFAULT '[]'::jsonb,
  defence        JSONB NOT NULL DEFAULT '[]'::jsonb,
  telemetry      JSONB NOT NULL DEFAULT '{}'::jsonb,
  started_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at   TIMESTAMPTZ
);

CREATE INDEX sessions_profile_idx ON sessions (profile_id, started_at DESC, id DESC);

-- ---------------------------------------------------------------- evidence

CREATE TABLE observations (
  id           TEXT PRIMARY KEY,
  session_id   TEXT NOT NULL REFERENCES sessions (id) ON DELETE CASCADE,
  observed_at  TIMESTAMPTZ NOT NULL,
  kind         TEXT NOT NULL,
  dimension    TEXT NOT NULL,
  facet        TEXT,
  polarity     SMALLINT NOT NULL CHECK (polarity IN (-1, 1)),
  weight       NUMERIC(4, 3) NOT NULL CHECK (weight >= 0 AND weight <= 1),
  detail       TEXT NOT NULL,
  -- Verbatim from the session. No quote, no observation.
  quote        TEXT NOT NULL CHECK (length(quote) > 0),
  source       TEXT NOT NULL CHECK (source IN ('counterpart', 'artifact', 'calibration', 'defence')),
  -- Which half of the pipeline found it. Employers may weight these differently.
  detector     TEXT NOT NULL CHECK (detector IN ('deterministic', 'model')),
  ref          TEXT,
  hash         TEXT NOT NULL
);

CREATE INDEX observations_session_idx ON observations (session_id, observed_at, id);
CREATE INDEX observations_dimension_idx ON observations (session_id, dimension);
CREATE UNIQUE INDEX observations_dedupe_idx ON observations (session_id, kind, ref)
  WHERE ref IS NOT NULL;

COMMENT ON TABLE observations IS
  'The atomic unit of the whole system. Scores are never stored; they are derived from these rows.';

-- One row per evaluation run. Keeps the model, rubric version and seed that
-- produced a given reading, so a re-run can be compared like for like.
CREATE TABLE evaluations (
  id             TEXT PRIMARY KEY,
  session_id     TEXT NOT NULL REFERENCES sessions (id) ON DELETE CASCADE,
  model          TEXT NOT NULL,
  seed           BIGINT NOT NULL,
  rubric_version TEXT NOT NULL,
  -- Prose only: narrative, strengths, gaps, coaching, integrity flags.
  -- No numbers live here.
  record         JSONB NOT NULL,
  calibration    JSONB,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX evaluations_session_idx ON evaluations (session_id, created_at DESC, id DESC);

-- ---------------------------------------------------------------- credentials

CREATE TABLE credentials (
  id             TEXT PRIMARY KEY,
  profile_id     TEXT NOT NULL REFERENCES profiles (id) ON DELETE CASCADE,
  -- The claim set as issued, so a verifier's view can be reconstructed.
  passport       JSONB NOT NULL,
  -- The signed credential. Disclosures are NOT stored: they belong to the holder.
  jws            TEXT NOT NULL,
  evidence_root  TEXT NOT NULL,
  -- Position in the bitstring status list. Unique so a revocation cannot
  -- accidentally withdraw somebody else's credential.
  status_index   INTEGER NOT NULL UNIQUE CHECK (status_index >= 0 AND status_index < 131072),
  issued_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  revoked_at     TIMESTAMPTZ,
  revoked_reason TEXT
);

CREATE INDEX credentials_profile_idx ON credentials (profile_id, issued_at DESC, id DESC);
CREATE INDEX credentials_revoked_idx ON credentials (status_index) WHERE revoked_at IS NOT NULL;

-- Which sessions a credential draws on. A passport accumulates across sessions,
-- which is what makes it reusable rather than per-application.
CREATE TABLE credential_sessions (
  credential_id  TEXT NOT NULL REFERENCES credentials (id) ON DELETE CASCADE,
  session_id     TEXT NOT NULL REFERENCES sessions (id) ON DELETE RESTRICT,
  PRIMARY KEY (credential_id, session_id)
);

-- Every check anybody made. The holder can see who verified their credential
-- and which claims they were shown.
CREATE TABLE verification_events (
  id              TEXT PRIMARY KEY,
  credential_id   TEXT REFERENCES credentials (id) ON DELETE SET NULL,
  verifier        TEXT,
  purpose         TEXT,
  -- The dimensions actually disclosed in the presentation that was checked.
  disclosed       TEXT[] NOT NULL DEFAULT '{}',
  outcome         TEXT NOT NULL CHECK (outcome IN ('valid', 'revoked', 'invalid')),
  checked_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX verification_events_credential_idx
  ON verification_events (credential_id, checked_at DESC, id DESC);

-- ---------------------------------------------------------------- roles

CREATE TABLE job_roles (
  id            TEXT PRIMARY KEY,
  title         TEXT NOT NULL,
  seniority     TEXT,
  summary       TEXT,
  -- Weighted capability requirements, as extracted from the posting.
  requirements  JSONB NOT NULL,
  -- Digest of the source posting, so the same posting is not re-analysed.
  source_hash   TEXT NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX job_roles_source_idx ON job_roles (source_hash);

-- Cached coverage. Derived, so it is safe to delete and recompute at any time,
-- and it carries the timestamp it was computed at because freshness decays.
CREATE TABLE role_matches (
  job_role_id   TEXT NOT NULL REFERENCES job_roles (id) ON DELETE CASCADE,
  credential_id TEXT NOT NULL REFERENCES credentials (id) ON DELETE CASCADE,
  coverage      SMALLINT NOT NULL CHECK (coverage BETWEEN 0 AND 100),
  rows_json     JSONB NOT NULL,
  gaps          TEXT[] NOT NULL DEFAULT '{}',
  computed_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (job_role_id, credential_id)
);

COMMIT;

-- ---------------------------------------------------------------- notes
--
-- Deliberately absent:
--
--   * Any score column. Storing a derived value is how a system loses the
--     ability to answer "why". Coverage in role_matches is a cache with a
--     computed_at stamp, and can be dropped without loss.
--   * Audio, video, images of a candidate, biometric templates, IP addresses,
--     device fingerprints, demographic fields. None of it is assessed, so none
--     of it is collected.
--   * A hire/reject column. The system does not produce that decision, and a
--     column for it would invite one.
--
-- Retention: sessions and observations are the candidate's data. A deployment
-- should offer erasure on request, which cascades from profiles. Credentials
-- survive erasure only as a status_index, so revocation keeps working for a
-- credential already in an employer's hands.
