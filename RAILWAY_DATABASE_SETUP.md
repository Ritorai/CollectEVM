# Railway Database Setup Guide

## Why Your Database Has No Tables

If your PostgreSQL database on Railway shows "no tables", it's because the database schema hasn't been pushed yet. Here's how to fix it:

## Step 1: Verify PostgreSQL Service is Linked

1. **Go to your Railway project dashboard**
2. **Check that you have a PostgreSQL service** (should show as "Postgres" with a blue elephant icon)
3. **Check that CollectEVM service is connected** to Postgres (you should see a dashed line connecting them)

## Step 2: Verify DATABASE_URL Environment Variable

1. **Go to your CollectEVM service** in Railway
2. **Click on "Variables" tab**
3. **Look for `DATABASE_URL`** - it should be automatically set by Railway

### If DATABASE_URL is Missing:

Railway should automatically inject `DATABASE_URL` when you link the PostgreSQL service. If it's missing:

1. **Make sure PostgreSQL service is linked:**
   - Go to your CollectEVM service
   - Click "Settings" → "Service Connections" or "Linked Services"
   - Make sure "Postgres" is listed and connected

2. **Manually add DATABASE_URL (if needed):**
   - Go to Variables tab
   - Click "Raw Editor"
   - Add this line:
     ```
     DATABASE_URL="${{Postgres.DATABASE_URL}}"
     ```
   - Click "Update Variables"

## Step 3: Trigger Database Setup

The database setup script runs automatically when your app starts. To trigger it:

### Option A: Restart Your Service (Easiest)
1. Go to your CollectEVM service
2. Click on "Deployments" tab
3. Click "Redeploy" on the latest deployment
4. Watch the logs - you should see database setup messages

### Option B: Manual Database Push (Using Railway CLI)

If you have Railway CLI installed:

```bash
# Install Railway CLI (if not installed)
npm i -g @railway/cli

# Login
railway login

# Link to your project
railway link

# Run database push
railway run npx prisma db push --accept-data-loss
```

### Option C: Use Railway's Database Tab

1. Go to your **Postgres** service (not CollectEVM)
2. Click on the **"Database"** tab
3. You should see a SQL editor
4. The tables will be created automatically when the app starts, OR you can run:

```sql
-- This will be done automatically by Prisma, but you can verify tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public';
```

## Step 4: Verify Tables Were Created

After the app restarts, check:

1. **Go to Postgres service** → **Database tab**
2. **You should see tables:**
   - `Nonce`
   - `WalletLink`
   - `LinkedNFT`
   - `_prisma_migrations` (if using migrations)

## Troubleshooting

### "DATABASE_URL not set" in logs

**Solution:** Make sure PostgreSQL service is linked to CollectEVM service.

1. Go to CollectEVM service → Settings
2. Look for "Service Connections" or "Linked Services"
3. Ensure Postgres is connected
4. If not, click "Connect" or "Link Service"

### "Database connection failed" in logs

**Solution:** Check that:
1. PostgreSQL service is running (green status)
2. DATABASE_URL is correctly set
3. The connection string format is correct

### Tables still not appearing

**Solution:** Manually trigger database setup:

1. **Check Railway logs** for the startup script output
2. **Look for** "Database Setup Script" messages
3. **If you see errors**, copy them and check:
   - Is DATABASE_URL set?
   - Is PostgreSQL service running?
   - Are there any connection errors?

## Expected Log Output

When the database setup works, you should see in Railway logs:

```
==========================================
🔍 Database Setup Script
==========================================
✅ DATABASE_URL is set
   Format: postgresql://user@***
📦 Generating Prisma Client...
📤 Pushing database schema...
✅ Database schema pushed successfully!
   Tables should now exist in your PostgreSQL database
==========================================
✅ Database setup script complete
==========================================
```

## Quick Checklist

- [ ] PostgreSQL service exists in Railway project
- [ ] PostgreSQL service is linked to CollectEVM service
- [ ] DATABASE_URL environment variable exists in CollectEVM service
- [ ] DATABASE_URL value is not empty (should be a connection string)
- [ ] App has been restarted/redeployed after linking
- [ ] Check Railway logs for database setup messages
- [ ] Verify tables exist in Postgres → Database tab

## Still Having Issues?

1. **Check Railway logs** - Look for database setup script output
2. **Verify service linking** - Make sure Postgres and CollectEVM are connected
3. **Check environment variables** - DATABASE_URL should be automatically set
4. **Try manual database push** - Use Railway CLI or SQL editor

The database setup script runs automatically on every app start, so once DATABASE_URL is correctly configured, tables will be created automatically.

