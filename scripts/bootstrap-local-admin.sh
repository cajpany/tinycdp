#!/bin/bash

# Bootstrap script to create a local admin API key via direct database insertion
# This bypasses the Encore runtime issues for local development

echo "🔧 Bootstrapping local admin API key..."

# Generate a simple admin key for local development
ADMIN_KEY="local-admin-$(openssl rand -hex 16)"
KEY_HASH=$(echo -n "$ADMIN_KEY" | shasum -a 256 | cut -d' ' -f1)

echo "Generated admin key: $ADMIN_KEY"
echo "Key hash: $KEY_HASH"

# Insert directly into database via encore db exec
echo "Inserting admin key into database..."

cd backend

# Insert the key into the database
encore db exec -- "INSERT INTO api_keys (kind, key_hash) VALUES ('admin', '$KEY_HASH')" 2>/dev/null

if [ $? -eq 0 ]; then
    echo "✅ Admin key created successfully!"
    echo ""
    echo "🔑 Your local admin API key is:"
    echo "$ADMIN_KEY"
    echo ""
    echo "💡 Use this key in your local frontend dashboard (Settings page)"
    echo "📝 Test it with: curl -H \"Authorization: Bearer $ADMIN_KEY\" http://localhost:4000/admin/health"
else
    echo "❌ Failed to create admin key. Make sure Encore is running and database is accessible."
    exit 1
fi
