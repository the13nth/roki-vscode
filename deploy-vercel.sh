#!/bin/bash

echo "🚀 Deploying AI Project Manager to Vercel..."

# Check if we're in the right directory
if [ ! -f "web-dashboard/package.json" ]; then
    echo "❌ Error: Run this script from the project root directory"
    exit 1
fi

# Check if Vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo "📦 Installing Vercel CLI..."
    npm i -g vercel
fi

echo "🔧 Setting up Vercel project for monorepo..."

# Deploy to Vercel from root (monorepo setup)
echo "🚀 Deploying to Vercel..."
vercel --prod

echo "✅ Deployment completed!"
echo ""
echo "🎉 Your AI Project Manager is now deployed on Vercel!"
echo "📊 View deployment details: https://vercel.com/dashboard"
echo ""
echo "🔗 Next steps:"
echo "1. Update your environment variables in Vercel dashboard"
echo "2. Configure your custom domain (if needed)"
echo "3. Test all features in the deployed environment"
