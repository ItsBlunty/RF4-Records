#!/bin/bash

# RF4 Records Environment Loader
# Loads the appropriate environment file based on environment

ENV_TYPE=${1:-development}
BACKEND_DIR="./RF4 Records/backend"

if [ "$ENV_TYPE" = "production" ]; then
    ENV_FILE="$BACKEND_DIR/.env.production"
elif [ "$ENV_TYPE" = "development" ] || [ "$ENV_TYPE" = "dev" ]; then
    ENV_FILE="$BACKEND_DIR/.env.development"
else
    echo "Usage: $0 [development|production]"
    exit 1
fi

if [ ! -f "$ENV_FILE" ]; then
    echo "❌ Environment file not found: $ENV_FILE"
    exit 1
fi

echo "🔧 Loading environment: $ENV_TYPE"
echo "📄 From file: $ENV_FILE"

# Export all variables from the env file
set -a
source "$ENV_FILE"
set +a

echo "✅ Environment loaded successfully"
echo "   Database: $PGDATABASE at $PGHOST:$PGPORT"