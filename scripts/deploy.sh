#!/bin/bash

# Print fancy header
echo "┌───────────────────────────────────────────────┐"
echo "│                                               │"
echo "│   Agent Flow Builder Deployment Script        │"
echo "│                                               │"
echo "└───────────────────────────────────────────────┘"

# Set environment variable for production build
export NODE_ENV=production

# Step 1: Build the frontend
echo "📦 Building frontend..."
npm run build
if [ $? -ne 0 ]; then
  echo "❌ Frontend build failed. Aborting deployment."
  exit 1
fi
echo "✅ Frontend build completed successfully."

# Step 2: Deploy the API to Vercel
echo "🚀 Deploying API to Vercel..."
echo "This will deploy the API to Vercel using src/server/vercel.mjs as the entry point."
vercel --prod
if [ $? -ne 0 ]; then
  echo "❌ API deployment failed."
  exit 1
fi
echo "✅ API deployment completed successfully."

# Get the API URL from Vercel (note: this is a simplistic approach)
API_URL=$(vercel ls -json | grep -o '"url":"[^"]*"' | head -1 | cut -d'"' -f4)
echo "🔗 API URL: $API_URL"

# Step 3: Update the config.ts file with the new API URL
echo "📝 Updating config.ts with the API URL..."
sed -i '' "s|: 'https://.*'|: '$API_URL'|" src/config.ts

# Step 4: Rebuild the frontend with the updated API URL
echo "📦 Rebuilding frontend with updated API URL..."
npm run build
if [ $? -ne 0 ]; then
  echo "❌ Frontend rebuild failed."
  exit 1
fi
echo "✅ Frontend rebuild completed successfully."

# Step 5: Deploy the frontend to Vercel
echo "🚀 Deploying frontend to Vercel..."
vercel --prod
if [ $? -ne 0 ]; then
  echo "❌ Frontend deployment failed."
  exit 1
fi
echo "✅ Frontend deployment completed successfully."

echo "┌───────────────────────────────────────────────┐"
echo "│                                               │"
echo "│   Deployment Completed Successfully!          │"
echo "│                                               │"
echo "└───────────────────────────────────────────────┘" 