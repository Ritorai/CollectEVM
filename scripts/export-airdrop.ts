import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

interface AirdropRow {
  EVM: string;
  Amount: string | number;
}

async function exportAirdrop() {
  try {
    console.log('Connecting to database...');
    
    // Query the EVMAirdrop table using raw SQL
    const rows = await prisma.$queryRaw<AirdropRow[]>`
      SELECT "EVM", "Amount" 
      FROM "EVMAirdrop"
      ORDER BY "EVM"
    `;

    console.log(`Found ${rows.length} rows in EVMAirdrop table`);

    // Create CSV content
    const csvLines = rows.map(row => {
      const evm = row.EVM || '';
      const amount = row.Amount?.toString() || '0';
      return `${evm},${amount}`;
    });

    // Write to file
    const outputPath = path.join(process.cwd(), 'airdrop.txt');
    fs.writeFileSync(outputPath, csvLines.join('\n'), 'utf-8');

    console.log(`✅ Successfully exported ${rows.length} rows to: ${outputPath}`);
    console.log(`📄 File location: ${outputPath}`);

  } catch (error) {
    console.error('❌ Error exporting airdrop data:');
    if (error instanceof Error) {
      console.error(error.message);
      if (error.message.includes('relation') && error.message.includes('does not exist')) {
        console.error('\n💡 Tip: Make sure the table name is exactly "EVMAirdrop" (case-sensitive)');
        console.error('   If the table has a different name, please let me know.');
      }
    } else {
      console.error(error);
    }
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

exportAirdrop();







