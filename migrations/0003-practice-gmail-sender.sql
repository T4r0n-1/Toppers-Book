-- Also created idempotently by the mailer API for existing installations.
CREATE TABLE IF NOT EXISTS practice_mail_subscribers (
  uid TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  verified_at INTEGER NOT NULL,
  unsubscribe_token TEXT NOT NULL UNIQUE
);
CREATE TABLE IF NOT EXISTS practice_mail_deliveries (
  id TEXT PRIMARY KEY,
  paper_id TEXT NOT NULL,
  uid TEXT NOT NULL,
  email TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('queued','reserved','sent','failed')),
  updated_at INTEGER NOT NULL,
  UNIQUE(paper_id,email)
);
