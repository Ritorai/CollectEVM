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
      const signatureBytes = bs58.decode(signature);

      const verified = nacl.sign.detached.verify(
        messageBytes,
        signatureBytes,
        publicKey.toBytes()
      );

      if (!verified) {
        return NextResponse.json(
          { error: "Invalid signature" },
          { status: 400 }
        );
      }
    } catch (error) {
      console.error("Signature verification error:", error);
      return NextResponse.json(
        { error: "Signature verification failed" },
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

