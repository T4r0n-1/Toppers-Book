-- Also created idempotently by the profile API for existing installations.
CREATE TABLE IF NOT EXISTS practice_email_preferences (
  uid TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  enabled INTEGER NOT NULL DEFAULT 0 CHECK (enabled IN (0,1)),
  updated_at INTEGER NOT NULL
);
