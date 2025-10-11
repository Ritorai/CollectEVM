# Contributing Guide for CollectEVM

This guide will help you and your collaborators get started with the project.

## 🚀 Quick Start for New Contributors

### 1. Clone the Repository

```bash
git clone <your-repo-url>
cd CollectEVM
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Set Up Environment Variables

Copy the example environment file:

```bash
# On Windows PowerShell
copy env.example .env

# On Mac/Linux
cp env.example .env
```

Then edit `.env` and add your keys:

```env
# Database
DATABASE_URL="postgresql://username:password@localhost:5432/collectevm"

# Solana Configuration
SOLANA_RPC_URL="https://api.mainnet-beta.solana.com"
HELIUS_API_KEY="your-helius-api-key-here"
WASSIEVERSE_COLLECTION_ADDRESS="EwxYgrffpuTuNa4C1b4xxrEkRbZAQgMG5fAiY3uJVZoH"

# Alchemy (for EVM)
NEXT_PUBLIC_ALCHEMY_API_KEY="your-alchemy-key"

# WalletConnect Project ID
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID="your-walletconnect-project-id"
```

### 4. Set Up the Database

Make sure PostgreSQL is running, then:

```bash
# Generate Prisma client
npx prisma generate

# Push schema to database
npx prisma db push

# Optional: Open Prisma Studio to view data
npx prisma studio
```

### 5. Run the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## 📁 Project Structure

```
CollectEVM/
├── app/                    # Next.js 13+ app directory
│   ├── api/               # API routes
│   │   ├── link-evm/      # Links Solana and EVM wallets
│   │   ├── nft-status/    # Checks NFT linking status
│   │   ├── nonce/         # Generates nonces for signatures
│   │   └── verify-solana/ # Verifies Solana NFT ownership
│   ├── page.tsx           # Main page
│   └── providers.tsx      # Wallet providers setup
├── components/            # React components
│   ├── ui/               # Reusable UI components
│   ├── EVMWalletConnector.tsx
│   ├── NFTDisplay.tsx
│   ├── NFTSelection.tsx  # NEW: Shows NFTs with linking status
│   └── SolanaWalletConnector.tsx
├── lib/                   # Utility functions
│   ├── solana.ts         # Solana/Metaplex verification logic
│   ├── prisma.ts         # Database client
│   ├── wagmi.ts          # EVM wallet configuration
│   └── constants.ts      # App constants
├── prisma/
│   └── schema.prisma     # Database schema
└── types/                # TypeScript type definitions
```

## 🔑 Key Features

### 1. **Metaplex Collection Verification**
- Uses the Metaplex Collection NFT standard
- Verifies NFTs belong to the Wassieverse collection
- Falls back from Helius API to RPC if needed

### 2. **Token ID Storage**
- Stores token IDs (e.g., "564") instead of full mint addresses
- Extracted from NFT metadata names

### 3. **Double-Link Prevention**
- NFTs can only be linked once
- Prevents the same NFT from being linked to multiple wallets

### 4. **Smart Database Updates**
- If a Solana-EVM wallet pair already exists, new NFTs are added to the existing entry
- No duplicate rows in the database

### 5. **Visual NFT Selection**
- Shows all Wassieverse NFTs in connected wallet
- Visual indicators for linked/unlinked status
- Select specific NFTs to link

## 🛠️ Development Workflow

### Working with the Database

```bash
# View data in browser
npx prisma studio

# Reset database (CAUTION: deletes all data)
npx prisma db push --force-reset

# Create a migration (for production)
npx prisma migrate dev --name description-of-change
```

### Testing

```bash
# Build the project (checks for errors)
npm run build

# Run linting
npm run lint
```

### Common Tasks

#### Adding a New API Route
1. Create a new folder in `app/api/`
2. Add a `route.ts` file with GET/POST handlers
3. Follow existing patterns for error handling

#### Adding a New Component
1. Create in `components/` directory
2. Use TypeScript with proper type definitions
3. Follow the project's code style (see `.cursorrules`)

#### Modifying the Database Schema
1. Edit `prisma/schema.prisma`
2. Run `npx prisma db push` (development)
3. Or `npx prisma migrate dev` (for version control)

## 🐛 Troubleshooting

### "EPERM: operation not permitted" (Windows)
- Stop the dev server
- Wait a few seconds
- Run `npx prisma generate` again
- Restart dev server

### "Table does not exist" errors
```bash
npx prisma db push
npx prisma generate
```

### Port 3000 already in use
```bash
# Windows
taskkill /F /IM node.exe

# Mac/Linux
killall node
```

### Database connection issues
- Make sure PostgreSQL is running
- Check your `DATABASE_URL` in `.env`
- Try connecting with Prisma Studio: `npx prisma studio`

## 📚 Important Documentation Files

- `QUICKSTART.md` - Quick setup guide
- `SETUP.md` - Detailed setup instructions
- `ARCHITECTURE.md` - System architecture overview
- `DEPLOYMENT.md` - Deployment instructions
- `COLLECTION_VERIFICATION_UPDATE.md` - Metaplex verification details

## 🔒 Security Notes

- **Never commit `.env` files** (already in `.gitignore`)
- **Never commit private keys**
- All signature verification happens server-side
- Use environment variables for all sensitive data

## 💡 Tips for Collaboration

1. **Pull before you push**: Always `git pull` before starting work
2. **Commit often**: Make small, focused commits
3. **Descriptive messages**: Write clear commit messages
4. **Test before committing**: Run `npm run build` to check for errors
5. **Ask questions**: Use GitHub Issues or discussions

## 🌐 Deployment

The project can be deployed to:
- **Vercel** (recommended for Next.js)
- **Netlify**
- Any Node.js hosting platform

See `DEPLOYMENT.md` for detailed instructions.

## 🤝 Getting Help

If you get stuck:
1. Check the documentation files
2. Search existing GitHub Issues
3. Create a new Issue with details about the problem
4. Include error messages and steps to reproduce

## 📝 Code Style

Follow the rules in `.cursorrules`:
- Use TypeScript for all files
- Use functional components with hooks
- Prefer async/await over promises
- Add comments for complex logic
- Validate input on both client and server
- Handle errors gracefully with try-catch

Happy coding! 🚀

