-- Pay2Chat Database Schema for Railway PostgreSQL
-- Run this in Railway dashboard: Postgres service → Data tab → Query

-- 1. Rooms Table
CREATE TABLE IF NOT EXISTS rooms (
  id TEXT PRIMARY KEY,
  host_wallet TEXT NOT NULL,
  join_code TEXT UNIQUE NOT NULL,
  rate DECIMAL(10, 2) NOT NULL,
  description TEXT,
  config JSONB,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'in-call', 'ended', 'cancelled')),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_rooms_join_code ON rooms(join_code);
CREATE INDEX IF NOT EXISTS idx_rooms_host_wallet ON rooms(host_wallet);
CREATE INDEX IF NOT EXISTS idx_rooms_status ON rooms(status);

-- 2. Room Participants Table
CREATE TABLE IF NOT EXISTS room_participants (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  room_id TEXT REFERENCES rooms(id) ON DELETE CASCADE,
  wallet_address TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('host', 'invitee')),
  joined_at TIMESTAMP DEFAULT NOW(),
  left_at TIMESTAMP,
  connection_state TEXT DEFAULT 'joined' CHECK (connection_state IN ('joined', 'in-call', 'left'))
);

CREATE INDEX IF NOT EXISTS idx_participants_room_id ON room_participants(room_id);
CREATE INDEX IF NOT EXISTS idx_participants_wallet ON room_participants(wallet_address);

-- 3. Payments Table
CREATE TABLE IF NOT EXISTS payments (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  room_id TEXT REFERENCES rooms(id),
  from_wallet TEXT NOT NULL,
  to_wallet TEXT NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('minute-billing', 'tip', 'file-purchase')),
  transaction_signature TEXT UNIQUE NOT NULL,
  timestamp TIMESTAMP DEFAULT NOW(),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'failed')),
  block_time BIGINT,
  file_id TEXT
);

CREATE INDEX IF NOT EXISTS idx_payments_room_id ON payments(room_id);
CREATE INDEX IF NOT EXISTS idx_payments_from_wallet ON payments(from_wallet);
CREATE INDEX IF NOT EXISTS idx_payments_to_wallet ON payments(to_wallet);
CREATE INDEX IF NOT EXISTS idx_payments_tx_signature ON payments(transaction_signature);

-- 4. Call Sessions Table
CREATE TABLE IF NOT EXISTS call_sessions (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  room_id TEXT REFERENCES rooms(id),
  host_wallet TEXT NOT NULL,
  invitee_wallet TEXT NOT NULL,
  started_at TIMESTAMP DEFAULT NOW(),
  ended_at TIMESTAMP,
  duration INTEGER, -- seconds
  total_billed DECIMAL(10, 2),
  tips_received DECIMAL(10, 2),
  files_purchased INTEGER,
  files_revenue DECIMAL(10, 2)
);

CREATE INDEX IF NOT EXISTS idx_sessions_room_id ON call_sessions(room_id);
CREATE INDEX IF NOT EXISTS idx_sessions_host_wallet ON call_sessions(host_wallet);
CREATE INDEX IF NOT EXISTS idx_sessions_invitee_wallet ON call_sessions(invitee_wallet);

-- 5. File Purchases Table
CREATE TABLE IF NOT EXISTS file_purchases (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  room_id TEXT REFERENCES rooms(id),
  file_id TEXT NOT NULL,
  buyer_wallet TEXT NOT NULL,
  seller_wallet TEXT NOT NULL,
  price DECIMAL(10, 2) NOT NULL,
  transaction_signature TEXT UNIQUE NOT NULL,
  purchased_at TIMESTAMP DEFAULT NOW(),
  download_url TEXT,
  download_expires_at TIMESTAMP,
  downloaded BOOLEAN DEFAULT FALSE,
  downloaded_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_file_purchases_room_id ON file_purchases(room_id);
CREATE INDEX IF NOT EXISTS idx_file_purchases_buyer ON file_purchases(buyer_wallet);

-- 6. User Profiles Table
CREATE TABLE IF NOT EXISTS user_profiles (
  wallet_address TEXT PRIMARY KEY,
  total_earnings DECIMAL(10, 2) DEFAULT 0,
  total_spent DECIMAL(10, 2) DEFAULT 0,
  total_calls_hosted INTEGER DEFAULT 0,
  total_calls_joined INTEGER DEFAULT 0,
  average_rating DECIMAL(3, 2),
  created_at TIMESTAMP DEFAULT NOW(),
  last_active_at TIMESTAMP DEFAULT NOW(),
  preferences JSONB
);

CREATE INDEX IF NOT EXISTS idx_profiles_last_active ON user_profiles(last_active_at);

-- Verify tables were created
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_type = 'BASE TABLE'
ORDER BY table_name;

