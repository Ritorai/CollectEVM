# Railway Deployment Guide for CollectEVM

This guide walks you through deploying CollectEVM to Railway with PostgreSQL and Redis, following the same structure as the FruitNinja project.

## 📋 Overview

**What we're deploying:**
- Next.js application (CollectEVM)
- PostgreSQL database (via Railway plugin)
- Redis cache (via Railway plugin)
- All services managed within Railway

**Benefits:**
- ✅ Automatic deployments from GitHub
- ✅ Built-in PostgreSQL and Redis
- ✅ Free SSL certificates
- ✅ Easy environment variable management
- ✅ Automatic scaling

---

## 🚀 Step-by-Step Deployment

### Prerequisites

- [ ] GitHub account
- [ ] Railway account (sign up at https://railway.app)
- [ ] Your CollectEVM code pushed to GitHub

---

### Step 1: Push Code to GitHub

If you haven't already:

```bash
# Initialize git (if not already done)
git init

# Add all files
git add .

# Commit
git commit -m "Prepare for Railway deployment"

# Add your GitHub remote (replace with your repo URL)
git remote add origin https://github.com/yourusername/CollectEVM.git

# Push to GitHub
git push -u origin main
```

---

### Step 2: Create Railway Project

1. **Go to Railway**: https://railway.app
2. **Sign in** with GitHub (recommended for easy repo access)
3. **Click "New Project"**
4. **Select "Deploy from GitHub repo"**
5. **Choose your CollectEVM repository**
6. Railway will automatically detect it's a Next.js project

---

### Step 3: Add PostgreSQL Database

1. In your Railway project dashboard, click **"+ New"**
2. Select **"Database"** → **"Add PostgreSQL"**
3. Railway will automatically:
   - Create a PostgreSQL instance
   - Generate a `DATABASE_URL` environment variable
   - Connect it to your app

**✅ You don't need to manually set DATABASE_URL - Railway does this automatically!**

---

### Step 4: Add Redis Cache

1. In your Railway project dashboard, click **"+ New"**
2. Select **"Database"** → **"Add Redis"**
3. Railway will automatically:
   - Create a Redis instance
   - Generate a `REDIS_URL` environment variable
   - Connect it to your app

**✅ You don't need to manually set REDIS_URL - Railway does this automatically!**

---

### Step 5: Configure Environment Variables

Go to your Railway project → **Variables** tab and add:

#### Required Variables:

```env
# Node Environment
NODE_ENV=production

# Solana Configuration
SOLANA_RPC_URL=https://api.mainnet-beta.solana.com
# Or use Helius for better performance:
# SOLANA_RPC_URL=https://rpc.helius.xyz/?api-key=YOUR_API_KEY

# Wassieverse Collection Address
WASSIEVERSE_COLLECTION_ADDRESS=EwxYgrffpuTuNa4C1b4xxrEkRbZAQgMG5fAiY3uJVZoH

# WalletConnect Project ID
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_walletconnect_project_id

# Solana RPC (public)
NEXT_PUBLIC_SOLANA_RPC_URL=https://api.mainnet-beta.solana.com
```

#### Optional Variables:

```env
# Helius API Key (for faster NFT queries)
HELIUS_API_KEY=your_helius_api_key
```

**⚠️ Important Notes:**
- `DATABASE_URL` and `REDIS_URL` are **automatically set** by Railway when you add the plugins
- **Do NOT** manually set these - Railway manages them
- All `NEXT_PUBLIC_*` variables are exposed to the browser

---

### Step 6: Configure Build Settings

Railway should auto-detect Next.js, but verify:

1. Go to your service → **Settings** → **Deploy**
2. **Build Command**: `npm run build` (should be auto-detected)
3. **Start Command**: `npm start` (should be auto-detected)
4. **Root Directory**: Leave empty (or set to `/` if needed)

---

### Step 7: Deploy!

1. Railway will automatically deploy when you:
   - Push to your GitHub repo (if connected)
   - Or click **"Deploy"** in the Railway dashboard

2. **Watch the logs** to see the build progress:
   - Click on your service
   - Go to **"Deployments"** tab
   - Click on the latest deployment
   - View **"Logs"**

3. **Expected build steps:**
   ```
   ✅ Installing dependencies
   ✅ Running: npm run build
   ✅ Prisma generate (postinstall script)
   ✅ Starting: npm start
   ```

---

### Step 8: Get Your App URL

1. After deployment completes, go to **Settings** → **Networking**
2. Railway provides a default URL like: `https://your-app-name.up.railway.app`
3. **Test your app** by visiting this URL

---

### Step 9: Set Up Custom Domain (Optional)

1. Go to **Settings** → **Networking** → **Custom Domain**
2. Enter your domain (e.g., `collectevm.yourdomain.com`)
3. Railway will show you DNS records to add:
   - **CNAME**: `your-app-name.up.railway.app`
4. Add the DNS record to your domain provider
5. Railway will automatically provision SSL certificate

---

## 🔍 Verification Steps

### 1. Check Database Connection

After deployment, check the logs for:
```
✅ Prisma Client generated
✅ Database connection successful
```

### 2. Check Redis Connection

Look for in logs:
```
✅ Redis connected successfully
```

If you see:
```
⚠️  Redis unavailable, caching disabled
```

This means Redis isn't connected yet (wait a minute and check again).

### 3. Test API Endpoints

Visit your Railway URL and test:
- `https://your-app.up.railway.app/api/nonce` (should return error without POST, but confirms route works)
- Check browser console for any errors

---

## 🐛 Troubleshooting

### Build Fails

**Error: "Prisma generate failed"**
- Check that `DATABASE_URL` is set (Railway should auto-set this)
- Check build logs for specific Prisma errors
- Try running `npx prisma generate` locally to test

**Error: "Module not found"**
- Ensure `package.json` includes all dependencies
- Check that `redis` package is installed (we added it)

### Database Connection Issues

**Error: "Can't reach database"**
- Verify PostgreSQL plugin is added
- Check that `DATABASE_URL` environment variable exists
- Wait a few minutes after adding PostgreSQL (it takes time to provision)

### Redis Connection Issues

**Error: "Redis unavailable"**
- Verify Redis plugin is added
- Check that `REDIS_URL` environment variable exists
- App will work without Redis (falls back gracefully), but caching won't work

### App Crashes on Start

**Error: "Port already in use"**
- Railway automatically sets `PORT` environment variable
- Don't manually set `PORT` in Railway
- Next.js will use `process.env.PORT` automatically

**Error: "Missing environment variables"**
- Check all required variables are set in Railway dashboard
- Ensure `NEXT_PUBLIC_*` variables are set for client-side access

---

## 📊 Monitoring

### View Logs

1. Go to your service in Railway
2. Click **"Deployments"** tab
3. Click on a deployment
4. View **"Logs"** for real-time logs

### Health Check

Create a health endpoint (optional) at `app/api/health/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isRedisAvailable } from "@/lib/redis";

export async function GET() {
  try {
    // Test database
    await prisma.$queryRaw`SELECT 1`;
    
    return NextResponse.json({
      status: "ok",
      database: "connected",
      redis: isRedisAvailable() ? "connected" : "not configured",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      {
        status: "error",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
```

Then visit: `https://your-app.up.railway.app/api/health`

---

## 🔄 Updating Your App

### Automatic Deployments

If you connected GitHub:
1. Push changes to your main branch
2. Railway automatically detects and deploys
3. Watch the deployment in Railway dashboard

### Manual Deployments

1. Go to Railway dashboard
2. Click **"Deploy"** button
3. Or trigger redeploy from **"Deployments"** tab

---

## 💰 Railway Pricing

**Free Tier:**
- $5 free credit per month
- Sufficient for small to medium apps
- PostgreSQL and Redis included

**Pro Plan ($5/month):**
- More resources
- Better performance
- Priority support

**Note:** Your app will work on the free tier, but may need Pro plan for production traffic.

---

## 🔐 Security Best Practices

1. **Never commit `.env` files** ✅ (already in `.gitignore`)
2. **Use Railway's secret management** for sensitive variables
3. **Rotate API keys** regularly
4. **Enable Railway's built-in monitoring** for suspicious activity
5. **Use HTTPS** (Railway provides this automatically)

---

## 📝 Environment Variables Reference

### Automatically Set by Railway:
- `DATABASE_URL` - PostgreSQL connection string
- `REDIS_URL` - Redis connection string
- `PORT` - Port to run the app on
- `RAILWAY_ENVIRONMENT` - Environment name

### Required (Set Manually):
- `NODE_ENV=production`
- `WASSIEVERSE_COLLECTION_ADDRESS`
- `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID`
- `SOLANA_RPC_URL`
- `NEXT_PUBLIC_SOLANA_RPC_URL`

### Optional:
- `HELIUS_API_KEY` - For faster NFT queries

---

## 🎯 Next Steps After Deployment

1. ✅ Test all wallet connection flows
2. ✅ Verify NFT verification works
3. ✅ Test EVM wallet linking
4. ✅ Set up custom domain (if desired)
5. ✅ Monitor logs for any errors
6. ✅ Set up Railway alerts (optional)

---

## 🆘 Need Help?

**Common Issues:**
- Check Railway logs first
- Verify all environment variables are set
- Ensure PostgreSQL and Redis plugins are added
- Check Railway status page: https://status.railway.app

**Railway Support:**
- Documentation: https://docs.railway.app
- Discord: https://discord.gg/railway
- Email: support@railway.app

---

## 📚 Additional Resources

- [Railway Documentation](https://docs.railway.app)
- [Next.js Deployment](https://nextjs.org/docs/deployment)
- [Prisma with PostgreSQL](https://www.prisma.io/docs/concepts/database-connectors/postgresql)
- [Redis Best Practices](https://redis.io/docs/manual/patterns/)

---

**🎉 Congratulations!** Your CollectEVM app is now deployed on Railway with PostgreSQL and Redis, just like the FruitNinja project structure!

