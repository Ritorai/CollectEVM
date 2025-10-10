# Quick Start Guide

Get up and running in 5 minutes!

## Prerequisites

- [Node.js 18+](https://nodejs.org/) installed
- [PostgreSQL](https://www.postgresql.org/) running locally
- [Phantom Wallet](https://phantom.app/) browser extension
- [MetaMask](https://metamask.io/) browser extension

## Installation

### 1. Install Dependencies
```bash
npm install
```

### 2. Set Up Environment
```bash
# Copy environment template
cp env.example .env
```

Edit `.env` and add:
```env
DATABASE_URL="postgresql://postgres:password@localhost:5432/collectevm"
WASSIEVERSE_COLLECTION_ADDRESS="YOUR_COLLECTION_ADDRESS"
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID="YOUR_PROJECT_ID"
```

**Get WalletConnect Project ID:**
1. Go to https://cloud.walletconnect.com
2. Sign up and create a project
3. Copy the Project ID

### 3. Set Up Database

**Linux/Mac:**
```bash
chmod +x scripts/setup-db.sh
./scripts/setup-db.sh
```

**Windows:**
```powershell
.\scripts\setup-db.ps1
```

**Or manually:**
```bash
npx prisma generate
npx prisma db push
```

### 4. Run Development Server
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## First Time Setup

### Testing with Your Own NFTs

If you don't have Wassieverse NFTs, you can use any Metaplex collection:

**Method 1: Using the Collection Finder Script**
```bash
# 1. Edit scripts/find-collection.js
# 2. Update the mintAddress with any NFT from your collection
# 3. Run the script
node scripts/find-collection.js

# 4. Copy the collection address to .env
# WASSIEVERSE_COLLECTION_ADDRESS="the_address_from_script"
```

**Method 2: Manual Lookup**
1. Go to [Solscan.io](https://solscan.io)
2. Look up any NFT from the collection
3. Find the "Collection" field in the metadata
4. Update `WASSIEVERSE_COLLECTION_ADDRESS` in `.env`

**Important**: This must be the **Collection NFT address** (the parent NFT), not a creator address.

📚 For details on how collection verification works, see `docs/METAPLEX_COLLECTION_VERIFICATION.md`

### Test the Flow

1. **Connect Phantom**
   - Click "Connect Solana Wallet"
   - Approve in Phantom

2. **Verify NFTs**
   - Click "Verify NFT Ownership"
   - Sign the message
   - See your NFTs listed

3. **Connect MetaMask**
   - Click "Connect EVM Wallet"
   - Approve in MetaMask

4. **Link Wallets**
   - Click "Link Wallets"
   - Sign the message
   - Done! ✅

## Common Issues

### "Database connection failed"
```bash
# Check if PostgreSQL is running
# Mac:
brew services start postgresql

# Linux:
sudo service postgresql start

# Windows: Use Services app to start PostgreSQL
```

### "No NFTs found"
- Make sure you updated `WASSIEVERSE_COLLECTION_ADDRESS`
- Verify your wallet actually has NFTs from that collection
- Check the collection address is correct on Solscan

### "Module not found"
```bash
# Delete node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

## What's Next?

- Read [SETUP.md](./SETUP.md) for detailed setup
- Check [README.md](./README.md) for full documentation
- See [DEPLOYMENT.md](./DEPLOYMENT.md) for production deployment
- Review [PROJECT_STRUCTURE.md](./PROJECT_STRUCTURE.md) to understand the code

## Need Help?

1. Check [README.md](./README.md) troubleshooting section
2. Review error messages in terminal
3. Open an issue on GitHub

## Development Commands

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Run linter
npm run lint

# View database
npx prisma studio

# Reset database
npx prisma db push --force-reset
```

## File Structure

```
CollectEVM/
├── app/              # Next.js pages and API routes
├── components/       # React components
├── lib/              # Utilities and helpers
├── prisma/           # Database schema
└── env.example       # Environment template
```

That's it! You're ready to start developing. 🚀

