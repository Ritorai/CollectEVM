import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    // Query LinkedNFT table for entries after 2025-12-09
    const cutoffDate = new Date("2025-12-09T00:00:00.000Z");
    
    const rows = await prisma.linkedNFT.findMany({
      where: {
        linkedAt: {
          gt: cutoffDate,
        },
      },
      select: {
        evmAddress: true,
        tokenId: true,
      },
      orderBy: {
        linkedAt: "asc",
      },
    });

    // Create CSV content: evmAddress,tokenId
    const csvLines = rows.map(row => {
      const evm = row.evmAddress || '';
      const tokenId = row.tokenId || '';
      return `${evm},${tokenId}`;
    });

    const csvContent = csvLines.join('\n');

    // Return as text file download
    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/plain',
        'Content-Disposition': 'attachment; filename="linked-nft-export.txt"',
      },
    });

  } catch (error) {
    console.error('Error exporting LinkedNFT data:', error);
    
    return NextResponse.json(
      { error: 'Failed to export LinkedNFT data', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
