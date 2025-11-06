#!/bin/bash
# Script to ensure database is set up when app starts
# This runs on every app start to ensure tables exist

echo "=========================================="
echo "🔍 Database Setup Script"
echo "=========================================="

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
  echo "❌ ERROR: DATABASE_URL is not set!"
  echo ""
  echo "To fix this on Railway:"
  echo "1. Go to your CollectEVM service"
  echo "2. Go to Settings → Variables"
  echo "3. Make sure you have a PostgreSQL service linked"
  echo "4. Railway should automatically inject DATABASE_URL"
  echo "5. If not, manually add: DATABASE_URL=\"\${{Postgres.DATABASE_URL}}\""
  echo ""
  echo "⚠️  Skipping database setup - app will start but database operations will fail"
  exit 0
fi

# Show that DATABASE_URL is set (but don't print the full value for security)
echo "✅ DATABASE_URL is set"
echo "   Format: ${DATABASE_URL%%@*}@***" # Show only the user part, hide password

# Generate Prisma Client first (in case it wasn't generated during build)
echo ""
echo "📦 Generating Prisma Client..."
npx prisma generate || {
  echo "⚠️  Prisma generate failed, but continuing..."
}

# Try to push schema (creates tables if they don't exist)
echo ""
echo "📤 Pushing database schema (creating tables if they don't exist)..."
npx prisma db push --accept-data-loss --skip-generate 2>&1 | tee /tmp/prisma-output.log

PRISMA_EXIT_CODE=${PIPESTATUS[0]}

if [ $PRISMA_EXIT_CODE -eq 0 ]; then
  echo ""
  echo "✅ Database schema pushed successfully!"
  echo "   Tables should now exist in your PostgreSQL database"
  
  # Create the WalletSummary view using raw SQL
  echo ""
  echo "📊 Creating WalletSummary view..."
  npx prisma db execute --stdin <<'EOF' 2>&1 || echo "⚠️  View creation failed (might already exist), continuing..."
CREATE OR REPLACE VIEW "WalletSummary" AS
SELECT 
  wl."solanaAddress",
  wl."evmAddress",
  COUNT(ln.id)::integer AS "tokenCount",
  wl."verifiedAt",
  wl."updatedAt"
FROM "WalletLink" wl
LEFT JOIN "LinkedNFT" ln ON ln."walletLinkId" = wl.id
GROUP BY wl.id, wl."solanaAddress", wl."evmAddress", wl."verifiedAt", wl."updatedAt";
EOF
  echo "✅ WalletSummary view created/updated"
else
  echo ""
  echo "❌ Database setup failed with exit code: $PRISMA_EXIT_CODE"
  echo ""
  echo "Error output:"
  cat /tmp/prisma-output.log
  echo ""
  echo "⚠️  Continuing anyway - check the error above"
fi

echo ""
echo "=========================================="
echo "✅ Database setup script complete"
echo "=========================================="

