-- Existing installations: apply once using the D1 dashboard console.
-- New installations: schema.sql already includes this table.
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
