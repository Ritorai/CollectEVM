import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const { tokenIds } = await req.json();

    if (!tokenIds || !Array.isArray(tokenIds)) {
      return NextResponse.json(
        { error: "Invalid tokenIds array" },
        { status: 400 }
      );
    }

    // CRITICAL: Check globally if tokenIds are linked (tokenId has global uniqueness constraint)
    // A tokenId can only be linked once globally, regardless of which EVM address
    const linkedNFTs = await prisma.linkedNFT.findMany({
      where: {
        tokenId: {
          in: tokenIds
        }
      },
      select: {
        tokenId: true,
        evmAddress: true,
        solanaAddress: true
      }
    });

    // Create a map of tokenId -> linking status
    const statuses: Record<string, { isLinked: boolean; linkedTo?: string; solanaAddress?: string }> = {};
    
    tokenIds.forEach(tokenId => {
      const linkedNFT = linkedNFTs.find(nft => nft.tokenId === tokenId);
      // If linked globally, mark as linked (regardless of which EVM address it's linked to)
      statuses[tokenId] = {
        isLinked: !!linkedNFT,
        linkedTo: linkedNFT?.evmAddress,
        solanaAddress: linkedNFT?.solanaAddress
      };
    });

    return NextResponse.json({
      statuses
    });

  } catch (error) {
    console.error("Error checking NFT status:", error);
    return NextResponse.json(
      { error: "Failed to check NFT status" },
      { status: 500 }
    );
  }
}

