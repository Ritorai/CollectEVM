import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

interface AirdropRow {
  EVM: string;
  Amount: string | number;
}

export async function GET() {
  try {
    // Query the EVMAirdrop table using raw SQL
    const rows = await prisma.$queryRaw<AirdropRow[]>`
      SELECT "EVM", "Amount" 
      FROM "EVMAirdrop"
      ORDER BY "EVM"
    `;

    // Create CSV content
    const csvLines = rows.map(row => {
      const evm = row.EVM || '';
      const amount = row.Amount?.toString() || '0';
      return `${evm},${amount}`;
    });

    const csvContent = csvLines.join('\n');

    // Return as text file download
    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/plain',
        'Content-Disposition': 'attachment; filename="airdrop.txt"',
      },
    });

  } catch (error) {
    console.error('Error exporting airdrop data:', error);
    
    if (error instanceof Error) {
      if (error.message.includes('relation') && error.message.includes('does not exist')) {
        return NextResponse.json(
          { error: 'EVMAirdrop table does not exist. Please check the table name.' },
          { status: 404 }
        );
      }
    }

    return NextResponse.json(
      { error: 'Failed to export airdrop data', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

