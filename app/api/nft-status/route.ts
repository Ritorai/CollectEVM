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

    // Check which token IDs are already linked
    const linkedNFTs = await prisma.linkedNFT.findMany({
      where: {
        tokenId: {
          in: tokenIds
        }
      },
      select: {
        tokenId: true,
        evmAddress: true
      }
    });

    // Create a map of tokenId -> linking status
    const statuses: Record<string, { isLinked: boolean; linkedTo?: string }> = {};
    
    tokenIds.forEach(tokenId => {
      const linkedNFT = linkedNFTs.find(nft => nft.tokenId === tokenId);
      statuses[tokenId] = {
        isLinked: !!linkedNFT,
        linkedTo: linkedNFT?.evmAddress
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

