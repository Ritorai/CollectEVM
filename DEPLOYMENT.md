# Deployment Guide

This guide covers deploying the Wassieverse NFT Wallet Linker to production.

## Deployment Options

### 1. Vercel (Recommended)

Vercel is the easiest way to deploy Next.js applications.

#### Prerequisites
- GitHub repository with your code
- Vercel account
- PostgreSQL database (Vercel Postgres, Neon, Supabase, or Railway)

#### Steps

1. **Push code to GitHub**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin <your-github-repo-url>
   git push -u origin main
   ```

2. **Import to Vercel**
   - Go to https://vercel.com
   - Click "Add New Project"
   - Import your GitHub repository
   - Vercel will auto-detect Next.js

3. **Configure Environment Variables**
   Add all variables from `env.example`:
   - `DATABASE_URL`
   - `SOLANA_RPC_URL`
   - `WASSIEVERSE_COLLECTION_ADDRESS`
   - `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID`
   - `NEXT_PUBLIC_SOLANA_RPC_URL`

4. **Deploy**
   - Click "Deploy"
   - Vercel will build and deploy automatically

5. **Setup Database**
   After first deploy, run migrations:
   ```bash
   # Install Vercel CLI
   npm i -g vercel

   # Login
   vercel login

   # Run migrations
   vercel env pull .env.local
   npx prisma db push
   ```

#### Vercel Postgres

Vercel offers a managed Postgres database:
1. In your Vercel project, go to "Storage"
2. Create a new Postgres database
3. Copy the connection string
4. Add as `DATABASE_URL` environment variable

### 2. Railway

Railway provides both hosting and PostgreSQL in one platform.

#### Steps

1. **Create Railway Account**
   - Go to https://railway.app
   - Sign up with GitHub

2. **Create New Project**
   - Click "New Project"
   - Choose "Deploy from GitHub repo"
   - Select your repository

3. **Add PostgreSQL**
   - In your project, click "New"
   - Select "Database" → "PostgreSQL"
   - Railway will create a database

4. **Configure Environment Variables**
   - Click on your service
   - Go to "Variables" tab
   - Add all environment variables
   - Railway automatically provides `DATABASE_URL` from your Postgres

5. **Deploy**
   - Railway will automatically deploy on push to main branch

### 3. DigitalOcean App Platform

1. **Create App**
   - Go to DigitalOcean → Apps
   - Create new app from GitHub

2. **Add Database**
   - Add a PostgreSQL database component
   - DigitalOcean will inject `DATABASE_URL`

3. **Configure**
   - Add environment variables
   - Set build command: `npm run build`
   - Set run command: `npm start`

4. **Deploy**

### 4. Self-Hosted (VPS/Docker)

#### Using Docker Compose

1. **Create docker-compose.yml**
   ```yaml
   version: '3.8'
   services:
     app:
       build: .
       ports:
         - "3000:3000"
       environment:
         - DATABASE_URL=postgresql://postgres:password@db:5432/collectevm
         - SOLANA_RPC_URL=${SOLANA_RPC_URL}
         - WASSIEVERSE_COLLECTION_ADDRESS=${WASSIEVERSE_COLLECTION_ADDRESS}
         - NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=${NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID}
       depends_on:
         - db
     
     db:
       image: postgres:15
       environment:
         - POSTGRES_PASSWORD=password
         - POSTGRES_DB=collectevm
       volumes:
         - postgres_data:/var/lib/postgresql/data
   
   volumes:
     postgres_data:
   ```

2. **Create Dockerfile**
   ```dockerfile
   FROM node:18-alpine
   
   WORKDIR /app
   
   COPY package*.json ./
   RUN npm ci
   
   COPY . .
   RUN npx prisma generate
   RUN npm run build
   
   EXPOSE 3000
   CMD ["npm", "start"]
   ```

3. **Deploy**
   ```bash
   docker-compose up -d
   ```

## Database Providers

### Neon (Recommended)
- Serverless Postgres
- Free tier available
- https://neon.tech
- Great for serverless deployments

### Supabase
- Open source alternative
- Free tier available
- https://supabase.com
- Includes auth and storage

### PlanetScale
- MySQL-compatible (requires Prisma adapter)
- Generous free tier
- https://planetscale.com

### Railway
- Simple PostgreSQL
- Free tier: $5 credit/month
- https://railway.app

## Production Checklist

### Security
- [ ] Environment variables are set securely
- [ ] Database has strong password
- [ ] API keys are not exposed in frontend code
- [ ] CORS is properly configured
- [ ] Rate limiting is implemented (optional)

### Performance
- [ ] Using dedicated Solana RPC (Helius/QuickNode)
- [ ] Database connection pooling configured
- [ ] CDN enabled for static assets
- [ ] Image optimization enabled

### Monitoring
- [ ] Error tracking setup (Sentry)
- [ ] Analytics configured (Vercel Analytics/Google Analytics)
- [ ] Uptime monitoring (UptimeRobot)
- [ ] Database backups configured

### SEO & Meta
- [ ] Meta tags configured
- [ ] Favicon added
- [ ] Social media preview images
- [ ] robots.txt configured

## Post-Deployment

### 1. Test Production
- Connect both wallets
- Verify NFT ownership
- Link wallets
- Check database entries

### 2. Monitor
- Watch error logs
- Check database performance
- Monitor RPC usage

### 3. Optimize
- Add caching if needed
- Implement rate limiting
- Optimize database queries

## Updating Production

### Vercel
```bash
git push origin main
# Automatic deployment
```

### Railway
```bash
git push origin main
# Automatic deployment
```

### Docker
```bash
git pull
docker-compose down
docker-compose up -d --build
```

## Rollback

### Vercel
- Go to Deployments
- Find previous successful deployment
- Click "..." → "Promote to Production"

### Railway
- Go to Deployments
- Select previous deployment
- Click "Redeploy"

## Environment Variables Reference

### Required
- `DATABASE_URL` - PostgreSQL connection string
- `WASSIEVERSE_COLLECTION_ADDRESS` - NFT collection address
- `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` - WalletConnect project ID

### Recommended
- `SOLANA_RPC_URL` - Dedicated Solana RPC endpoint
- `NEXT_PUBLIC_SOLANA_RPC_URL` - Public Solana RPC endpoint

### Optional
- `HELIUS_API_KEY` - Helius API key for faster NFT queries
- `SENTRY_DSN` - Error tracking
- `NEXT_PUBLIC_GA_ID` - Google Analytics

## Troubleshooting

### Build Fails
- Check all environment variables are set
- Ensure PostgreSQL is accessible
- Review build logs

### Database Connection Issues
- Verify `DATABASE_URL` format
- Check database is running
- Ensure IP whitelist includes deployment platform

### Slow RPC Responses
- Upgrade to paid Solana RPC provider
- Implement caching
- Use Helius DAS API

### Memory Issues
- Increase deployment instance size
- Optimize database queries
- Add connection pooling

## Support

For deployment issues:
1. Check deployment platform logs
2. Review error messages
3. Consult platform documentation
4. Open GitHub issue if needed

