import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

interface LinkedNFTRow {
  evmAddress: string;
  tokenId: string;
}

export async function GET() {
  try {
    // Query LinkedNFT table for entries after 2025-11-26
    const cutoffDate = new Date("2025-11-26T00:00:00.000Z");
    
    const rows = await prisma.linkedNFT.findMany({
      where: {
        linkedAt: {
          gt: cutoffDate, // Greater than 2025-11-26
        },
      },
      select: {
        evmAddress: true,
        tokenId: true,
      },
      orderBy: {
        linkedAt: "asc", // Order by date ascending
      },
    });

    // Create CSV content: evmAddress,tokenId
    const csvLines = rows.map((row) => {
      const evm = row.evmAddress || "";
      const tokenId = row.tokenId || "";
      return `${evm},${tokenId}`;
    });

    const csvContent = csvLines.join("\n");

    // Return as text file download
    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        "Content-Type": "text/plain",
        "Content-Disposition": 'attachment; filename="linked-nfts.txt"',
      },
    });
  } catch (error) {
    console.error("Error exporting linked NFTs:", error);

    if (error instanceof Error) {
      if (
        error.message.includes("relation") &&
        error.message.includes("does not exist")
      ) {
        return NextResponse.json(
          {
            error:
              "LinkedNFT table does not exist. Please check the table name.",
          },
          { status: 404 }
        );
      }
    }

    return NextResponse.json(
      {
        error: "Failed to export linked NFTs data",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

