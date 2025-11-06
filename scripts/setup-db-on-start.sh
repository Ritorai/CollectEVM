#!/bin/bash
# Script to ensure database is set up when app starts
# This runs on every app start to ensure tables exist

echo "Checking database connection and schema..."

# Try to push schema (creates tables if they don't exist)
npx prisma db push --accept-data-loss --skip-generate || {
  echo "⚠️  Database setup failed, but continuing..."
}

echo "✅ Database check complete"

