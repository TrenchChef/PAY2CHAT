# Deployment Guide

## Understanding the Architecture

Your application has **three separate components**:

### 1. **Next.js Frontend**
- **Type**: Next.js application (can be static export or server mode)
- **Build Output**: `.next/` directory (or `out/` for static export)
- **Server Needed**: ❌ No for static export, ✅ Yes for server mode (handled by Vercel/Netlify)
- **Deploy To**: Vercel (recommended), Netlify, GitHub Pages, Cloudflare Pages

### 2. **WebRTC Signaling Server**
- **Type**: Node.js WebSocket server
- **File**: `server.js`
- **Port**: 8888 (default)
- **Server Needed**: ✅ Yes - requires a Node.js runtime
- **Deploy To**: Railway (recommended), Render, Fly.io, DigitalOcean, AWS

### 3. **Database (Recommended for Production)**
- **Type**: PostgreSQL database
- **Purpose**: Store rooms, participants, payments, call sessions, analytics
- **Server Needed**: ✅ Yes - managed database service
- **Deploy To**: Supabase (recommended), Railway, Render, Neon, AWS RDS

## Why Add a Database?

**Current Limitations (without database):**
- ❌ Rooms only exist in localStorage (lost on clear data)
- ❌ No cross-device access
- ❌ No payment tracking/reconciliation
- ❌ No analytics or call history
- ❌ No user profiles or reputation

**Benefits (with database):**
- ✅ Persistent room storage
- ✅ Cross-device access
- ✅ Payment reconciliation with on-chain transactions
- ✅ Analytics dashboards
- ✅ Call history and receipts
- ✅ User profiles and ratings
- ✅ Better fraud prevention

## The Static Export Build Issue

**Problem**: Next.js with `output: 'export'` requires `generateStaticParams()` for all dynamic routes (`[id]`). The build fails because Next.js expects to pre-render all possible routes at build time, but our routes are generated client-side.

**Current Status**: The build fails, but the dev server works fine. For production, we have two options:

### Option A: Fix Static Export (Recommended for GitHub Pages)
- Keep `output: 'export'`
- Ensure all dynamic routes have `generateStaticParams()`
- Deploy static files to GitHub Pages

### Option B: Use Next.js Server Mode (Recommended for Vercel/Netlify)
- Remove `output: 'export'` from `next.config.js`
- Deploy to Vercel/Netlify (they handle Next.js automatically)
- Better for dynamic routes and API routes

## Complete Deployment: Vercel + Railway + Supabase

### Step 1: Set Up Database (Supabase)

1. **Create Supabase Project**
   - Go to [supabase.com](https://supabase.com)
   - Sign up with GitHub
   - Click "New Project"
   - Choose organization, name your project
   - Set database password (save it!)
   - Choose region closest to your users
   - Click "Create new project"
   - Wait 2-3 minutes for project to initialize

2. **Get Database Credentials**
   - Go to Project Settings → API
   - Copy these values:
     - `Project URL` (e.g., `https://xxxxx.supabase.co`)
     - `anon public` key
     - `service_role` key (keep secret! - server-only)
   - Go to Project Settings → Database
   - Copy `Connection string` (URI format) if needed

3. **Run Database Migrations**
   - Go to SQL Editor in Supabase dashboard
   - Copy and paste the SQL from "Database Schema" section below
   - Click "Run" to execute
   - Verify tables were created in Table Editor

4. **Set Up Row Level Security (RLS)**
   - Go to Authentication → Policies
   - Enable RLS on all tables
   - Create policies for public read/write access (adjust based on your security needs)
   - See "Row Level Security Policies" section below for examples

### Step 2: Deploy Signaling Server (Railway)

1. **Sign Up for Railway**
   - Go to [railway.app](https://railway.app)
   - Click "Start a New Project"
   - Sign in with GitHub

2. **Deploy Server**
   - Click "New Project" → "Deploy from GitHub repo"
   - Select your `PAY2CHAT` repository
   - Railway auto-detects Node.js

3. **Configure Service**
   - Click on the service to open settings
   - Go to "Settings" tab
   - Set **Start Command**: `node server.js`
   - Go to "Variables" tab
   - Add environment variables:
     ```
     PORT=8888
     METERED_API_KEY=your_key (optional)
     ```

4. **Get WebSocket URL**
   - Go to "Settings" → "Networking"
   - Railway provides a public domain like: `your-app-production.up.railway.app`
   - Copy this URL - you'll need it for the frontend
   - **Important**: Use `wss://` (secure WebSocket) not `ws://`

### Step 3: Deploy Frontend (Vercel)

1. **Sign Up for Vercel**
   - Go to [vercel.com](https://vercel.com)
   - Click "Sign Up"
   - Sign in with GitHub

2. **Import Project**
   - Click "Add New..." → "Project"
   - Select your `PAY2CHAT` repository
   - Vercel auto-detects Next.js

3. **Configure Build Settings**
   - **Framework Preset**: Next.js (auto-detected)
   - **Root Directory**: `./` (default)
   - **Build Command**: `npm run build` (default)
   - **Output Directory**: `.next` (default)
   - **Install Command**: `npm install` (default)

4. **Add Environment Variables**
   Before deploying, click "Environment Variables" and add:
   
   ```
   # WebRTC Signaling
   NEXT_PUBLIC_SIGNALING_URL=wss://your-app-production.up.railway.app
   
   # Supabase Database
   NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
   
   # Optional: Solana RPC (if using custom endpoint)
   NEXT_PUBLIC_SOLANA_RPC_URL=https://api.mainnet-beta.solana.com
   ```
   
   **Important**: 
   - Add to **Production**, **Preview**, and **Development** environments
   - `NEXT_PUBLIC_*` variables are exposed to the browser
   - `SUPABASE_SERVICE_ROLE_KEY` should NOT have `NEXT_PUBLIC_` prefix (server-only)

5. **Update Next.js Config (if needed)**
   - For Vercel, remove `output: 'export'` from `next.config.js`
   - This allows API routes and dynamic rendering

6. **Deploy**
   - Click "Deploy"
   - Wait for build to complete (2-5 minutes)
   - Vercel provides a URL like: `your-app.vercel.app`

### Step 4: Create API Routes (Next.js)

Create API routes in `app/api/` directory to interact with Supabase:

**Example: `app/api/rooms/route.ts`**
```typescript
import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  // Create room logic
  const body = await request.json();
  // Insert into rooms table
  // Return room data
}

export async function GET(request: NextRequest) {
  // Get room logic
  const { searchParams } = new URL(request.url);
  const roomId = searchParams.get('id');
  // Query rooms table
  // Return room data
}
```

## Database Schema

### Required Tables

**1. Rooms Table**
```sql
CREATE TABLE rooms (
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

CREATE INDEX idx_rooms_join_code ON rooms(join_code);
CREATE INDEX idx_rooms_host_wallet ON rooms(host_wallet);
CREATE INDEX idx_rooms_status ON rooms(status);
```

**2. Room Participants Table**
```sql
CREATE TABLE room_participants (
  id TEXT PRIMARY KEY,
  room_id TEXT REFERENCES rooms(id) ON DELETE CASCADE,
  wallet_address TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('host', 'invitee')),
  joined_at TIMESTAMP DEFAULT NOW(),
  left_at TIMESTAMP,
  connection_state TEXT DEFAULT 'joined' CHECK (connection_state IN ('joined', 'in-call', 'left'))
);

CREATE INDEX idx_participants_room_id ON room_participants(room_id);
CREATE INDEX idx_participants_wallet ON room_participants(wallet_address);
```

**3. Payments Table**
```sql
CREATE TABLE payments (
  id TEXT PRIMARY KEY,
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

CREATE INDEX idx_payments_room_id ON payments(room_id);
CREATE INDEX idx_payments_from_wallet ON payments(from_wallet);
CREATE INDEX idx_payments_to_wallet ON payments(to_wallet);
CREATE INDEX idx_payments_tx_signature ON payments(transaction_signature);
```

**4. Call Sessions Table**
```sql
CREATE TABLE call_sessions (
  id TEXT PRIMARY KEY,
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

CREATE INDEX idx_sessions_room_id ON call_sessions(room_id);
CREATE INDEX idx_sessions_host_wallet ON call_sessions(host_wallet);
CREATE INDEX idx_sessions_invitee_wallet ON call_sessions(invitee_wallet);
```

**5. File Purchases Table**
```sql
CREATE TABLE file_purchases (
  id TEXT PRIMARY KEY,
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

CREATE INDEX idx_file_purchases_room_id ON file_purchases(room_id);
CREATE INDEX idx_file_purchases_buyer ON file_purchases(buyer_wallet);
```

**6. User Profiles Table (Optional)**
```sql
CREATE TABLE user_profiles (
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

CREATE INDEX idx_profiles_last_active ON user_profiles(last_active_at);
```

### Row Level Security (RLS) Policies

Enable RLS and create policies:

```sql
-- Enable RLS on all tables
ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE room_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE call_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE file_purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Example: Allow public read access to active rooms
CREATE POLICY "Public can view active rooms"
  ON rooms FOR SELECT
  USING (status = 'active');

-- Example: Allow anyone to create rooms
CREATE POLICY "Anyone can create rooms"
  ON rooms FOR INSERT
  WITH CHECK (true);

-- Example: Allow room host to update their room
CREATE POLICY "Host can update own room"
  ON rooms FOR UPDATE
  USING (host_wallet = current_setting('request.jwt.claims', true)::json->>'wallet_address');

-- Adjust policies based on your security requirements
-- For production, implement proper authentication and authorization
```

## Environment Variables Summary

### Frontend (Vercel)
```bash
# WebRTC Signaling
NEXT_PUBLIC_SIGNALING_URL=wss://your-app.railway.app

# Supabase Database
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Solana (optional)
NEXT_PUBLIC_SOLANA_RPC_URL=https://api.mainnet-beta.solana.com
```

### Signaling Server (Railway)
```bash
PORT=8888
METERED_API_KEY=your_key (optional)
```

### Database (Supabase)
- Managed by Supabase (no env vars needed)
- Connection string available in dashboard

## Testing Your Deployment

1. **Test Database Connection**
   ```bash
   # Install Supabase client
   npm install @supabase/supabase-js
   
   # Test in a script or API route
   import { createClient } from '@supabase/supabase-js';
   const supabase = createClient(
     process.env.NEXT_PUBLIC_SUPABASE_URL!,
     process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
   );
   const { data, error } = await supabase.from('rooms').select('*');
   ```

2. **Test Signaling Server**
   ```bash
   # Install wscat if needed
   npm install -g wscat
   
   # Test connection
   wscat -c wss://your-app.railway.app
   ```

3. **Test Frontend**
   - Visit your Vercel URL
   - Open browser console
   - Check for WebSocket connection errors
   - Test full flow: create room → join → call

4. **Test Database Integration**
   - Create a room (should save to database)
   - Join from another device (should load from database)
   - Check Supabase dashboard → Table Editor to verify data

## Troubleshooting

### Database Connection Fails
- Verify `NEXT_PUBLIC_SUPABASE_URL` and keys are correct
- Check Supabase project is active (not paused)
- Verify RLS policies allow your operations
- Check network tab in browser for API errors
- Review Supabase logs in dashboard

### Build Fails with "missing generateStaticParams"
- **Solution A**: Remove `output: 'export'` from `next.config.js` (use Vercel)
- **Solution B**: Fix `generateStaticParams()` in all dynamic routes (for GitHub Pages)

### WebRTC Connection Fails
- Check `NEXT_PUBLIC_SIGNALING_URL` is set correctly
- Ensure signaling server is running on Railway
- Check WebSocket URL uses `wss://` (secure) not `ws://` (insecure)
- Verify Railway service is not sleeping (upgrade plan if needed)
- Check Railway logs for errors

### API Routes Not Working
- Ensure `output: 'export'` is removed from `next.config.js`
- Check Vercel deployment logs
- Verify environment variables are set correctly
- Test API routes locally first: `npm run dev` then visit `http://localhost:3000/api/rooms`

### CORS Issues
- Signaling server doesn't need CORS (WebSocket protocol)
- Supabase handles CORS automatically
- Check Supabase project settings if issues persist
- Verify API routes have proper headers

### Database Queries Slow
- Add indexes for frequently queried columns
- Use `EXPLAIN ANALYZE` in Supabase SQL editor to optimize queries
- Consider pagination for large result sets
- Monitor Supabase dashboard for query performance

## Recommended Setup

**For Production:**
- **Frontend**: Vercel (easiest, best Next.js support, free tier available)
- **Signaling Server**: Railway (easiest Node.js deployment, free tier available)
- **Database**: Supabase (PostgreSQL, free tier: 500MB database, 2GB bandwidth)

**For Development:**
- **Frontend**: `npm run dev` (localhost:3000)
- **Signaling Server**: `node server.js` (localhost:8888)
- **Database**: Local Supabase instance or use Supabase cloud (free tier)

## Cost Estimates (Free Tier)

- **Vercel**: Free (100GB bandwidth/month, unlimited deployments)
- **Railway**: Free ($5 credit/month, ~500 hours runtime)
- **Supabase**: Free (500MB database, 2GB bandwidth/month, 50K monthly active users)

**Total**: $0/month for small to medium usage

## Next Steps After Deployment

1. **Set up monitoring**
   - Add error tracking (Sentry, LogRocket)
   - Monitor database usage in Supabase dashboard
   - Set up Railway/Vercel alerts
   - Track API response times

2. **Optimize performance**
   - Add database indexes for common queries
   - Implement caching for room lookups
   - Optimize API routes
   - Use Supabase real-time subscriptions for live updates

3. **Add features**
   - User authentication (Supabase Auth)
   - Real-time subscriptions (Supabase Realtime)
   - Analytics dashboard
   - Email notifications
   - Payment verification webhooks

4. **Security hardening**
   - Review and tighten RLS policies
   - Add rate limiting to API routes
   - Implement payment verification webhooks
   - Set up backup strategy
   - Enable Supabase database backups
   - Add input validation and sanitization

5. **Scale preparation**
   - Monitor database size and plan upgrades
   - Set up database connection pooling
   - Consider read replicas for heavy read workloads
   - Implement caching layer (Redis) if needed
