#!/bin/bash

# Deploy Edge Functions for LoRA Training Pipeline
# Section E02: Dataset Management

echo "🚀 Deploying Edge Functions..."
echo ""

# Deploy validate-datasets function
echo "📦 Deploying validate-datasets function..."
supabase functions deploy validate-datasets

if [ $? -eq 0 ]; then
  echo "✅ validate-datasets deployed successfully"
else
  echo "❌ Failed to deploy validate-datasets"
  exit 1
fi

echo ""
echo "✅ All Edge Functions deployed!"
echo ""
echo "📋 Next steps:"
echo "1. Configure Cron trigger in Supabase Dashboard:"
echo "   - Navigate to Database → Cron Jobs"
echo "   - Create new job with schedule: * * * * * (every 1 minute)"
echo "   - Target function: validate-datasets"
echo ""
echo "2. Verify deployment:"
echo "   supabase functions invoke validate-datasets --no-verify-jwt"
echo ""
echo "3. Check logs:"
echo "   supabase functions logs validate-datasets"

