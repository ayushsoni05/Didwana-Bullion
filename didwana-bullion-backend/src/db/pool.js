import pg from 'pg';

const { Pool } = pg;

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL environment variable is required for PostgreSQL.');
}

const isLocal =
  connectionString.includes('localhost') || connectionString.includes('127.0.0.1');

export const ADMIN_EMAIL = String(
  process.env.ADMIN_EMAIL || 'newmonikajewellers1999@gmail.com'
)
  .trim()
  .toLowerCase();

export const ADMIN_PHONE = String(process.env.ADMIN_PHONE || '+919351214851').trim();

export const DEFAULT_SITE_CONFIG = {
  flashBannerText: '',
  flashBannerSeverity: 'GOLD',
  flashBannerEnabled: false,
  ratesFrozen: false,
  hbGoldOffset: 0,
  hbSilverOffset: 0,
  mosunGoldOffset: 0,
  mosunSilverOffset: 0,
  ibjaGoldOffset: 0,
  contactPhone: '+919351214851',
  whatsappNumber: '919351214851',
  showroomAddress: 'Station Road, Didwana, Rajasthan - PIN 341303',
  marketStatusText: 'Live Mandi Trading Active',
  maintenanceMode: false,
  maintenanceMessage: 'Scheduled terminal upgrade in progress. Please check back shortly.',
  registrationsOpen: true,
  enableNews: true,
  enableCharts: true,
  enableCalculator: true,
  enableAlerts: true,
  minApkVersion: '8.0.0',
  latestApkVersion: '9.0.0',
  latestApkUrl: 'https://github.com/ayushsoni05/Didwana-Bullion/releases/latest',
};

export function isOwnerAccount(email, phone) {
  const cleanEmail = String(email || '').trim().toLowerCase();
  const digits = String(phone || '').replace(/\D/g, '').slice(-10);
  const adminDigits = ADMIN_PHONE.replace(/\D/g, '').slice(-10);
  return (cleanEmail && cleanEmail === ADMIN_EMAIL) || (digits && digits === adminDigits);
}

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
      role VARCHAR(20) NOT NULL DEFAULT 'USER',
      is_blocked BOOLEAN NOT NULL DEFAULT FALSE,
      blocked_reason TEXT,
      admin_notes TEXT,
      app_version VARCHAR(30),
      last_ip VARCHAR(64),
      last_seen_at TIMESTAMPTZ,
      last_latitude DOUBLE PRECISION,
      last_longitude DOUBLE PRECISION,
      last_accuracy_m DOUBLE PRECISION,
      last_city VARCHAR(120),
      last_state VARCHAR(120),
      last_pincode VARCHAR(20),
      last_address TEXT,
      last_location_source VARCHAR(20),
      last_device_info JSONB,
      accepted_legal_version VARCHAR(20) NOT NULL DEFAULT '1.0.0',
      accepted_legal_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      cookie_functional BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(20) NOT NULL DEFAULT 'USER';
    ALTER TABLE users ADD COLUMN IF NOT EXISTS is_blocked BOOLEAN NOT NULL DEFAULT FALSE;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS blocked_reason TEXT;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS admin_notes TEXT;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS app_version VARCHAR(30);
    ALTER TABLE users ADD COLUMN IF NOT EXISTS last_ip VARCHAR(64);
    ALTER TABLE users ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMPTZ;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS last_latitude DOUBLE PRECISION;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS last_longitude DOUBLE PRECISION;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS last_accuracy_m DOUBLE PRECISION;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS last_city VARCHAR(120);
    ALTER TABLE users ADD COLUMN IF NOT EXISTS last_state VARCHAR(120);
    ALTER TABLE users ADD COLUMN IF NOT EXISTS last_pincode VARCHAR(20);
    ALTER TABLE users ADD COLUMN IF NOT EXISTS last_address TEXT;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS last_location_source VARCHAR(20);
    ALTER TABLE users ADD COLUMN IF NOT EXISTS last_device_info JSONB;

    CREATE INDEX IF NOT EXISTS idx_users_email ON users (LOWER(email));
    CREATE INDEX IF NOT EXISTS idx_users_phone ON users (phone);
    CREATE INDEX IF NOT EXISTS idx_users_role ON users (role);

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

    CREATE TABLE IF NOT EXISTS user_locations (
      id BIGSERIAL PRIMARY KEY,
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      latitude DOUBLE PRECISION,
      longitude DOUBLE PRECISION,
      accuracy_meters DOUBLE PRECISION,
      altitude DOUBLE PRECISION,
      city VARCHAR(120),
      state VARCHAR(120),
      pincode VARCHAR(20),
      address_label TEXT,
      source VARCHAR(20) NOT NULL DEFAULT 'GPS',
      ip_address VARCHAR(64),
      device_model VARCHAR(140),
      os_version VARCHAR(80),
      app_version VARCHAR(30),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_user_locations_user ON user_locations (user_id, created_at DESC);

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

    CREATE TABLE IF NOT EXISTS news_posts (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      title VARCHAR(200) NOT NULL,
      summary VARCHAR(500) NOT NULL,
      content TEXT NOT NULL,
      category VARCHAR(40) NOT NULL DEFAULT 'GOLD_OUTLOOK',
      impact VARCHAR(20) NOT NULL DEFAULT 'NEUTRAL',
      priority VARCHAR(20) NOT NULL DEFAULT 'NORMAL',
      image_url TEXT,
      is_published BOOLEAN NOT NULL DEFAULT TRUE,
      is_pinned BOOLEAN NOT NULL DEFAULT FALSE,
      views_count INTEGER NOT NULL DEFAULT 0,
      author_id UUID REFERENCES users(id) ON DELETE SET NULL,
      published_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_news_published ON news_posts (is_published, is_pinned DESC, published_at DESC);

    CREATE TABLE IF NOT EXISTS site_settings (
      key VARCHAR(80) PRIMARY KEY,
      value JSONB NOT NULL,
      updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS admin_notices (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID REFERENCES users(id) ON DELETE CASCADE,
      title VARCHAR(160) NOT NULL,
      message TEXT NOT NULL,
      severity VARCHAR(20) NOT NULL DEFAULT 'INFO',
      is_read BOOLEAN NOT NULL DEFAULT FALSE,
      created_by UUID REFERENCES users(id) ON DELETE SET NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_admin_notices_user ON admin_notices (user_id, created_at DESC);

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

  // Seed default global site config
  await pool.query(
    `INSERT INTO site_settings (key, value)
     VALUES ('global_config', $1::jsonb)
     ON CONFLICT (key) DO NOTHING`,
    [JSON.stringify(DEFAULT_SITE_CONFIG)]
  );

  // Ensure primary owner account has ADMIN role if already registered
  await pool.query(
    `UPDATE users SET role = 'ADMIN'
     WHERE (LOWER(email) = $1 OR phone = $2) AND role <> 'ADMIN'`,
    [ADMIN_EMAIL, ADMIN_PHONE]
  );

  // Seed initial welcome bullion bulletin if news_posts is empty
  const existingNews = await pool.query('SELECT COUNT(*)::int AS cnt FROM news_posts');
  if ((existingNews.rows[0]?.cnt || 0) === 0) {
    await pool.query(
      `INSERT INTO news_posts (title, summary, content, category, impact, priority, is_published, is_pinned)
       VALUES ($1, $2, $3, $4, $5, $6, TRUE, TRUE)`,
      [
        'Welcome to Didwana Bullion Newsroom Desk',
        'Live MCX/COMEX macro commentary, RBI policy updates, and Rajasthan mandi bullion insights from New Monika Jewellers.',
        'Welcome to the official Didwana Bullion Newsroom by New Monika Jewellers (Station Road, Didwana).\n\nHere our bullion desk publishes daily Rajasthan & national mandi commentary, 24K RTGS vs Cash spread trends, silver inventory updates, and showroom advisories in real time.\n\nFor bulk booking inquiries or physical rate locks, reach our Trade Desk directly on +91 9351214851.',
        'SHOWROOM_NOTICE',
        'NEUTRAL',
        'FEATURED',
      ]
    );
  }
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
