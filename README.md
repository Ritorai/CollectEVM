# Wassieverse NFT Wallet Linker

A full-stack Next.js application that allows Wassieverse NFT holders on Solana to verify their ownership and link their EVM wallets for cross-chain benefits.

## Features

- 🔐 **Secure Wallet Connection**: Connect Phantom (Solana) and MetaMask/WalletConnect (EVM)
- ✅ **On-Chain Verification**: Server-side verification of NFT ownership using Metaplex Collection NFT standard
- 🖼️ **Visual NFT Display**: Shows all Wassieverse NFTs held in connected Solana wallet
- 🎯 **Selective Linking**: Choose specific NFTs to link to your EVM wallet
- 🔗 **Smart Wallet Linking**: New NFTs are added to existing wallet pairs instead of creating duplicates
- 🚫 **Double-Link Prevention**: NFTs can only be linked once (prevents linking same NFT to multiple wallets)
- 💾 **Persistent Storage**: PostgreSQL database with token ID tracking
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

- 🤝 **[Contributing Guide](CONTRIBUTING_GUIDE.md)** - How to collaborate on this project
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
- `tokenIds`: Array of NFT token IDs (e.g., ["564", "1234"])
- `solanaSignature`: Verified Solana signature
- `evmSignature`: Verified EVM signature
- `verifiedAt`: Verification timestamp
- `updatedAt`: Last update timestamp

### LinkedNFT Table
Tracks individual NFTs to prevent double-linking:
- `id`: Unique identifier
- `tokenId`: NFT token ID (e.g., "564") - unique
- `mintAddress`: Full Solana mint address - unique
- `solanaAddress`: Solana wallet that owns this NFT
- `evmAddress`: Linked EVM wallet
- `walletLinkId`: Reference to WalletLink entry
- `linkedAt`: Link timestamp

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
  "tokenIds": ["564", "1234"],
  "nfts": [
    {"mintAddress": "HgiyykEXv...", "tokenId": "564"},
    {"mintAddress": "8Kq5JL9w...", "tokenId": "1234"}
  ],
  "message": "Found 2 Wassieverse NFT(s)"
}
```

### GET /api/nft-status?solanaAddress={address}
Checks linking status of NFTs for a given Solana address.

**Response:**
```json
{
  "success": true,
  "linkedNFTs": [
    {
      "tokenId": "564",
      "mintAddress": "HgiyykEXv...",
      "evmAddress": "0x123...",
      "linkedAt": "2024-01-01T00:00:00.000Z"
    }
  ]
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
   - All Wassieverse NFTs in the wallet are automatically displayed

2. **View NFT Status**
   - Visual indicators show which NFTs are already linked (🔗 Linked)
   - Unlinked NFTs are shown with checkboxes for selection (🔓 Unlinked)
   - Already linked NFTs show which EVM address they're linked to

3. **Select NFTs to Link**
   - User checks the boxes next to unlinked NFTs they want to link
   - Already linked NFTs cannot be selected (prevents double-linking)

4. **Connect EVM Wallet**
   - User clicks "Connect EVM Wallet"
   - MetaMask or WalletConnect prompts for connection

5. **Link Selected NFTs**
   - User clicks "Link Selected NFTs"
   - Frontend requests nonces and signatures
   - Backend verifies and creates/updates wallet link
   - If wallets were already linked, new NFTs are added to existing link
   - Success message shows linked NFTs

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

## Recent Updates

- ✅ **Visual NFT Display**: Shows all Wassieverse NFTs with images and metadata
- ✅ **Selective Linking**: Choose specific NFTs to link
- ✅ **Double-Link Prevention**: NFTs can only be linked once
- ✅ **Smart Updates**: New NFTs added to existing wallet pairs
- ✅ **Token ID Storage**: Stores clean token IDs (e.g., "564") instead of full mint addresses
- ✅ **Metaplex Collection Verification**: Uses verified Collection NFT standard

## Future Enhancements

- [ ] Add NFT image display from on-chain metadata
- [ ] Implement wallet unlink functionality
- [ ] Add admin dashboard for viewing all links
- [ ] Support multiple NFT collections
- [ ] Add rate limiting to API endpoints
- [ ] Implement caching for NFT queries
- [ ] Add unit and integration tests
- [ ] Support additional wallet types (Solflare, Ledger)
- [ ] Add analytics and metrics
- [ ] Add bulk NFT operations
- [ ] Implement NFT transfer detection

## License

MIT

## Support

For issues or questions, please open an issue on GitHub.

