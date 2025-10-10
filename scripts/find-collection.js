const { Connection, PublicKey } = require("@solana/web3.js");

/**
 * Script to find the Collection NFT address from a known NFT in the collection.
 * 
 * This script uses Helius API for reliable collection detection.
 * If you don't have a Helius API key, you can get one free at https://helius.dev
 * 
 * Usage:
 * 1. Update the mintAddress below with a known NFT from your collection
 * 2. Set HELIUS_API_KEY in your .env file (optional but recommended)
 * 3. Run: node scripts/find-collection.js
 * 4. Copy the Collection Address to your .env file as WASSIEVERSE_COLLECTION_ADDRESS
 */

async function findCollectionAddress() {
  // ⚠️ UPDATE THIS: Replace with a known NFT mint address from your collection
  const mintAddress = "HgiyykEXv2k5w9dEnQr5L4JCSf5Ar9npYR7VMvihZmmV";
  
  console.log(`\n🔍 Looking up collection for NFT: ${mintAddress}\n`);
  
  // Try Helius API first (recommended)
  const heliusApiKey = process.env.HELIUS_API_KEY;
  
  if (heliusApiKey) {
    console.log(`📡 Using Helius API (fast method)...\n`);
    try {
      const result = await findCollectionHelius(mintAddress, heliusApiKey);
      return result;
    } catch (error) {
      console.warn(`⚠️ Helius API failed: ${error.message}`);
      console.log(`\n🔄 Falling back to RPC method...\n`);
    }
  } else {
    console.log(`ℹ️  No HELIUS_API_KEY found, using RPC method (slower)`);
    console.log(`   Get a free API key at: https://helius.dev\n`);
  }
  
  // Fallback to RPC method
  try {
    await findCollectionRPC(mintAddress);
  } catch (error) {
    console.error(`\n❌ ERROR: ${error.message}\n`);
  }
}

async function findCollectionHelius(mintAddress, apiKey) {
  const url = `https://api.helius.xyz/v0/token-metadata?api-key=${apiKey}`;
  
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ mintAccounts: [mintAddress] })
  });
  
  if (!response.ok) {
    throw new Error(`Helius API error: ${response.status}`);
  }
  
  const data = await response.json();
  
  if (!data || data.length === 0) {
    throw new Error("No metadata found for this NFT");
  }
  
  const nftMetadata = data[0];
  
  console.log(`📝 NFT Details:`);
  console.log(`   Name: ${nftMetadata.onChainMetadata?.metadata?.data?.name || 'Unknown'}`);
  console.log(`   Symbol: ${nftMetadata.onChainMetadata?.metadata?.data?.symbol || 'Unknown'}`);
  
  // Check for collection in on-chain metadata
  const collection = nftMetadata.onChainMetadata?.metadata?.collection;
  
  if (collection) {
    const collectionAddress = collection.key;
    const isVerified = collection.verified;
    
    console.log(`\n✅ COLLECTION FOUND!`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`🎯 Collection Address: ${collectionAddress}`);
    console.log(`✓  Verified: ${isVerified ? '✅ YES' : '❌ NO'}`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);
    
    if (isVerified) {
      console.log(`📝 Add this to your .env file:`);
      console.log(`   WASSIEVERSE_COLLECTION_ADDRESS="${collectionAddress}"\n`);
    } else {
      console.log(`⚠️  WARNING: This collection is not verified!`);
      console.log(`   The NFT has collection info but it's not signed by the collection authority.`);
      console.log(`   This might be a fake or improperly configured NFT.\n`);
    }
    
    return collectionAddress;
  } else {
    console.log(`\n❌ NO COLLECTION FOUND`);
    console.log(`   This NFT doesn't have collection metadata.`);
    console.log(`   It might be:`);
    console.log(`   - An older NFT created before collection standard`);
    console.log(`   - A standalone NFT not part of a collection`);
    console.log(`   - Using a different verification method\n`);
    return null;
  }
}

async function findCollectionRPC(mintAddress) {
  const rpcUrl = process.env.SOLANA_RPC_URL || "https://api.mainnet-beta.solana.com";
  const connection = new Connection(rpcUrl);
  
  console.log(`📡 Using Solana RPC: ${rpcUrl}`);
  
  // Get the metadata PDA (Program Derived Address)
  const TOKEN_METADATA_PROGRAM_ID = new PublicKey("metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s");
  const [metadataAddress] = PublicKey.findProgramAddressSync(
    [
      Buffer.from("metadata"),
      TOKEN_METADATA_PROGRAM_ID.toBuffer(),
      new PublicKey(mintAddress).toBuffer(),
    ],
    TOKEN_METADATA_PROGRAM_ID
  );

  console.log(`📋 Metadata PDA: ${metadataAddress.toString()}\n`);

  // Fetch the metadata account
  const metadataAccount = await connection.getAccountInfo(metadataAddress);
  
  if (!metadataAccount) {
    console.error("❌ Metadata account not found. Check that the mint address is correct.\n");
    return;
  }

  console.log(`✅ Metadata account found!`);
  console.log(`📊 Account data length: ${metadataAccount.data.length} bytes\n`);
  
  // Parse the metadata manually (simplified approach)
  const data = metadataAccount.data;
  
  try {
    // Read basic info
    let offset = 1; // Skip key byte
    const updateAuthority = new PublicKey(data.slice(offset, offset + 32));
    offset += 32;
    const mint = new PublicKey(data.slice(offset, offset + 32));
    offset += 32;
    
    // Read name (with length prefix)
    const nameLength = data.readUInt32LE(offset);
    offset += 4;
    const name = data.slice(offset, offset + nameLength).toString('utf8').replace(/\0/g, '');
    offset += nameLength;
    
    // Read symbol
    const symbolLength = data.readUInt32LE(offset);
    offset += 4;
    const symbol = data.slice(offset, offset + symbolLength).toString('utf8').replace(/\0/g, '');
    offset += symbolLength;
    
    // Read URI
    const uriLength = data.readUInt32LE(offset);
    offset += 4;
    const uri = data.slice(offset, offset + uriLength).toString('utf8').replace(/\0/g, '');
    
    console.log(`📝 NFT Details:`);
    console.log(`   Name: ${name.trim()}`);
    console.log(`   Symbol: ${symbol.trim()}`);
    console.log(`   URI: ${uri.trim()}`);
    
    // Look for collection data
    // Collection data is near the end of the metadata
    // This is a simplified check - collection flag is at a specific position
    
    console.log(`\n⚠️  RPC method has limited collection detection.`);
    console.log(`   For best results, use Helius API:`);
    console.log(`   1. Get a free API key at https://helius.dev`);
    console.log(`   2. Add to .env: HELIUS_API_KEY=your_key_here`);
    console.log(`   3. Run this script again\n`);
    
    console.log(`📝 Alternative: Check the NFT on Solscan:`);
    console.log(`   https://solscan.io/token/${mintAddress}`);
    console.log(`   Look for the "Collection" field in the metadata.\n`);
    
  } catch (error) {
    console.error(`❌ Error parsing metadata: ${error.message}`);
    console.log(`\nTip: Try using Helius API for more reliable results.`);
    console.log(`Or check the NFT on: https://solscan.io/token/${mintAddress}\n`);
  }
}

// Run the function
findCollectionAddress().catch(console.error);
