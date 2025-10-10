# Database Setup Script for CollectEVM (PowerShell)
# This script helps set up the PostgreSQL database on Windows

Write-Host "🚀 CollectEVM Database Setup" -ForegroundColor Cyan
Write-Host "==============================" -ForegroundColor Cyan
Write-Host ""

# Check if .env file exists
if (-not (Test-Path .env)) {
    Write-Host "❌ Error: .env file not found" -ForegroundColor Red
    Write-Host "Please copy env.example to .env and configure it first:"
    Write-Host "  Copy-Item env.example .env"
    exit 1
}

# Check if DATABASE_URL is set
$envContent = Get-Content .env
if ($envContent -notmatch "DATABASE_URL=") {
    Write-Host "❌ Error: DATABASE_URL not found in .env" -ForegroundColor Red
    Write-Host "Please add your PostgreSQL connection string to .env"
    exit 1
}

Write-Host "✅ Environment file found" -ForegroundColor Green
Write-Host ""

# Generate Prisma Client
Write-Host "📦 Generating Prisma Client..." -ForegroundColor Yellow
npx prisma generate

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Prisma Client generated" -ForegroundColor Green
} else {
    Write-Host "❌ Failed to generate Prisma Client" -ForegroundColor Red
    exit 1
}

Write-Host ""

# Push database schema
Write-Host "📤 Pushing database schema..." -ForegroundColor Yellow
npx prisma db push

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Database schema created" -ForegroundColor Green
} else {
    Write-Host "❌ Failed to create database schema" -ForegroundColor Red
    Write-Host "Please check your DATABASE_URL and ensure PostgreSQL is running"
    exit 1
}

Write-Host ""
Write-Host "✅ Database setup complete!" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:"
Write-Host "  1. Update WASSIEVERSE_COLLECTION_ADDRESS in .env"
Write-Host "  2. Update NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID in .env"
Write-Host "  3. Run 'npm run dev' to start the development server"
Write-Host ""
Write-Host "Optional: Run 'npx prisma studio' to view your database"

