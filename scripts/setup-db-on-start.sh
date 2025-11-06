#!/bin/bash
# Script to ensure database is set up when app starts
# This runs on every app start to ensure tables exist

echo "🔍 Checking database connection and schema..."

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
  echo "⚠️  DATABASE_URL not set, skipping database setup"
  exit 0
fi

# Try to push schema (creates tables if they don't exist)
echo "📦 Pushing database schema..."
npx prisma db push --accept-data-loss --skip-generate || {
  echo "⚠️  Database setup failed, but continuing..."
  echo "Error details:"
  npx prisma db push --accept-data-loss --skip-generate 2>&1 || true
}

echo "✅ Database check complete"

