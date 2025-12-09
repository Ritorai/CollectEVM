import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { PublicKey } from "@solana/web3.js";
import bs58 from "bs58";
import nacl from "tweetnacl";
import { getWassieverseNFTs } from "@/lib/solana";
import { getCache, setCache } from "@/lib/redis";

export async function POST(req: NextRequest) {
  try {
    const { solAddress, signature, message, nonce } = await req.json();

    if (!solAddress || !signature || !message || !nonce) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // 1. Verify nonce exists and hasn't been used
    const nonceRecord = await prisma.nonce.findUnique({
      where: { nonce },
    });

    if (!nonceRecord) {
      return NextResponse.json(
        { error: "Invalid nonce" },
        { status: 400 }
      );
    }

    if (nonceRecord.used) {
      return NextResponse.json(
        { error: "Nonce already used" },
        { status: 400 }
      );
    }

    if (new Date() > nonceRecord.expiresAt) {
      return NextResponse.json(
        { error: "Nonce expired" },
        { status: 400 }
      );
    }

    if (nonceRecord.address !== solAddress) {
      return NextResponse.json(
        { error: "Nonce address mismatch" },
        { status: 400 }
      );
    }

    // 2. Verify Solana signature
    try {
      const publicKey = new PublicKey(solAddress);
      const messageBytes = new TextEncoder().encode(message);
      
      // Decode signature - handle different formats
      let signatureBytes: Uint8Array;
      try {
        signatureBytes = bs58.decode(signature);
      } catch (decodeError) {
        console.error("Signature decode error:", decodeError);
        return NextResponse.json(
          { error: "Invalid signature format" },
          { status: 400 }
        );
      }

      // Verify signature length (should be 64 bytes for Ed25519)
      if (signatureBytes.length !== 64) {
        console.error(`Invalid signature length: ${signatureBytes.length}, expected 64`);
        return NextResponse.json(
          { error: "Invalid signature length" },
          { status: 400 }
        );
      }

      // Try multiple verification methods for Ledger compatibility
      let verified = false;
      
      // Method 1: Standard UTF-8 encoding (most wallets including Phantom)
      verified = nacl.sign.detached.verify(
        messageBytes,
        signatureBytes,
        publicKey.toBytes()
      );

      // Method 2: Try with Solana's standard message prefix (some Ledger implementations use this)
      if (!verified) {
        const prefix = new TextEncoder().encode("solana offchain");
        const messageContent = new TextEncoder().encode(message);
        const prefixedMessage = new Uint8Array(prefix.length + messageContent.length);
        prefixedMessage.set(prefix, 0);
        prefixedMessage.set(messageContent, prefix.length);
        verified = nacl.sign.detached.verify(
          prefixedMessage,
          signatureBytes,
          publicKey.toBytes()
        );
      }

      // Method 3: Additional Ledger compatibility note
      // Note: PublicKey doesn't have a verify method, but we can use nacl with different message formats
      // Some Ledger implementations might sign with additional metadata or different encoding

      // Method 4: Try with message as raw Uint8Array (in case of encoding differences)
      if (!verified) {
        const messageBytesAlt = new Uint8Array(messageBytes);
        verified = nacl.sign.detached.verify(
          messageBytesAlt,
          signatureBytes,
          publicKey.toBytes()
        );
      }

      if (!verified) {
        // Log detailed information for debugging Ledger issues
        console.error("Signature verification failed - all methods attempted", {
          solAddress,
          signatureLength: signatureBytes.length,
          messageLength: messageBytes.length,
          messagePreview: message.substring(0, 100),
          publicKey: publicKey.toString(),
          signatureBase58: bs58.encode(signatureBytes).substring(0, 20) + "..."
        });
        
        // Return detailed error for Ledger users
        return NextResponse.json(
          { 
            error: "Invalid signature - verification failed. If using Ledger, please ensure: 1) The Solana app is open and unlocked, 2) 'Blind Signing' is enabled in the Solana app settings (Settings → Blind Signing → Enabled), 3) Try disconnecting and reconnecting your Ledger wallet, then verify again." 
          },
          { status: 400 }
        );
      }
    } catch (error) {
      console.error("Signature verification error:", error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      
      // Provide helpful error message for Ledger users
      if (errorMessage.includes("Invalid") || errorMessage.includes("signature")) {
        return NextResponse.json(
          { error: "Signature verification failed. If using Ledger, ensure the Solana app is open, unlocked, and 'Blind Signing' is enabled in the app settings." },
          { status: 400 }
        );
      }
      
      return NextResponse.json(
        { error: `Signature verification failed: ${errorMessage}` },
        { status: 400 }
      );
    }

    // 3. Mark nonce as used
    await prisma.nonce.update({
      where: { nonce },
      data: { used: true },
    });

    // 4. Query Solana blockchain for Wassieverse NFTs (with Redis caching)
    let nfts: { mintAddress: string; tokenId: string }[] = [];
    try {
      // Check Redis cache first (cache for 5 minutes = 300 seconds)
      const cacheKey = `nfts:${solAddress}`;
      const cachedNFTs = await getCache(cacheKey);
      
      if (cachedNFTs) {
        console.log(`✅ Using cached NFTs for ${solAddress}`);
        nfts = JSON.parse(cachedNFTs);
      } else {
        console.log(`🔍 Fetching NFTs from blockchain for ${solAddress}`);
        nfts = await getWassieverseNFTs(solAddress);
        
        // Cache the result for 5 minutes
        if (nfts.length > 0) {
          await setCache(cacheKey, JSON.stringify(nfts), 300);
        }
      }
      
      if (nfts.length === 0) {
        return NextResponse.json(
          { error: "No Wassieverse NFTs found in this wallet" },
          { status: 404 }
        );
      }
    } catch (error) {
      console.error("Error fetching NFTs:", error);
      return NextResponse.json(
        { error: "Failed to fetch NFTs from blockchain" },
        { status: 500 }
      );
    }

    // Extract just the token IDs for the response (keeping mint addresses for internal use)
    const tokenIds = nfts.map(nft => nft.tokenId);

    return NextResponse.json({
      verified: true,
      tokenIds,
      nfts, // Include full NFT data for the link-evm route
      message: `Found ${nfts.length} Wassieverse NFT(s)`,
    });
  } catch (error) {
    console.error("Error in verify-solana:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

