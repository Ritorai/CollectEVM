# Project Structure

```
CollectEVM/
├── app/                          # Next.js 15 App Router
│   ├── api/                      # API Routes
│   │   ├── nonce/
│   │   │   └── route.ts         # Generate nonces for signatures
│   │   ├── verify-solana/
│   │   │   └── route.ts         # Verify Solana wallet & NFTs
│   │   └── link-evm/
│   │       └── route.ts         # Link EVM wallet to Solana
│   ├── layout.tsx               # Root layout with providers
│   ├── page.tsx                 # Main landing page
│   ├── globals.css              # Global styles & Tailwind
│   └── providers.tsx            # Wallet & Query providers
│
├── components/                   # React Components
│   ├── ui/                      # shadcn/ui components
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   ├── toast.tsx
│   │   └── toaster.tsx
│   ├── SolanaWalletConnector.tsx  # Step 1: Solana connection
│   ├── EVMWalletConnector.tsx     # Step 2: EVM connection
│   └── NFTDisplay.tsx             # Display linked NFTs
│
├── lib/                          # Utility Libraries
│   ├── prisma.ts                # Prisma client singleton
│   ├── solana.ts                # Solana NFT verification logic
│   ├── wagmi.ts                 # Wagmi (EVM) configuration
│   ├── utils.ts                 # General utilities (cn, etc.)
│   ├── constants.ts             # App constants
│   └── errors.ts                # Custom error classes
│
├── hooks/                        # Custom React Hooks
│   └── use-toast.ts             # Toast notification hook
│
├── prisma/                       # Database
│   └── schema.prisma            # Database schema definition
│
├── scripts/                      # Setup Scripts
│   ├── setup-db.sh              # Unix database setup
│   └── setup-db.ps1             # Windows database setup
│
├── types/                        # TypeScript Definitions
│   └── global.d.ts              # Global type declarations
│
├── .cursorrules                  # Cursor AI rules
├── .eslintrc.json               # ESLint configuration
├── .gitignore                   # Git ignore rules
├── DEPLOYMENT.md                # Deployment guide
├── env.example                  # Environment variables template
├── next.config.ts               # Next.js configuration
├── package.json                 # Dependencies & scripts
├── postcss.config.mjs           # PostCSS configuration
├── PROJECT_STRUCTURE.md         # This file
├── README.md                    # Main documentation
├── SETUP.md                     # Quick setup guide
├── tailwind.config.ts           # Tailwind CSS configuration
└── tsconfig.json                # TypeScript configuration
```

## Architecture Overview

### Frontend Flow

```
User
  ↓
[Browser with Phantom + MetaMask]
  ↓
[Next.js Frontend Components]
  ├── SolanaWalletConnector
  │     ↓
  │   Request nonce → Sign message → Verify NFTs
  │
  └── EVMWalletConnector
        ↓
      Request nonce → Sign message → Link wallets
```

### Backend Flow

```
API Routes
  ↓
[/api/nonce]
  → Generate secure random nonce
  → Store in database with expiration
  → Return to client
  ↓
[/api/verify-solana]
  → Validate nonce
  → Verify Solana signature
  → Query blockchain for NFTs
  → Filter Wassieverse collection
  → Return NFT token IDs
  ↓
[/api/link-evm]
  → Validate nonce
  → Verify EVM signature
  → Re-verify NFT ownership
  → Store wallet link in database
  → Return success
```

### Database Schema

```
┌─────────────┐          ┌──────────────┐
│   Nonce     │          │  WalletLink  │
├─────────────┤          ├──────────────┤
│ id          │          │ id           │
│ nonce       │          │ solanaAddress│
│ address     │          │ evmAddress   │
│ used        │          │ tokenIds[]   │
│ createdAt   │          │ solanaSignature│
│ expiresAt   │          │ evmSignature │
└─────────────┘          │ verifiedAt   │
                         │ updatedAt    │
                         └──────────────┘
```

## Key Technologies

### Frontend
- **Next.js 15**: React framework with App Router
- **React 19**: Latest React features
- **TypeScript**: Type safety
- **TailwindCSS**: Utility-first CSS
- **shadcn/ui**: Beautiful UI components
- **Solana Wallet Adapter**: Phantom integration
- **wagmi**: EVM wallet integration
- **viem**: Ethereum library
- **React Query**: Server state management

### Backend
- **Next.js API Routes**: Serverless functions
- **Prisma**: Type-safe database ORM
- **PostgreSQL**: Relational database
- **@solana/web3.js**: Solana blockchain interaction
- **ethers.js**: EVM signature verification
- **tweetnacl**: Solana signature verification
- **bs58**: Base58 encoding/decoding

## Component Details

### SolanaWalletConnector
**Purpose**: Handle Solana wallet connection and NFT verification

**State**:
- `isVerifying`: Loading state
- `isVerified`: Verification success
- `nftCount`: Number of NFTs found

**Flow**:
1. User connects Phantom wallet
2. Request nonce from API
3. Sign message with wallet
4. Send to `/api/verify-solana`
5. Display NFT count on success
6. Emit `onVerified` event with data

### EVMWalletConnector
**Purpose**: Handle EVM wallet connection and linking

**State**:
- `isLinking`: Loading state
- `isLinked`: Link success

**Props**:
- `solanaData`: Data from Solana verification
- `onLinked`: Callback when linking succeeds

**Flow**:
1. User connects MetaMask/WalletConnect
2. Request new nonce
3. Sign linking message
4. Send to `/api/link-evm`
5. Display success message
6. Emit `onLinked` event with data

### NFTDisplay
**Purpose**: Show linked wallet information and NFTs

**Props**:
- `linkedData`: Complete link information

**Features**:
- Display both wallet addresses
- Show all NFT mint addresses
- Links to blockchain explorers
- Verification timestamp

## API Endpoints

### POST /api/nonce
**Purpose**: Generate secure nonce for signing

**Input**:
```typescript
{
  address: string;  // Wallet address
}
```

**Output**:
```typescript
{
  nonce: string;    // Random hex string
}
```

**Security**:
- Cryptographically secure random
- Stored with expiration (5 min)
- One-time use

### POST /api/verify-solana
**Purpose**: Verify Solana signature and check NFTs

**Input**:
```typescript
{
  solAddress: string;
  signature: string;   // Base58 encoded
  message: string;     // Signed message
  nonce: string;       // From /api/nonce
}
```

**Output**:
```typescript
{
  verified: boolean;
  tokenIds: string[];
  message: string;
}
```

**Process**:
1. Verify nonce exists and not used
2. Verify signature with tweetnacl
3. Mark nonce as used
4. Query Solana for token accounts
5. Filter NFTs (decimals=0, amount=1)
6. Check collection metadata
7. Return verified NFT mints

### POST /api/link-evm
**Purpose**: Verify EVM signature and save link

**Input**:
```typescript
{
  solanaAddress: string;
  evmAddress: string;
  evmSignature: string;
  message: string;
  nonce: string;
  solanaSignature: string;
}
```

**Output**:
```typescript
{
  success: boolean;
  message: string;
  data: {
    solanaAddress: string;
    evmAddress: string;
    tokenIds: string[];
    verifiedAt: string;
  }
}
```

**Process**:
1. Verify nonce
2. Verify EVM signature with ethers
3. Re-verify Solana NFT ownership
4. Upsert wallet link in database
5. Return complete link data

## Security Features

### Nonce System
- Prevents replay attacks
- Time-limited (5 minutes)
- Single-use only
- Cryptographically random

### Signature Verification
- All signatures verified server-side
- Client data never trusted
- Uses standard crypto libraries

### On-Chain Verification
- NFT ownership checked directly on Solana
- Collection verification required
- No client-side data trusted

### Database Security
- Unique constraints on wallet pairs
- Indexed for performance
- Connection pooling
- Parameterized queries (Prisma)

## Performance Considerations

### RPC Calls
- Use dedicated Solana RPC (Helius/QuickNode)
- Consider caching NFT results
- Implement rate limiting if needed

### Database
- Indexes on frequently queried fields
- Connection pooling via Prisma
- Consider read replicas for scale

### Frontend
- React Query for caching
- Optimistic updates
- Code splitting via Next.js
- Image optimization

## Extension Points

### Add New Features
1. **Multiple Collections**: Extend `lib/solana.ts` to check multiple collections
2. **NFT Images**: Fetch and display metadata JSON
3. **Wallet Unlinking**: Add delete API route
4. **Admin Dashboard**: Create `/admin` route
5. **Analytics**: Add tracking events
6. **Email Notifications**: Integrate email service

### Customize UI
1. Update `app/globals.css` for colors
2. Modify shadcn components in `components/ui/`
3. Add new pages in `app/` directory
4. Create reusable components in `components/`

### Alternative NFT Verification
1. Use Helius DAS API (faster)
2. Cache NFT queries in Redis
3. Webhook for real-time updates
4. Support SPL token gating

## Testing Strategy

### Unit Tests (Recommended)
- Test API routes with mock database
- Test Solana signature verification
- Test EVM signature verification
- Test NFT filtering logic

### Integration Tests (Recommended)
- Test full user flow
- Test database operations
- Test RPC interactions

### E2E Tests (Optional)
- Playwright for browser testing
- Test wallet connections
- Test signing flows

## Deployment Checklist

- [ ] Environment variables configured
- [ ] Database migrations run
- [ ] RPC provider configured
- [ ] Collection address updated
- [ ] Build succeeds
- [ ] All endpoints tested
- [ ] Error tracking setup
- [ ] Monitoring configured
- [ ] Backups enabled
- [ ] Domain configured
- [ ] SSL certificate active
- [ ] CORS configured if needed

