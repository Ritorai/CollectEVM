# Setup Checklist for New Collaborators

Use this checklist to get your development environment set up quickly!

## ✅ Prerequisites

- [ ] Node.js 18+ installed ([Download](https://nodejs.org/))
- [ ] PostgreSQL installed and running ([Download](https://www.postgresql.org/download/))
- [ ] Phantom wallet extension ([Install](https://phantom.app/))
- [ ] MetaMask wallet extension (optional) ([Install](https://metamask.io/))
- [ ] Git installed ([Download](https://git-scm.com/))

## ✅ Initial Setup

### 1. Clone & Install
```bash
# Clone the repository
git clone <your-repo-url>
cd CollectEVM

# Install dependencies
npm install
```

### 2. Environment Variables
```bash
# Copy the example file
cp env.example .env
```

Then edit `.env` with your text editor and fill in:

**Required:**
- [ ] `DATABASE_URL` - Your PostgreSQL connection string
- [ ] `WASSIEVERSE_COLLECTION_ADDRESS` - Already set to: `EwxYgrffpuTuNa4C1b4xxrEkRbZAQgMG5fAiY3uJVZoH`
- [ ] `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` - Get from [WalletConnect Cloud](https://cloud.walletconnect.com)

**Optional (but recommended):**
- [ ] `HELIUS_API_KEY` - Get free key at [Helius](https://helius.dev) for faster NFT queries
- [ ] `SOLANA_RPC_URL` - Use Helius/QuickNode RPC for better performance

### 3. Database Setup
```bash
# Generate Prisma client
npx prisma generate

# Create database tables
npx prisma db push

# Verify it worked (optional)
npx prisma studio
```

### 4. Start Development Server
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## ✅ Verify Everything Works

- [ ] App loads at localhost:3000
- [ ] "Connect Solana Wallet" button appears
- [ ] Phantom wallet connection works
- [ ] NFTs display after connecting (if wallet has Wassieverse NFTs)
- [ ] Console shows no errors

## 🎯 Common Issues

### Port 3000 is already in use
```bash
# Windows
taskkill /F /IM node.exe

# Mac/Linux
killall node
```

### Database connection fails
- Make sure PostgreSQL is running
- Check your `DATABASE_URL` in `.env`
- Try connecting with: `npx prisma studio`

### Prisma errors
```bash
# Regenerate client
npx prisma generate

# Push schema again
npx prisma db push
```

### No NFTs showing
- Make sure the connected wallet actually has Wassieverse NFTs
- Check browser console for errors
- Verify `WASSIEVERSE_COLLECTION_ADDRESS` in `.env`

## 📚 Next Steps

Once everything is working:

1. Read [CONTRIBUTING_GUIDE.md](CONTRIBUTING_GUIDE.md) for development workflow
2. Check [README.md](README.md) for full documentation
3. Look at [PROJECT_STRUCTURE.md](PROJECT_STRUCTURE.md) to understand the codebase
4. Review `.cursorrules` for code style guidelines

## 🤝 Need Help?

- Check existing GitHub Issues
- Read the documentation files
- Create a new Issue with:
  - What you were trying to do
  - What happened instead
  - Error messages (with screenshots if helpful)
  - Your environment (Windows/Mac/Linux, Node version)

## 🎉 You're Ready!

If all checkboxes are checked, you're ready to start contributing! 

**Quick commands reference:**
```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run lint         # Check code style
npx prisma studio    # View database in browser
git pull            # Get latest changes
git status          # Check what you've changed
```

Happy coding! 🚀

