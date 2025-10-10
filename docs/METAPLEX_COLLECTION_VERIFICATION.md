# Metaplex Collection Verification

## Overview

This project uses the **Metaplex Collection NFT standard** to verify that NFTs belong to a specific Solana collection. This is the industry-standard approach for Solana NFT collections and provides the most reliable verification method.

## How Metaplex Collections Work

### The Collection NFT Model

In the Metaplex standard, collections work using a parent-child relationship:

1. **Collection NFT (Parent)**
   - A special NFT that represents the collection itself
   - Has its own metadata, name, and image (often the collection logo)
   - Acts as the canonical identifier for the entire collection
   - Has a unique mint address (this is what we configure in `.env`)

2. **Individual NFTs (Children)**
   - Each NFT in the collection has a `collection` field in its metadata
   - This field contains:
     - `key`: The mint address of the Collection NFT
     - `verified`: Boolean indicating if the collection authority has verified this NFT

### Verification Process

```
┌─────────────────────────────────────────────┐
│  Collection NFT (Parent)                    │
│  Address: EwxY...VZoH                       │
│  ├─ Name: "Wassieverse"                     │
│  ├─ Symbol: "WASS"                          │
│  └─ Authority: Collection Creator           │
└─────────────────────────────────────────────┘
                    ▲
                    │
        ┌───────────┼───────────┐
        │           │           │
   ┌────▼────┐ ┌───▼─────┐ ┌──▼──────┐
   │ NFT #1  │ │ NFT #2  │ │ NFT #3  │
   │verified │ │verified │ │verified │
   └─────────┘ └─────────┘ └─────────┘
```

Each NFT's metadata contains:
```json
{
  "collection": {
    "key": "EwxYgrffpuTuNa4C1b4xxrEkRbZAQgMG5fAiY3uJVZoH",
    "verified": true
  }
}
```

### Why This is Secure

1. **Cryptographic Verification**: The `verified` flag is set by the collection authority's signature, not by the NFT creator
2. **Unforgeable**: Only the collection authority can set `verified: true`
3. **On-Chain**: All verification data is stored on-chain in the NFT's metadata account
4. **Standard**: This is the Metaplex Token Metadata Program standard used by all major marketplaces

## Implementation in This Project

### 1. Configuration

In `.env`:
```bash
WASSIEVERSE_COLLECTION_ADDRESS="EwxYgrffpuTuNa4C1b4xxrEkRbZAQgMG5fAiY3uJVZoH"
```

This is the **mint address of the Collection NFT**, not a creator address or program address.

### 2. Finding the Collection Address

#### Method 1: Using the Script
```bash
# Edit scripts/find-collection.js and update the mintAddress
# with any NFT you know belongs to the collection
node scripts/find-collection.js
```

#### Method 2: Using a Blockchain Explorer
1. Go to [Solscan.io](https://solscan.io) or [Solana Explorer](https://explorer.solana.com)
2. Look up any NFT from the collection
3. View the NFT's metadata
4. Find the "Collection" field - that's your collection address

#### Method 3: Using a Marketplace
1. Go to Magic Eden or Tensor
2. Find the collection page
3. The collection address is often in the URL or collection details

### 3. Verification Logic

The verification happens in `lib/solana.ts`:

```typescript
async function verifyCollectionMembership(connection, mintAddress) {
  // 1. Find the metadata PDA for the NFT
  const metadataAddress = findMetadataPDA(mintAddress);
  
  // 2. Fetch the metadata account
  const metadataAccount = await connection.getAccountInfo(metadataAddress);
  
  // 3. Deserialize the metadata
  const metadata = Metadata.deserialize(metadataAccount.data)[0];
  
  // 4. Check collection field
  if (metadata.collection) {
    const collectionAddress = metadata.collection.key.toString();
    const isVerified = metadata.collection.verified;
    
    // 5. Verify both address match AND verified flag is true
    return collectionAddress === COLLECTION_ADDRESS && isVerified;
  }
  
  return false;
}
```

### 4. Two Verification Methods

The project supports two methods for fetching and verifying NFTs:

#### Method A: Helius DAS API (Fast, Recommended)
- Uses the Helius Digital Asset Standard API
- Faster and more efficient
- Returns pre-parsed collection information
- Requires Helius API key

```typescript
const response = await fetch(
  `https://api.helius.xyz/v0/addresses/${wallet}/nfts?api-key=${key}`
);
const nfts = await response.json();

// Filter for verified collection members
const collectionNFTs = nfts.filter(nft => 
  nft.collection?.address === COLLECTION_ADDRESS && 
  nft.collection?.verified === true
);
```

#### Method B: Solana RPC (Fallback)
- Uses standard Solana RPC
- Works with any RPC provider
- Manually parses metadata accounts
- Slower but doesn't require special API

```typescript
// Get all token accounts
const tokenAccounts = await connection.getParsedTokenAccountsByOwner(publicKey);

// For each NFT, check metadata
for (const account of tokenAccounts) {
  const metadata = await getMetadata(mint);
  if (verifyCollectionMembership(metadata)) {
    // NFT belongs to collection
  }
}
```

## Security Considerations

### ✅ What We Check

1. **Collection Address Match**: The NFT's collection field must match our expected collection address
2. **Verified Flag**: The collection must be verified (signed by collection authority)
3. **On-Chain Data**: We only trust on-chain metadata, never client-provided data

### ❌ What We DON'T Trust

1. **Creator Address**: Old method, easily fakeable
2. **Symbol/Name**: Can be duplicated
3. **Client Claims**: Never trust what the client says about ownership
4. **Unverified Collections**: NFTs with collection data but `verified: false` are rejected

### 🔒 Security Flow

```
User connects wallet ➜ Request nonce
                    ➜ Sign message with wallet
                    ➜ Verify signature server-side
                    ➜ Query blockchain for NFTs
                    ➜ Verify each NFT's collection
                    ➜ Return only verified NFTs
```

All verification happens **server-side** in the API routes.

## Troubleshooting

### "No collection metadata found"
- The NFT might be from before Metaplex collection standard
- It might be a standalone NFT not part of a collection
- Check the NFT on a blockchain explorer

### "Collection not verified"
- The NFT has collection info but isn't signed by the collection authority
- This could be a fake/counterfeit NFT
- Never accept unverified collection NFTs

### "Wrong collection address"
- The NFT belongs to a different collection
- Double-check your `WASSIEVERSE_COLLECTION_ADDRESS` is correct
- Use `scripts/find-collection.js` to verify

### "RPC rate limiting"
- Public RPC endpoints have rate limits
- Consider using:
  - Helius: https://helius.dev (recommended)
  - QuickNode: https://quicknode.com
  - Alchemy: https://alchemy.com

## Advanced: Alternative Collections

If you want to support multiple collections or different collections:

### Option 1: Environment Variable
```bash
# In .env
COLLECTION_ADDRESS="YOUR_COLLECTION_ADDRESS_HERE"
```

### Option 2: Multiple Collections
```typescript
const SUPPORTED_COLLECTIONS = [
  "EwxYgrffpuTuNa4C1b4xxrEkRbZAQgMG5fAiY3uJVZoH", // Wassieverse
  "ANOTHER_COLLECTION_ADDRESS",
];

function isValidCollection(address: string): boolean {
  return SUPPORTED_COLLECTIONS.includes(address);
}
```

### Option 3: Dynamic Configuration
Store collection addresses in the database and query them dynamically.

## References

- [Metaplex Token Metadata Docs](https://docs.metaplex.com/programs/token-metadata/)
- [Metaplex Collections Standard](https://docs.metaplex.com/programs/token-metadata/certified-collections)
- [Solana Cookbook - NFT Collections](https://solanacookbook.com/references/nfts.html#how-to-verify-a-collection)
- [Helius DAS API](https://docs.helius.dev/compression-and-das-api/digital-asset-standard-das-api)

## Migration from Creator-Based Verification

If you were previously using creator address verification:

### Old Method (Deprecated)
```typescript
// ❌ Old way: Check creator address
const creator = metadata.data.creators[0].address;
return creator === CREATOR_ADDRESS;
```

### New Method (Current)
```typescript
// ✅ New way: Check collection field
const collection = metadata.collection;
return collection.key === COLLECTION_ADDRESS && collection.verified;
```

**Why the change?**
- Collection verification is the official Metaplex standard
- Creator addresses can be faked or shared across projects
- All major marketplaces use collection verification
- More secure and reliable

