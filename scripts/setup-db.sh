#!/bin/bash

# Database Setup Script for CollectEVM
# This script helps set up the PostgreSQL database

echo "🚀 CollectEVM Database Setup"
echo "=============================="
echo ""

# Check if .env file exists
if [ ! -f .env ]; then
    echo "❌ Error: .env file not found"
    echo "Please copy env.example to .env and configure it first:"
    echo "  cp env.example .env"
    exit 1
fi

# Check if DATABASE_URL is set
if ! grep -q "DATABASE_URL=" .env; then
    echo "❌ Error: DATABASE_URL not found in .env"
    echo "Please add your PostgreSQL connection string to .env"
    exit 1
fi

echo "✅ Environment file found"
echo ""

# Generate Prisma Client
echo "📦 Generating Prisma Client..."
npx prisma generate

if [ $? -eq 0 ]; then
    echo "✅ Prisma Client generated"
else
    echo "❌ Failed to generate Prisma Client"
    exit 1
fi

echo ""

# Push database schema
echo "📤 Pushing database schema..."
npx prisma db push

if [ $? -eq 0 ]; then
    echo "✅ Database schema created"
else
    echo "❌ Failed to create database schema"
    echo "Please check your DATABASE_URL and ensure PostgreSQL is running"
    exit 1
fi

echo ""
echo "✅ Database setup complete!"
echo ""
echo "Next steps:"
echo "  1. Update WASSIEVERSE_COLLECTION_ADDRESS in .env"
echo "  2. Update NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID in .env"
echo "  3. Run 'npm run dev' to start the development server"
echo ""
echo "Optional: Run 'npx prisma studio' to view your database"

