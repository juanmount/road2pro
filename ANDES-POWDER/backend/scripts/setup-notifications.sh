#!/bin/bash

# Setup Push Notifications for Andes Powder
# This script creates the necessary tables in your database

echo "🔔 Setting up Push Notifications for Andes Powder..."
echo ""

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
  echo "❌ ERROR: DATABASE_URL environment variable is not set"
  echo ""
  echo "Please set it first:"
  echo "  export DATABASE_URL='postgresql://user:pass@host:5432/dbname'"
  echo ""
  echo "Or if using .env file, source it first:"
  echo "  source .env"
  exit 1
fi

echo "✅ DATABASE_URL found"
echo ""

# Execute the schema
echo "📝 Creating tables and indexes..."
psql "$DATABASE_URL" -f database/push-notifications-schema.sql

if [ $? -eq 0 ]; then
  echo ""
  echo "✅ Push notifications setup complete!"
  echo ""
  echo "Tables created:"
  echo "  - push_tokens"
  echo "  - user_preferences"
  echo "  - users (if not exists)"
  echo ""
  echo "Next steps:"
  echo "  1. Start your backend server: npm start"
  echo "  2. Install the mobile app APK on your device"
  echo "  3. Open the app and go to Alertas tab"
  echo "  4. Tap 'Activar Notificaciones' to register"
  echo ""
else
  echo ""
  echo "❌ Error creating tables. Please check your DATABASE_URL and try again."
  exit 1
fi
