# Wassieverse NFT Wallet Linker

A full-stack Next.js application that allows Wassieverse NFT holders on Solana to verify their ownership and link their EVM wallets for cross-chain benefits.

## Features

- 🔐 **Secure Wallet Connection**: Connect Phantom (Solana) and MetaMask/WalletConnect (EVM)
- ✅ **On-Chain Verification**: Server-side verification of NFT ownership on Solana blockchain
- 🔗 **Wallet Linking**: Cryptographically secure wallet linking with signature verification
- 💾 **Persistent Storage**: PostgreSQL database to store wallet mappings
- 🎨 **Modern UI**: Beautiful interface built with TailwindCSS and shadcn/ui
- 🔒 **Security**: Nonce-based signatures to prevent replay attacks

## Tech Stack

- **Frontend**: Next.js 15 (App Router), React 19, TypeScript
- **Styling**: TailwindCSS, shadcn/ui components
- **Blockchain**: 
  - Solana Web3.js for Solana interaction
  - wagmi + viem for EVM interaction
  - Metaplex Token Metadata for NFT verification (Collection NFT standard)
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: Wallet signature verification

## Documentation

- 📚 **[Metaplex Collection Verification](docs/METAPLEX_COLLECTION_VERIFICATION.md)** - Comprehensive guide to how NFT verification works
- 🚀 **[Quick Start Guide](QUICKSTART.md)** - Get up and running in 5 minutes
- 📦 **[Collection Verification Update](COLLECTION_VERIFICATION_UPDATE.md)** - Latest changes to verification system
- 🏗️ **[Architecture](ARCHITECTURE.md)** - System architecture and design decisions
- 🚀 **[Deployment Guide](DEPLOYMENT.md)** - How to deploy to production

## Prerequisites

Before you begin, ensure you have:

- Node.js 18+ installed
- PostgreSQL database running
- Phantom wallet browser extension
- MetaMask wallet browser extension (optional)
- Helius or QuickNode API key (recommended for better performance)
- WalletConnect Project ID

## Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd CollectEVM
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` and fill in your configuration:
   - `DATABASE_URL`: Your PostgreSQL connection string
   - `WASSIEVERSE_COLLECTION_ADDRESS`: The Solana address of the Wassieverse NFT collection
   - `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID`: Your WalletConnect project ID from https://cloud.walletconnect.com
   - `SOLANA_RPC_URL`: Solana RPC endpoint (use Helius or QuickNode for production)

4. **Set up the database**
   ```bash
   npx prisma generate
   npx prisma db push
   ```

5. **Run the development server**
   ```bash
   npm run dev
   ```

6. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

## Configuration

### Wassieverse Collection Address

You need to update the `WASSIEVERSE_COLLECTION_ADDRESS` in your `.env` file with the actual collection address. This is used to verify that NFTs belong to the Wassieverse collection.

To find the collection address:
1. Go to a Wassieverse NFT on Solscan
2. Look for the "Collection" field in the metadata
3. Copy the verified collection address

### Solana RPC Provider

For production use, it's highly recommended to use a dedicated RPC provider:

- **Helius**: https://helius.dev
- **QuickNode**: https://quicknode.com
- **Alchemy**: https://alchemy.com

Free tier Solana RPC (api.mainnet-beta.solana.com) has rate limits that may not be suitable for production.

### Alternative: Using Helius DAS API

For faster NFT queries, you can use the Helius Digital Asset Standard (DAS) API. Uncomment the `getWassieverseNFTsHelius` function in `lib/solana.ts` and add your `HELIUS_API_KEY` to `.env`.

## Database Schema

The application uses two main tables:

### Nonce Table
Stores temporary nonces for signature verification:
- `id`: Unique identifier
- `nonce`: Random cryptographic nonce
- `address`: Associated wallet address
- `used`: Whether the nonce has been used
- `createdAt`: Creation timestamp
- `expiresAt`: Expiration timestamp (5 minutes)

### WalletLink Table
Stores verified wallet linkings:
- `id`: Unique identifier
- `solanaAddress`: Solana wallet address
- `evmAddress`: EVM wallet address
- `tokenIds`: Array of NFT mint addresses
- `solanaSignature`: Verified Solana signature
- `evmSignature`: Verified EVM signature
- `verifiedAt`: Verification timestamp
- `updatedAt`: Last update timestamp

## API Endpoints

### POST /api/nonce
Generates a cryptographic nonce for signing.

**Request:**
```json
{
  "address": "solana_or_evm_address"
}
```

**Response:**
```json
{
  "nonce": "random_hex_string"
}
```

### POST /api/verify-solana
Verifies Solana wallet signature and checks for Wassieverse NFTs.

**Request:**
```json
{
  "solAddress": "solana_wallet_address",
  "signature": "base58_signature",
  "message": "signed_message",
  "nonce": "nonce_from_previous_step"
}
```

**Response:**
```json
{
  "verified": true,
  "tokenIds": ["nft_mint_1", "nft_mint_2"],
  "message": "Found 2 Wassieverse NFT(s)"
}
```

### POST /api/link-evm
Links EVM wallet to verified Solana wallet.

**Request:**
```json
{
  "solanaAddress": "solana_wallet_address",
  "evmAddress": "evm_wallet_address",
  "evmSignature": "evm_signature",
  "message": "signed_message",
  "nonce": "nonce",
  "solanaSignature": "solana_signature_from_verify_step"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Wallets linked successfully",
  "data": {
    "solanaAddress": "...",
    "evmAddress": "...",
    "tokenIds": ["..."],
    "verifiedAt": "2024-01-01T00:00:00.000Z"
  }
}
```

## User Flow

1. **Connect Solana Wallet**
   - User clicks "Connect Solana Wallet"
   - Phantom wallet prompts for connection
   - User clicks "Verify NFT Ownership"

2. **Verify NFT Ownership**
   - Frontend requests a nonce from `/api/nonce`
   - User signs a message with their Solana wallet
   - Backend verifies signature and checks blockchain for Wassieverse NFTs
   - NFT token IDs are returned if verified

3. **Connect EVM Wallet**
   - User clicks "Connect EVM Wallet"
   - MetaMask or WalletConnect prompts for connection
   - User clicks "Link Wallets"

4. **Link Wallets**
   - Frontend requests a new nonce
   - User signs a message with their EVM wallet
   - Backend verifies both signatures and saves the link
   - Success message displays linked wallet information

## Security Features

- **Nonce-based signatures**: Prevents replay attacks
- **Server-side verification**: All signatures verified on backend
- **Expiring nonces**: Nonces expire after 5 minutes
- **On-chain verification**: NFT ownership verified directly from blockchain
- **No trust in client data**: All critical data verified server-side

## Development

### Database Migrations

When you modify the Prisma schema:

```bash
npx prisma generate
npx prisma db push
```

### View Database

```bash
npx prisma studio
```

### Lint

```bash
npm run lint
```

### Build

```bash
npm run build
```

## Production Deployment

### Environment Variables

Ensure all environment variables are properly set in your production environment:
- Use production PostgreSQL database
- Use dedicated Solana RPC provider (not free tier)
- Keep API keys secure

### Database

Run migrations in production:
```bash
npx prisma generate
npx prisma db push
```

### Deployment Platforms

This app can be deployed to:
- **Vercel** (recommended for Next.js)
- **Railway** (includes PostgreSQL)
- **Render**
- **AWS/GCP/Azure**

## Troubleshooting

### "No Wassieverse NFTs found"
- Verify the `WASSIEVERSE_COLLECTION_ADDRESS` is correct
- Check that the connected wallet actually holds Wassieverse NFTs
- Ensure NFTs have verified collection metadata

### RPC Rate Limiting
- Upgrade to a paid RPC provider (Helius, QuickNode)
- Implement caching for NFT queries
- Use Helius DAS API for faster queries

### Wallet Connection Issues
- Ensure wallet extensions are installed and unlocked
- Check that you're on the correct network
- Clear browser cache and try again

### Database Connection Errors
- Verify `DATABASE_URL` is correct
- Ensure PostgreSQL is running
- Check firewall/network settings

## Future Enhancements

- [ ] Add NFT image display from metadata
- [ ] Implement wallet unlink functionality
- [ ] Add admin dashboard for viewing all links
- [ ] Support multiple NFT collections
- [ ] Add rate limiting to API endpoints
- [ ] Implement caching for NFT queries
- [ ] Add unit and integration tests
- [ ] Support additional wallet types (Solflare, Ledger)
- [ ] Add analytics and metrics

## License

MIT

## Support

For issues or questions, please open an issue on GitHub.

