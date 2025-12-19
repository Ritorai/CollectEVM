import { NextRequest, NextResponse } from "next/server";
import { getWassieverseNFTs } from "@/lib/solana";
import { getCache, setCache } from "@/lib/redis";

export async function POST(req: NextRequest) {
  try {
    const { solAddress } = await req.json();

    if (!solAddress) {
      return NextResponse.json(
        { error: "Missing solAddress" },
        { status: 400 }
      );
    }

    // Query Solana blockchain for Wassieverse NFTs (with Redis caching)
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
      success: true,
      tokenIds,
      nfts, // Include full NFT data
      message: `Found ${nfts.length} Wassieverse NFT(s)`,
    });
  } catch (error) {
    console.error("Error in check-nfts:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}




