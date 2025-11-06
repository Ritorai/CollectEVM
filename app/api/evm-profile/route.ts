import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/evm-profile?evmAddress=0x...
 * Returns all NFTs linked to an EVM address from all Solana wallets
 * This is the "profile" view showing aggregated data
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const evmAddress = searchParams.get("evmAddress");

    if (!evmAddress) {
      return NextResponse.json(
        { error: "evmAddress is required" },
        { status: 400 }
      );
    }

    // Get all wallet links for this EVM address
    const walletLinks = await prisma.walletLink.findMany({
      where: {
        evmAddress: evmAddress.toLowerCase(),
      },
      include: {
        linkedNFTs: {
          select: {
            id: true,
            tokenId: true,
            mintAddress: true,
            solanaAddress: true,
            linkedAt: true,
          },
          orderBy: {
            linkedAt: "desc",
          },
        },
      },
      orderBy: {
        verifiedAt: "desc",
      },
    });

    // Aggregate all NFTs from all Solana wallets
    const allNFTs = walletLinks.flatMap((link: { solanaAddress: string; verifiedAt: Date; linkedNFTs: Array<{ id: string; tokenId: string; mintAddress: string; solanaAddress: string; linkedAt: Date }> }) =>
      link.linkedNFTs.map((nft) => ({
        ...nft,
        solanaAddress: link.solanaAddress,
        verifiedAt: link.verifiedAt,
      }))
    );

    // Group by Solana wallet for display
    const solanaWallets = walletLinks.map((link: { solanaAddress: string; verifiedAt: Date; updatedAt: Date; linkedNFTs: Array<unknown> }) => ({
      solanaAddress: link.solanaAddress,
      nftCount: link.linkedNFTs.length,
      verifiedAt: link.verifiedAt,
      updatedAt: link.updatedAt,
    }));

    // Return profile data even if empty (no wallet links yet)
    return NextResponse.json({
      success: true,
      data: {
        evmAddress: evmAddress.toLowerCase(),
        totalNFTs: allNFTs.length,
        solanaWallets,
        nfts: allNFTs,
        // Group NFTs by Solana wallet for easier display
        nftsByWallet: walletLinks.map((link: { solanaAddress: string; verifiedAt: Date; linkedNFTs: Array<unknown> }) => ({
          solanaAddress: link.solanaAddress,
          nfts: link.linkedNFTs,
          verifiedAt: link.verifiedAt,
        })),
      },
    });
  } catch (error) {
    console.error("Error fetching EVM profile:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { 
        success: false,
        error: "Internal server error",
        details: errorMessage 
      },
      { status: 500 }
    );
  }
}

