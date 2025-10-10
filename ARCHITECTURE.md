# Architecture Overview

## System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                           User Browser                               │
├─────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  ┌──────────────────┐              ┌──────────────────┐            │
│  │  Phantom Wallet  │              │  MetaMask Wallet │            │
│  │   (Solana)       │              │   (EVM)          │            │
│  └────────┬─────────┘              └────────┬─────────┘            │
│           │                                  │                       │
│           │  Sign Messages                   │  Sign Messages       │
│           │                                  │                       │
│  ┌────────▼──────────────────────────────────▼─────────────────┐   │
│  │              Next.js Frontend (React 19)                     │   │
│  │  ┌────────────────┐  ┌──────────────┐  ┌──────────────┐   │   │
│  │  │   Solana       │  │     EVM      │  │     NFT      │   │   │
│  │  │   Connector    │  │  Connector   │  │   Display    │   │   │
│  │  └────────────────┘  └──────────────┘  └──────────────┘   │   │
│  └──────────────────────────────────────────────────────────────┘   │
└───────────────────────────┬──────────────────────────────────────────┘
                            │
                            │ HTTPS Requests
                            │
┌───────────────────────────▼──────────────────────────────────────────┐
│                     Next.js Backend (API Routes)                      │
├───────────────────────────────────────────────────────────────────────┤
│                                                                        │
│  ┌────────────────┐   ┌─────────────────┐   ┌───────────────────┐  │
│  │  POST /nonce   │   │ POST /verify-   │   │ POST /link-evm    │  │
│  │                │   │  solana         │   │                   │  │
│  │ Generate nonce │   │ Verify Solana   │   │ Link EVM wallet   │  │
│  │ Store in DB    │   │ Check NFTs      │   │ Save to DB        │  │
│  └────────────────┘   └─────────────────┘   └───────────────────┘  │
│                                                                        │
│  ┌────────────────────────────────────────────────────────────────┐  │
│  │                    Prisma ORM Layer                            │  │
│  └────────────────────────────────────────────────────────────────┘  │
└───────────┬────────────────────────────┬───────────────────────────────┘
            │                            │
            │ SQL Queries                │ RPC Calls
            │                            │
┌───────────▼────────────┐   ┌───────────▼──────────────┐
│   PostgreSQL Database  │   │  Solana Blockchain RPC   │
├────────────────────────┤   ├──────────────────────────┤
│                        │   │                          │
│ ┌────────────────┐    │   │  Query token accounts    │
│ │ Nonce Table    │    │   │  Fetch NFT metadata      │
│ │ - nonce        │    │   │  Verify collection       │
│ │ - address      │    │   │                          │
│ │ - expiry       │    │   │  (Helius/QuickNode)     │
│ └────────────────┘    │   └──────────────────────────┘
│                        │
│ ┌────────────────┐    │
│ │ WalletLink     │    │
│ │ - solAddress   │    │
│ │ - evmAddress   │    │
│ │ - tokenIds[]   │    │
│ │ - signatures   │    │
│ └────────────────┘    │
└────────────────────────┘
```

## Request Flow Diagrams

### 1. Solana Wallet Verification Flow

```
User                Frontend              API Routes           Database         Solana RPC
 │                     │                      │                   │                 │
 │   Connect Wallet    │                      │                   │                 │
 ├────────────────────>│                      │                   │                 │
 │                     │                      │                   │                 │
 │  Click "Verify"     │                      │                   │                 │
 ├────────────────────>│                      │                   │                 │
 │                     │   POST /api/nonce    │                   │                 │
 │                     ├─────────────────────>│                   │                 │
 │                     │                      │  Store nonce      │                 │
 │                     │                      ├──────────────────>│                 │
 │                     │    { nonce }         │                   │                 │
 │                     │<─────────────────────┤                   │                 │
 │                     │                      │                   │                 │
 │  Sign Message       │                      │                   │                 │
 │<────────────────────┤                      │                   │                 │
 │                     │                      │                   │                 │
 │   { signature }     │                      │                   │                 │
 ├────────────────────>│                      │                   │                 │
 │                     │ POST /verify-solana  │                   │                 │
 │                     ├─────────────────────>│                   │                 │
 │                     │                      │  Verify nonce     │                 │
 │                     │                      ├──────────────────>│                 │
 │                     │                      │                   │                 │
 │                     │                      │  Mark nonce used  │                 │
 │                     │                      ├──────────────────>│                 │
 │                     │                      │                   │                 │
 │                     │                      │    Query NFTs                      │
 │                     │                      ├────────────────────────────────────>│
 │                     │                      │     { tokenIds }                    │
 │                     │                      │<────────────────────────────────────┤
 │                     │  { verified, tokens} │                   │                 │
 │                     │<─────────────────────┤                   │                 │
 │                     │                      │                   │                 │
 │  Show NFTs          │                      │                   │                 │
 │<────────────────────┤                      │                   │                 │
```

### 2. EVM Wallet Linking Flow

```
User                Frontend              API Routes           Database         Solana RPC
 │                     │                      │                   │                 │
 │   Connect EVM       │                      │                   │                 │
 ├────────────────────>│                      │                   │                 │
 │                     │                      │                   │                 │
 │  Click "Link"       │                      │                   │                 │
 ├────────────────────>│                      │                   │                 │
 │                     │   POST /api/nonce    │                   │                 │
 │                     ├─────────────────────>│                   │                 │
 │                     │                      │  Store nonce      │                 │
 │                     │                      ├──────────────────>│                 │
 │                     │    { nonce }         │                   │                 │
 │                     │<─────────────────────┤                   │                 │
 │                     │                      │                   │                 │
 │  Sign Message       │                      │                   │                 │
 │<────────────────────┤                      │                   │                 │
 │                     │                      │                   │                 │
 │   { signature }     │                      │                   │                 │
 ├────────────────────>│                      │                   │                 │
 │                     │  POST /link-evm      │                   │                 │
 │                     ├─────────────────────>│                   │                 │
 │                     │                      │  Verify nonce     │                 │
 │                     │                      ├──────────────────>│                 │
 │                     │                      │                   │                 │
 │                     │                      │   Re-verify NFTs                   │
 │                     │                      ├────────────────────────────────────>│
 │                     │                      │     { tokenIds }                    │
 │                     │                      │<────────────────────────────────────┤
 │                     │                      │                   │                 │
 │                     │                      │  Save wallet link │                 │
 │                     │                      ├──────────────────>│                 │
 │                     │    { success }       │                   │                 │
 │                     │<─────────────────────┤                   │                 │
 │                     │                      │                   │                 │
 │  Show Success       │                      │                   │                 │
 │<────────────────────┤                      │                   │                 │
```

## Component Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         app/layout.tsx                          │
│                      (Root Layout + Providers)                  │
└──────────────────────────────┬──────────────────────────────────┘
                               │
┌──────────────────────────────▼──────────────────────────────────┐
│                         app/page.tsx                            │
│                         (Main Page)                             │
└─────┬───────────────────────────────────────────────────┬───────┘
      │                                                     │
┌─────▼────────────────────────┐      ┌──────────────────▼────────────┐
│ SolanaWalletConnector.tsx    │      │  EVMWalletConnector.tsx       │
│                              │      │                               │
│ - Connect Phantom            │      │  - Connect MetaMask           │
│ - Sign message               │      │  - Sign message               │
│ - Verify NFTs                │      │  - Link wallets               │
│                              │      │                               │
│ Uses:                        │      │  Uses:                        │
│ - useWallet()                │      │  - useAccount()               │
│ - useToast()                 │      │  - useSignMessage()           │
│ - fetch(/api/nonce)          │      │  - fetch(/api/link-evm)       │
│ - fetch(/api/verify-solana)  │      │                               │
└──────────────────────────────┘      └───────────────────────────────┘
                               │
                 ┌─────────────▼─────────────┐
                 │    NFTDisplay.tsx         │
                 │                           │
                 │ - Show wallet addresses   │
                 │ - Display NFT list        │
                 │ - Links to explorers      │
                 └───────────────────────────┘
```

## Data Models

```
┌──────────────────────────────────────────────────────────────────┐
│                           Nonce Model                            │
├──────────────────────────────────────────────────────────────────┤
│ id: string (cuid)                                                │
│ nonce: string (unique) ────────────► Used for signature message │
│ address: string ───────────────────► Wallet that requested it   │
│ used: boolean ─────────────────────► Prevent reuse              │
│ createdAt: DateTime ───────────────► Audit trail                │
│ expiresAt: DateTime ───────────────► Auto-expire after 5 min    │
│                                                                   │
│ Indexes:                                                          │
│ - nonce (unique)                                                  │
│ - address                                                         │
└──────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────┐
│                        WalletLink Model                          │
├──────────────────────────────────────────────────────────────────┤
│ id: string (cuid)                                                │
│ solanaAddress: string ─────────────► Verified Solana wallet     │
│ evmAddress: string ────────────────► Linked EVM wallet          │
│ tokenIds: string[] ────────────────► NFT mint addresses         │
│ solanaSignature: string ───────────► Proof of Solana ownership  │
│ evmSignature: string ──────────────► Proof of EVM ownership     │
│ verifiedAt: DateTime ──────────────► When link was created      │
│ updatedAt: DateTime ───────────────► Last update                │
│                                                                   │
│ Unique Constraint:                                                │
│ - (solanaAddress, evmAddress)                                     │
│                                                                   │
│ Indexes:                                                          │
│ - solanaAddress                                                   │
│ - evmAddress                                                      │
└──────────────────────────────────────────────────────────────────┘
```

## Security Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                      Security Layers                             │
├──────────────────────────────────────────────────────────────────┤
│                                                                   │
│  Layer 1: Nonce System                                           │
│  ├─ Cryptographically secure random generation                   │
│  ├─ Time-limited (5 minutes)                                     │
│  ├─ Single-use enforcement                                       │
│  └─ Address-bound                                                │
│                                                                   │
│  Layer 2: Signature Verification                                 │
│  ├─ Solana: ed25519 with tweetnacl                              │
│  ├─ EVM: ECDSA with ethers.js                                   │
│  ├─ Message format validation                                    │
│  └─ Server-side only                                             │
│                                                                   │
│  Layer 3: Blockchain Verification                                │
│  ├─ Direct RPC queries                                           │
│  ├─ Collection verification                                      │
│  ├─ Metadata validation                                          │
│  └─ Client data never trusted                                    │
│                                                                   │
│  Layer 4: Database Security                                      │
│  ├─ Prisma ORM (SQL injection prevention)                        │
│  ├─ Unique constraints                                           │
│  ├─ Indexed queries                                              │
│  └─ Connection pooling                                           │
│                                                                   │
└──────────────────────────────────────────────────────────────────┘
```

## Deployment Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Production Setup                          │
└─────────────────────────────────────────────────────────────────┘

                    ┌─────────────────┐
                    │   Users/Web     │
                    └────────┬────────┘
                             │
                             │ HTTPS
                             │
                    ┌────────▼────────┐
                    │   Vercel CDN    │
                    │   (Edge Network)│
                    └────────┬────────┘
                             │
         ┌───────────────────┼───────────────────┐
         │                   │                   │
┌────────▼────────┐ ┌────────▼────────┐ ┌───────▼────────┐
│  Static Assets  │ │  Next.js App    │ │  API Routes    │
│  (Cached)       │ │  (SSR/SSG)      │ │  (Serverless)  │
└─────────────────┘ └─────────────────┘ └───────┬────────┘
                                                 │
                             ┌───────────────────┼────────────────┐
                             │                   │                │
                    ┌────────▼────────┐ ┌────────▼────────┐ ┌────▼────────┐
                    │   PostgreSQL    │ │  Solana RPC     │ │   Helius    │
                    │   (Neon/       │ │  (Helius/       │ │   API       │
                    │    Supabase)    │ │   QuickNode)    │ │             │
                    └─────────────────┘ └─────────────────┘ └─────────────┘
```

## Technology Stack Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        Frontend Layer                            │
├─────────────────────────────────────────────────────────────────┤
│  React 19 │ Next.js 15 │ TypeScript │ TailwindCSS │ shadcn/ui │
└──────────────────────────┬──────────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────────┐
│                     Wallet Integration                           │
├─────────────────────────────────────────────────────────────────┤
│        Solana Wallet Adapter        │        wagmi + viem       │
│        (Phantom, Solflare)          │    (MetaMask, WalletConnect)│
└──────────────────────────┬──────────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────────┐
│                      Backend Layer                               │
├─────────────────────────────────────────────────────────────────┤
│   Next.js API Routes │ Prisma ORM │ PostgreSQL │ Node.js       │
└──────────────────────────┬──────────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────────┐
│                    Blockchain Layer                              │
├─────────────────────────────────────────────────────────────────┤
│  @solana/web3.js │ Metaplex │ ethers.js │ tweetnacl │ bs58     │
└─────────────────────────────────────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────────┐
│                  External Services                               │
├─────────────────────────────────────────────────────────────────┤
│  Solana RPC │ Helius API │ QuickNode │ WalletConnect Cloud     │
└─────────────────────────────────────────────────────────────────┘
```

## Scalability Considerations

```
Current Architecture:
- Single database instance
- Direct RPC calls
- No caching layer

For Scale:
┌────────────────────────────────────────────────────────┐
│  Add Redis Cache for NFT queries                       │
│  Add Rate Limiting (upstash/redis)                     │
│  Add Database Read Replicas                            │
│  Add CDN for static assets                             │
│  Add Error Tracking (Sentry)                           │
│  Add Analytics (Vercel Analytics)                      │
│  Add Queue System for blockchain queries (Bull)        │
└────────────────────────────────────────────────────────┘
```

This architecture provides a solid foundation that's both secure and scalable!

