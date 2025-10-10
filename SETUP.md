# Quick Setup Guide

## Prerequisites Checklist

- [ ] Node.js 18+ installed
- [ ] PostgreSQL installed and running
- [ ] Phantom wallet extension installed
- [ ] MetaMask wallet extension installed (optional)
- [ ] Git installed

## Step-by-Step Setup

### 1. Clone and Install

```bash
# Clone the repository
git clone <your-repo-url>
cd CollectEVM

# Install dependencies
npm install
```

### 2. Database Setup

**Option A: Local PostgreSQL**
```bash
# Create database
createdb collectevm

# Or using psql
psql -U postgres
CREATE DATABASE collectevm;
\q
```

**Option B: Using Docker**
```bash
docker run --name collectevm-postgres \
  -e POSTGRES_PASSWORD=yourpassword \
  -e POSTGRES_DB=collectevm \
  -p 5432:5432 \
  -d postgres:15
```

### 3. Environment Configuration

```bash
# Copy the example environment file
cp env.example .env

# Edit .env with your settings
# Required:
# - DATABASE_URL
# - WASSIEVERSE_COLLECTION_ADDRESS
# - NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID
```

### 4. Get Required API Keys

#### WalletConnect Project ID (Required)
1. Go to https://cloud.walletconnect.com
2. Sign up / Sign in
3. Create a new project
4. Copy the Project ID
5. Add to `.env` as `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID`

#### Helius API Key (Recommended)
1. Go to https://helius.dev
2. Sign up for free tier
3. Create an API key
4. Add to `.env` as:
   ```
   SOLANA_RPC_URL="https://rpc.helius.xyz/?api-key=YOUR_KEY"
   NEXT_PUBLIC_SOLANA_RPC_URL="https://rpc.helius.xyz/?api-key=YOUR_KEY"
   ```

#### Wassieverse Collection Address (Required)
Find the verified collection address for Wassieverse NFTs on Solscan:
1. Go to a Wassieverse NFT page on Solscan
2. Look for "Collection" in the metadata
3. Copy the verified collection address
4. Add to `.env` as `WASSIEVERSE_COLLECTION_ADDRESS`

### 5. Initialize Database

```bash
# Generate Prisma client
npx prisma generate

# Push schema to database
npx prisma db push

# (Optional) Open Prisma Studio to view database
npx prisma studio
```

### 6. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Testing the Application

### Test Flow

1. **Connect Phantom Wallet**
   - Click "Connect Solana Wallet"
   - Approve connection in Phantom
   - Make sure you have test Wassieverse NFTs (or update the collection address to one you own for testing)

2. **Verify NFT Ownership**
   - Click "Verify NFT Ownership"
   - Sign the message in Phantom
   - Server will check blockchain for NFTs

3. **Connect MetaMask**
   - Click "Connect EVM Wallet"
   - Approve connection in MetaMask

4. **Link Wallets**
   - Click "Link Wallets"
   - Sign the message in MetaMask
   - Wallets are now linked!

### Test with Your Own NFTs

If you don't have Wassieverse NFTs, you can test with your own collection:

1. Find your collection address on Solscan
2. Update `WASSIEVERSE_COLLECTION_ADDRESS` in `.env`
3. Restart the dev server
4. Test with wallets that hold your NFTs

## Common Issues

### Database Connection Failed
```bash
# Check PostgreSQL is running
sudo service postgresql status

# Or for macOS with Homebrew
brew services list

# Test connection
psql -U postgres -d collectevm
```

### Prisma Client Not Generated
```bash
# Regenerate Prisma client
npx prisma generate
```

### Port 3000 Already in Use
```bash
# Use a different port
PORT=3001 npm run dev
```

### Wallet Not Connecting
- Make sure wallet extensions are installed and unlocked
- Try refreshing the page
- Check browser console for errors

## Development Tips

### View Database Content
```bash
npx prisma studio
```

### Reset Database
```bash
npx prisma db push --force-reset
```

### View Logs
Check terminal running `npm run dev` for server logs.

### Environment Variables
After changing `.env`, restart the dev server.

## Next Steps

1. Test the full flow with your wallets
2. Update the collection address for your specific NFT collection
3. Configure a production database for deployment
4. Deploy to Vercel or your preferred platform

## Need Help?

- Check the main [README.md](./README.md) for detailed documentation
- Review the [Troubleshooting](./README.md#troubleshooting) section
- Open an issue on GitHub

