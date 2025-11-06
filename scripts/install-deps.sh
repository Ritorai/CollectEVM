#!/bin/bash
# Installation script that handles the usb package gracefully

set -e

echo "Installing dependencies..."

# Try normal install first
if npm ci; then
  echo "✅ Dependencies installed successfully"
  exit 0
fi

echo "⚠️  Initial install failed, trying with ignored scripts..."

# If that fails, install without scripts and then run postinstall manually
npm ci --ignore-scripts || {
  echo "❌ Installation failed even with ignored scripts"
  exit 1
}

# Run postinstall manually (for Prisma)
echo "Running postinstall scripts..."
npm run postinstall || echo "⚠️  Postinstall failed, continuing..."

# Push database schema (create tables if they don't exist)
echo "Setting up database schema..."
npx prisma db push --accept-data-loss || echo "⚠️  Database setup failed, continuing..."

echo "✅ Dependencies installed (some scripts may have been skipped)"

