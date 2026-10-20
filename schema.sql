PRAGMA foreign_keys = ON;
CREATE TABLE IF NOT EXISTS customer_profiles (
  uid TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  phone_verified INTEGER NOT NULL DEFAULT 0 CHECK (phone_verified IN (0,1)),
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  consent_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS books (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  is_ready INTEGER NOT NULL DEFAULT 0 CHECK (is_ready IN (0,1)),
  page_count INTEGER NOT NULL DEFAULT 0,
  chapters_json TEXT NOT NULL DEFAULT '[]'
);
CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY,
  uid TEXT NOT NULL,
  book_id TEXT NOT NULL REFERENCES books(id),
  amount INTEGER NOT NULL CHECK (amount IN (14900,19900)),
  coupon TEXT,
  reader_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('created','paid','refunded')),
  created_at INTEGER NOT NULL,
  consent_at INTEGER NOT NULL,
  paid_at INTEGER,
  payment_id TEXT UNIQUE
);
CREATE TABLE IF NOT EXISTS entitlements (
  uid TEXT NOT NULL,
  book_id TEXT NOT NULL REFERENCES books(id),
  order_id TEXT PRIMARY KEY REFERENCES orders(id),
  reader_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  starts_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  revoked INTEGER NOT NULL DEFAULT 0 CHECK (revoked IN (0,1))
);
CREATE INDEX IF NOT EXISTS entitlements_owner ON entitlements(uid,book_id,revoked,expires_at);
CREATE INDEX IF NOT EXISTS orders_owner ON orders(uid,book_id,status,created_at);
INSERT OR IGNORE INTO books (id,title) VALUES ('cbse10-maths-standard','CBSE Class 10 Mathematics Standard (041)');

CREATE TABLE IF NOT EXISTS practice_email_preferences (
  uid TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  enabled INTEGER NOT NULL DEFAULT 0 CHECK (enabled IN (0,1)),
  updated_at INTEGER NOT NULL
);

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
