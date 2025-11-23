# Pay2Chat Deployment Agent Script
## Railway (Backend) + Vercel (Frontend) Complete Setup

**Purpose**: Automate deployment of Pay2Chat to Railway (PostgreSQL + Signaling Server) and Vercel (Next.js Frontend) with pause points for manual steps.

**Estimated Time**: 30-45 minutes (including manual steps)

---

## Pre-Deployment Checklist

Before starting, verify:
- [ ] GitHub repository is accessible
- [ ] Railway account exists (railway.app)
- [ ] Vercel account exists (vercel.com)
- [ ] Both accounts are linked to GitHub
- [ ] Node.js and npm are installed locally
- [ ] Git is configured

---

## PHASE 1: RAILWAY BACKEND SETUP

### Step 1.1: Install Railway CLI

**AUTONOMOUS ACTION:**
```bash
# Check if Railway CLI is installed
if ! command -v railway &> /dev/null; then
  echo "Installing Railway CLI..."
  npm install -g @railway/cli
else
  echo "Railway CLI already installed"
  railway --version
fi
```

**VERIFY**: Railway CLI version should be displayed.

---

### Step 1.2: Railway Login

**MANUAL ACTION REQUIRED** ⚠️

**AUTONOMOUS ACTION:**
```bash
# Check login status
railway whoami
```

**IF NOT LOGGED IN:**
```bash
# Initiate login (opens browser)
railway login
```

**PAUSE FOR USER CONFIRMATION** ⏸️

**User must:**
1. Complete browser login to Railway
2. Authorize Railway CLI access
3. Return to terminal

**CONFIRMATION PROMPT:**
```
✅ Have you completed Railway login in the browser? (yes/no)
```

**After confirmation, verify:**
```bash
railway whoami
# Should display your Railway email/username
```

---

### Step 1.3: Create Railway Project

**AUTONOMOUS ACTION:**
```bash
# Check if already in a Railway project
if [ -f "railway.json" ] || [ -f ".railway" ]; then
  echo "Railway project already linked"
  railway status
else
  echo "Initializing new Railway project..."
  railway init
fi
```

**IF NEW PROJECT:**
**PAUSE FOR USER CONFIRMATION** ⏸️

**User must:**
1. Choose project name (or accept default)
2. Confirm project creation

**CONFIRMATION PROMPT:**
```
✅ Has the Railway project been created? (yes/no)
✅ What is the project name? (enter name)
```

**Document project name in `.railway-setup.md`**

---

### Step 1.4: Add PostgreSQL Database Service

**AUTONOMOUS ACTION:**
```bash
# Add PostgreSQL service
railway add postgresql

# Wait for service to provision (30-60 seconds)
echo "Waiting for PostgreSQL to provision..."
sleep 10

# Get database connection string
railway variables --service postgresql | grep DATABASE_URL
```

**PAUSE FOR USER CONFIRMATION** ⏸️

**Verify:**
1. PostgreSQL service appears in Railway dashboard
2. Service status is "Active"

**CONFIRMATION PROMPT:**
```
✅ Is PostgreSQL service active in Railway dashboard? (yes/no)
```

**AUTONOMOUS ACTION - Save Database URL:**
```bash
# Get and save DATABASE_URL (masked for security)
DATABASE_URL=$(railway variables --service postgresql | grep DATABASE_URL | cut -d'=' -f2-)
echo "DATABASE_URL obtained (masked): ${DATABASE_URL:0:20}...${DATABASE_URL: -10}"

# Save to .railway-setup.md
cat >> .railway-setup.md << EOF
## PostgreSQL Database
- Service: postgresql
- Connection String: ${DATABASE_URL:0:20}...${DATABASE_URL: -10} (masked)
- Status: Active
EOF
```

---

### Step 1.5: Deploy Signaling Server

**AUTONOMOUS ACTION:**
```bash
# Add new service for signaling server
railway add

# Set service name (will prompt)
# Use default or specify: "signaling-server"
```

**PAUSE FOR USER CONFIRMATION** ⏸️

**User must:**
1. Enter service name (or accept default)
2. Confirm service creation

**CONFIRMATION PROMPT:**
```
✅ What is the signaling server service name? (enter name or 'default')
```

**AUTONOMOUS ACTION:**
```bash
# Set environment variables for signaling server
railway variables --service <SERVICE_NAME> PORT=8888
railway variables --service <SERVICE_NAME> NODE_ENV=production

# Set start command
railway variables --service <SERVICE_NAME> START_COMMAND="node server.js"

# Verify server.js exists
if [ ! -f "server.js" ]; then
  echo "ERROR: server.js not found!"
  exit 1
fi

# Deploy signaling server
echo "Deploying signaling server..."
railway up --service <SERVICE_NAME>
```

**Wait for deployment (2-3 minutes)**

**AUTONOMOUS ACTION - Get Signaling Server URL:**
```bash
# Generate domain for signaling server
railway domain --service <SERVICE_NAME>

# Get the domain
SIGNALING_URL=$(railway domain --service <SERVICE_NAME> | grep -o 'https://[^ ]*' | head -1)
echo "Signaling server URL: $SIGNALING_URL"

# Convert to WebSocket URL (wss://)
SIGNALING_WS_URL=$(echo $SIGNALING_URL | sed 's|https://|wss://|')
echo "WebSocket URL: $SIGNALING_WS_URL"

# Save to .railway-setup.md
cat >> .railway-setup.md << EOF
## Signaling Server
- Service: <SERVICE_NAME>
- HTTP URL: $SIGNALING_URL
- WebSocket URL: $SIGNALING_WS_URL
- Status: Deployed
EOF
```

**PAUSE FOR USER CONFIRMATION** ⏸️

**Verify:**
1. Service is deployed and running
2. Domain is accessible

**CONFIRMATION PROMPT:**
```
✅ Is the signaling server service deployed and running? (yes/no)
✅ Can you see the domain in Railway dashboard? (yes/no)
```

---

### Step 1.6: Set Up Database Schema

**MANUAL ACTION REQUIRED** ⚠️

**AUTONOMOUS ACTION - Create SQL File:**
```bash
# Create database schema SQL file
cat > railway-schema.sql << 'EOF'
-- Pay2Chat Database Schema for Railway PostgreSQL

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
  duration INTEGER,
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
EOF

echo "SQL schema file created: railway-schema.sql"
```

**PAUSE FOR USER CONFIRMATION** ⏸️

**User must:**
1. Open Railway dashboard
2. Go to PostgreSQL service → "Data" tab → "Query"
3. Copy contents of `railway-schema.sql`
4. Paste into SQL editor
5. Click "Run"
6. Verify tables were created

**CONFIRMATION PROMPT:**
```
✅ Have you run the SQL schema in Railway dashboard? (yes/no)
✅ Can you see all 6 tables in the Table Editor? (yes/no)
```

---

## PHASE 2: VERCEL FRONTEND SETUP

### Step 2.1: Install Vercel CLI

**AUTONOMOUS ACTION:**
```bash
# Check if Vercel CLI is installed
if ! command -v vercel &> /dev/null; then
  echo "Installing Vercel CLI..."
  npm install -g vercel
else
  echo "Vercel CLI already installed"
  vercel --version
fi
```

---

### Step 2.2: Vercel Login

**MANUAL ACTION REQUIRED** ⚠️

**AUTONOMOUS ACTION:**
```bash
# Check login status
vercel whoami
```

**IF NOT LOGGED IN:**
```bash
# Initiate login (opens browser)
vercel login
```

**PAUSE FOR USER CONFIRMATION** ⏸️

**User must:**
1. Complete browser login to Vercel
2. Authorize Vercel CLI access
3. Return to terminal

**CONFIRMATION PROMPT:**
```
✅ Have you completed Vercel login in the browser? (yes/no)
```

---

### Step 2.3: Update Next.js Config for Vercel

**AUTONOMOUS ACTION:**
```bash
# Backup current next.config.js
cp next.config.js next.config.js.backup

# Update next.config.js to remove static export (for Vercel)
cat > next.config.js << 'EOF'
/** @type {import('next').NextConfig} */
const nextConfig = {
  // Removed output: 'export' for Vercel deployment
  images: {
    unoptimized: true, // Can remove this if you want Vercel image optimization
  },
  reactStrictMode: true,
  webpack: (config) => {
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      net: false,
      tls: false,
    };
    return config;
  },
};

module.exports = nextConfig;
EOF

echo "next.config.js updated for Vercel deployment"
```

---

### Step 2.4: Create Environment Variables File

**AUTONOMOUS ACTION:**
```bash
# Create .env.vercel file with Railway URLs
cat > .env.vercel << EOF
# Railway PostgreSQL Database
DATABASE_URL=$DATABASE_URL

# Railway Signaling Server
NEXT_PUBLIC_SIGNALING_URL=$SIGNALING_WS_URL

# Solana RPC (optional - can use public or custom)
NEXT_PUBLIC_SOLANA_RPC_URL=https://api.mainnet-beta.solana.com
EOF

echo ".env.vercel created (DO NOT COMMIT - contains secrets)"
```

**Add to .gitignore:**
```bash
# Add to .gitignore if not already there
if ! grep -q ".env.vercel" .gitignore; then
  echo ".env.vercel" >> .gitignore
fi
```

---

### Step 2.5: Link Vercel Project

**AUTONOMOUS ACTION:**
```bash
# Check if already linked
if [ -f ".vercel/project.json" ]; then
  echo "Vercel project already linked"
  cat .vercel/project.json
else
  echo "Linking Vercel project..."
  vercel link
fi
```

**PAUSE FOR USER CONFIRMATION** ⏸️

**User must:**
1. Select or create Vercel project
2. Confirm project settings
3. Accept defaults or customize

**CONFIRMATION PROMPT:**
```
✅ Has the Vercel project been linked? (yes/no)
✅ What is the project name? (enter name)
```

---

### Step 2.6: Set Vercel Environment Variables

**AUTONOMOUS ACTION:**
```bash
# Read environment variables from .env.vercel
source .env.vercel

# Set environment variables in Vercel
echo "Setting Vercel environment variables..."

# Database URL (server-only, no NEXT_PUBLIC_ prefix)
vercel env add DATABASE_URL production << EOF
$DATABASE_URL
EOF

vercel env add DATABASE_URL preview << EOF
$DATABASE_URL
EOF

vercel env add DATABASE_URL development << EOF
$DATABASE_URL
EOF

# Signaling Server URL (public, needs NEXT_PUBLIC_ prefix)
vercel env add NEXT_PUBLIC_SIGNALING_URL production << EOF
$SIGNALING_WS_URL
EOF

vercel env add NEXT_PUBLIC_SIGNALING_URL preview << EOF
$SIGNALING_WS_URL
EOF

vercel env add NEXT_PUBLIC_SIGNALING_URL development << EOF
$SIGNALING_WS_URL
EOF

# Solana RPC (optional)
vercel env add NEXT_PUBLIC_SOLANA_RPC_URL production << EOF
https://api.mainnet-beta.solana.com
EOF

vercel env add NEXT_PUBLIC_SOLANA_RPC_URL preview << EOF
https://api.mainnet-beta.solana.com
EOF

vercel env add NEXT_PUBLIC_SOLANA_RPC_URL development << EOF
https://api.mainnet-beta.solana.com
EOF

echo "Environment variables set in Vercel"
```

**PAUSE FOR USER CONFIRMATION** ⏸️

**Verify in Vercel dashboard:**
1. Go to Project → Settings → Environment Variables
2. Confirm all variables are set for Production, Preview, and Development

**CONFIRMATION PROMPT:**
```
✅ Are all environment variables visible in Vercel dashboard? (yes/no)
```

---

### Step 2.7: Deploy to Vercel

**AUTONOMOUS ACTION:**
```bash
# Build locally first to check for errors
echo "Building Next.js application..."
npm run build

if [ $? -ne 0 ]; then
  echo "ERROR: Build failed! Fix errors before deploying."
  exit 1
fi

# Deploy to Vercel
echo "Deploying to Vercel..."
vercel --prod
```

**Wait for deployment (3-5 minutes)**

**AUTONOMOUS ACTION - Get Deployment URL:**
```bash
# Get deployment URL
VERCEL_URL=$(vercel ls | grep -o 'https://[^ ]*' | head -1)
echo "Vercel deployment URL: $VERCEL_URL"

# Save to .railway-setup.md
cat >> .railway-setup.md << EOF
## Vercel Frontend
- Project: <PROJECT_NAME>
- URL: $VERCEL_URL
- Status: Deployed
EOF
```

**PAUSE FOR USER CONFIRMATION** ⏸️

**Verify:**
1. Deployment succeeded in Vercel dashboard
2. Application is accessible at the URL
3. No build errors

**CONFIRMATION PROMPT:**
```
✅ Is the Vercel deployment successful? (yes/no)
✅ Can you access the application at the URL? (yes/no)
```

---

## COMPLETION CHECKLIST

**Final Verification:**
- [ ] Railway PostgreSQL is running
- [ ] Database schema is deployed (6 tables)
- [ ] Railway signaling server is deployed
- [ ] Signaling server has public domain
- [ ] Vercel frontend is deployed
- [ ] Environment variables are set
- [ ] Application is accessible
- [ ] Database connection works
- [ ] Signaling server connection works

**If all items checked:**
```
🎉 DEPLOYMENT COMPLETE!
```

