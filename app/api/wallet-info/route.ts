import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/wallet-info?evmAddress=0x... or ?solanaAddress=...
 * Returns wallet link information including NFT count
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const evmAddress = searchParams.get("evmAddress");
    const solanaAddress = searchParams.get("solanaAddress");

    if (!evmAddress && !solanaAddress) {
      return NextResponse.json(
        { error: "Either evmAddress or solanaAddress is required" },
        { status: 400 }
      );
    }

    // Find wallet link
    const walletLink = await prisma.walletLink.findFirst({
      where: evmAddress
        ? { evmAddress: evmAddress.toLowerCase() }
        : { solanaAddress },
      include: {
        linkedNFTs: {
          select: {
            id: true,
            tokenId: true,
            mintAddress: true,
            linkedAt: true,
          },
          orderBy: {
            linkedAt: "desc",
          },
        },
      },
    });

    if (!walletLink) {
      return NextResponse.json(
        { error: "Wallet link not found" },
        { status: 404 }
      );
    }

    // Get count of linked NFTs
    const tokenCount = walletLink.linkedNFTs.length;

    return NextResponse.json({
      success: true,
      data: {
        solanaAddress: walletLink.solanaAddress,
        evmAddress: walletLink.evmAddress,
        tokenCount,
        tokenIds: walletLink.linkedNFTs.map((nft) => nft.tokenId),
        nfts: walletLink.linkedNFTs,
        verifiedAt: walletLink.verifiedAt,
        updatedAt: walletLink.updatedAt,
      },
    });
  } catch (error) {
    console.error("Error fetching wallet info:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

