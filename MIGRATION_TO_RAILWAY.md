# Migration to Railway - Summary

This document summarizes all the changes made to migrate CollectEVM from SQLite/Vercel to Railway with PostgreSQL and Redis, matching the FruitNinja project structure.

## 📋 Changes Made

### 1. Database Migration (SQLite → PostgreSQL)

**File: `prisma/schema.prisma`**
- ✅ Changed `provider = "sqlite"` to `provider = "postgresql"`
- Database now uses PostgreSQL instead of SQLite
- All Prisma models remain the same (compatible with PostgreSQL)

### 2. Redis Integration

**New File: `lib/redis.ts`**
- ✅ Created Redis client utility module
- ✅ Graceful fallback if Redis unavailable
- ✅ Functions: `getCache()`, `setCache()`, `deleteCache()`, `isRedisAvailable()`
- ✅ Automatic initialization on server startup

**File: `package.json`**
- ✅ Added `redis: "^4.6.11"` dependency

### 3. Caching Implementation

**File: `app/api/nonce/route.ts`**
- ✅ Added Redis caching for nonces (5-minute TTL)
- ✅ Nonces are cached for faster lookups

**File: `app/api/verify-solana/route.ts`**
- ✅ Added Redis caching for NFT queries (5-minute TTL)
- ✅ Reduces blockchain RPC calls by caching wallet NFT data

**File: `lib/solana.ts`**
- ✅ Added Redis import (ready for future caching enhancements)

### 4. Railway Configuration

**New File: `railway.json`**
- ✅ Railway build configuration
- ✅ Specifies build and start commands

**New File: `railway.toml`**
- ✅ Alternative Railway configuration format
- ✅ Same settings as railway.json

### 5. Environment Variables

**File: `env.example`**
- ✅ Updated with Railway-specific notes
- ✅ Added Redis configuration section
- ✅ Added `NODE_ENV` variable
- ✅ Clear comments about Railway auto-injected variables

### 6. Health Check Endpoint

**New File: `app/api/health/route.ts`**
- ✅ Health check endpoint for monitoring
- ✅ Checks database and Redis connectivity
- ✅ Useful for Railway monitoring and debugging

### 7. Documentation

**New File: `RAILWAY_DEPLOYMENT.md`**
- ✅ Comprehensive deployment guide
- ✅ Step-by-step instructions
- ✅ Troubleshooting section
- ✅ Environment variables reference

---

## 🚀 Deployment Steps Overview

### Quick Start:

1. **Push code to GitHub**
   ```bash
   git add .
   git commit -m "Migrate to Railway with PostgreSQL and Redis"
   git push
   ```

2. **Create Railway Project**
   - Go to https://railway.app
   - New Project → Deploy from GitHub
   - Select your CollectEVM repo

3. **Add PostgreSQL**
   - Click "+ New" → Database → Add PostgreSQL
   - Railway auto-sets `DATABASE_URL`

4. **Add Redis**
   - Click "+ New" → Database → Add Redis
   - Railway auto-sets `REDIS_URL`

5. **Set Environment Variables**
   - Go to Variables tab
   - Add required variables (see RAILWAY_DEPLOYMENT.md)
   - **Don't** set DATABASE_URL or REDIS_URL (Railway does this)

6. **Deploy**
   - Railway auto-deploys on push
   - Or click "Deploy" manually

7. **Verify**
   - Visit your Railway URL
   - Check `/api/health` endpoint
   - Test wallet connections

---

## 🔄 Migration Checklist

### Before Deployment:
- [x] Prisma schema updated to PostgreSQL
- [x] Redis dependency added
- [x] Redis utility module created
- [x] Caching implemented in API routes
- [x] Railway config files created
- [x] Environment variables updated
- [x] Health check endpoint created
- [x] Documentation written

### During Deployment:
- [ ] Push code to GitHub
- [ ] Create Railway project
- [ ] Add PostgreSQL plugin
- [ ] Add Redis plugin
- [ ] Set environment variables
- [ ] Run database migrations (`npx prisma db push`)
- [ ] Verify deployment

### After Deployment:
- [ ] Test health endpoint
- [ ] Test wallet connections
- [ ] Test NFT verification
- [ ] Test EVM wallet linking
- [ ] Monitor logs for errors
- [ ] Set up custom domain (optional)

---

## 📊 Architecture Comparison

### Before (Vercel + SQLite):
```
┌─────────────┐
│   Vercel    │
│  (Next.js)  │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│   SQLite    │
│  (Local DB) │
└─────────────┘
```

### After (Railway + PostgreSQL + Redis):
```
┌─────────────┐
│  Railway    │
│  (Next.js)  │
└───┬─────┬───┘
    │     │
    ▼     ▼
┌─────────┐  ┌─────────┐
│PostgreSQL│  │  Redis  │
│         │  │ (Cache)  │
└─────────┘  └─────────┘
```

---

## 🎯 Key Benefits

1. **PostgreSQL**: Production-ready database with better performance and features
2. **Redis**: Fast caching reduces blockchain RPC calls and improves response times
3. **Railway**: Easy deployment, automatic scaling, built-in monitoring
4. **Same Structure**: Matches FruitNinja project architecture
5. **Graceful Fallbacks**: App works even if Redis is unavailable

---

## ⚠️ Important Notes

### Database Migration:
- **Local Development**: You'll need PostgreSQL running locally
- **Production**: Railway provides PostgreSQL automatically
- **Data Migration**: If you have existing SQLite data, you'll need to export/import it

### Redis:
- **Optional**: App works without Redis (falls back gracefully)
- **Performance**: Redis significantly improves response times for NFT queries
- **Railway**: Automatically provisions Redis when you add the plugin

### Environment Variables:
- **DATABASE_URL**: Auto-set by Railway (don't set manually)
- **REDIS_URL**: Auto-set by Railway (don't set manually)
- **NEXT_PUBLIC_***: Must be set manually (exposed to browser)

---

## 🔍 Testing Locally

Before deploying to Railway, test locally:

1. **Install PostgreSQL locally** (or use Docker)
2. **Install Redis locally** (or use Docker)
3. **Update `.env`**:
   ```env
   DATABASE_URL="postgresql://user:pass@localhost:5432/collectevm"
   REDIS_URL="redis://localhost:6379"
   NODE_ENV="development"
   ```
4. **Run migrations**:
   ```bash
   npx prisma generate
   npx prisma db push
   ```
5. **Start dev server**:
   ```bash
   npm run dev
   ```
6. **Test health endpoint**: http://localhost:3000/api/health

---

## 📚 Next Steps

1. **Review** `RAILWAY_DEPLOYMENT.md` for detailed deployment instructions
2. **Test locally** with PostgreSQL and Redis
3. **Deploy to Railway** following the guide
4. **Monitor** your app using Railway's dashboard
5. **Optimize** caching TTLs based on usage patterns

---

## 🆘 Troubleshooting

See `RAILWAY_DEPLOYMENT.md` for detailed troubleshooting guide.

**Common Issues:**
- Database connection errors → Check PostgreSQL plugin is added
- Redis unavailable → Check Redis plugin is added
- Build failures → Check Railway logs for specific errors
- Missing env vars → Verify all required variables are set

---

**✅ Migration Complete!** Your CollectEVM project is now ready for Railway deployment with PostgreSQL and Redis, matching the FruitNinja project structure.

