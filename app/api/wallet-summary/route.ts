import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/wallet-summary
 * Returns a summary of all wallet links with token counts
 * 
 * Query parameters:
 * - evmAddress: Filter by EVM address
 * - solanaAddress: Filter by Solana address
 * - limit: Limit number of results (default: 100)
 * - offset: Offset for pagination (default: 0)
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const evmAddress = searchParams.get("evmAddress");
    const solanaAddress = searchParams.get("solanaAddress");
    const limit = parseInt(searchParams.get("limit") || "100");
    const offset = parseInt(searchParams.get("offset") || "0");

    // Build where clause
    const where: { evmAddress?: string; solanaAddress?: string } = {};
    if (evmAddress) {
      where.evmAddress = evmAddress.toLowerCase();
    }
    if (solanaAddress) {
      where.solanaAddress = solanaAddress;
    }

    // Get wallet links with NFT counts
    const walletLinks = await prisma.walletLink.findMany({
      where,
      include: {
        _count: {
          select: {
            linkedNFTs: true,
          },
        },
      },
      orderBy: {
        verifiedAt: "desc",
      },
      take: limit,
      skip: offset,
    });

    // Format response to match the desired structure
    const summary = walletLinks.map((link) => ({
      solanaAddress: link.solanaAddress,
      evmAddress: link.evmAddress,
      tokenCount: link._count.linkedNFTs,
      verifiedAt: link.verifiedAt,
      updatedAt: link.updatedAt,
    }));

    // Get total count for pagination
    const total = await prisma.walletLink.count({ where });

    return NextResponse.json({
      success: true,
      data: summary,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total,
      },
    });
  } catch (error) {
    console.error("Error fetching wallet summary:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

