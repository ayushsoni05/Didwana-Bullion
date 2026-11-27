import pg from 'pg';

const { Pool } = pg;

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL environment variable is required for PostgreSQL.');
}

const isLocal =
  connectionString.includes('localhost') || connectionString.includes('127.0.0.1');

export const pool = new Pool({
  connectionString,
  ssl: isLocal ? false : { rejectUnauthorized: false },
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 15000,
});

pool.on('error', (err) => {
  console.error('Unexpected PostgreSQL pool error:', err.message);
});

export async function initDb() {
  const sql = `
    CREATE EXTENSION IF NOT EXISTS pgcrypto;

    CREATE TABLE IF NOT EXISTS users (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name VARCHAR(120) NOT NULL,
      email VARCHAR(255) UNIQUE NOT NULL,
      phone VARCHAR(20) UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      accepted_legal_version VARCHAR(20) NOT NULL DEFAULT '1.0.0',
      accepted_legal_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      cookie_functional BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_users_email ON users (LOWER(email));
    CREATE INDEX IF NOT EXISTS idx_users_phone ON users (phone);

    CREATE TABLE IF NOT EXISTS user_sessions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      refresh_token_hash TEXT NOT NULL,
      device_name VARCHAR(160) DEFAULT 'Didwana Bullion Android',
      ip_address VARCHAR(64),
      last_active_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      expires_at TIMESTAMPTZ NOT NULL,
      revoked_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_sessions_user ON user_sessions (user_id);

    CREATE TABLE IF NOT EXISTS price_alerts (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      terminal VARCHAR(20) NOT NULL,
      metal_key VARCHAR(30) NOT NULL,
      condition VARCHAR(10) NOT NULL CHECK (condition IN ('ABOVE', 'BELOW')),
      target_ask NUMERIC(12, 2) NOT NULL,
      is_active BOOLEAN NOT NULL DEFAULT TRUE,
      triggered_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_alerts_user ON price_alerts (user_id, is_active);

    CREATE TABLE IF NOT EXISTS webhooks (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      target_url TEXT NOT NULL,
      secret_hmac TEXT NOT NULL,
      event_filter VARCHAR(60) NOT NULL DEFAULT 'PRICE_ALERT',
      is_active BOOLEAN NOT NULL DEFAULT TRUE,
      last_status INTEGER,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS audit_logs (
      id BIGSERIAL PRIMARY KEY,
      user_id UUID REFERENCES users(id) ON DELETE SET NULL,
      event_type VARCHAR(50) NOT NULL,
      ip_address VARCHAR(64),
      details TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_audit_user ON audit_logs (user_id, created_at DESC);
  `;
  await pool.query(sql);
}

export async function logAudit(userId, eventType, ipAddress = null, details = null) {
  try {
    await pool.query(
      'INSERT INTO audit_logs (user_id, event_type, ip_address, details) VALUES ($1, $2, $3, $4)',
      [userId || null, eventType, ipAddress, details]
    );
  } catch (err) {
    console.error('Audit log error:', err.message);
  }
}
