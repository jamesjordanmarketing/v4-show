# Adapter Application Module - E06B Quick Start

**Section:** E06B - Integration Testing & Production Verification  
**Purpose:** Quick reference for running verification and deployment  
**Last Updated:** January 17, 2026  

---

## Quick Commands

### Run All Verification Checks

```bash
cd "c:/Users/james/Master/BrightHub/BRun/v4-show"

# 1. Environment Check
node scripts/verify-adapter-env.js

# 2. Integration Tests
node scripts/test-adapter-integration.js

# 3. TypeScript Compilation
cd src && npx tsc --noEmit

# 4. ESLint Check
cd src && npx eslint lib/services/*.ts hooks/useAdapterTesting.ts components/pipeline/*.tsx --max-warnings=0
```

---

## Verification Checklist

### Quick Pre-Deployment Check

```bash
# Run this single command for quick verification
cd src && \
  npx tsc --noEmit && \
  npx eslint lib/services/*.ts hooks/useAdapterTesting.ts components/pipeline/*.tsx --max-warnings=0 && \
  cd .. && \
  node scripts/test-adapter-integration.js && \
  echo "✅ All checks passed - ready for deployment"
```

**Expected Output:**
- TypeScript: 0 errors
- ESLint: 0 warnings
- Integration: 10/11 tests pass
- Status: ✅ Production Ready

---

## Common Tasks

### 1. Run Integration Tests

```bash
node scripts/test-adapter-integration.js
```

**What it checks:**
- Environment variables (informational)
- TypeScript compilation
- File existence (all implementation files)
- Exports (components and hooks)
- Documentation completeness

**Expected:** 10/11 tests pass (RUNPOD_API_KEY optional in dev)

---

### 2. Verify Environment Variables

```bash
node scripts/verify-adapter-env.js
```

**What it checks:**
- Required: Supabase URL, Anon Key, Service Key
- Required: RunPod API Key
- Optional: Anthropic API Key (for Claude evaluation)

**Add missing variables to `.env.local`**

---

### 3. Check Code Quality

```bash
# TypeScript
cd src && npx tsc --noEmit

# ESLint
cd src && npx eslint lib/services/*.ts hooks/*.ts components/pipeline/*.tsx --max-warnings=0
```

**Expected:**
- 0 TypeScript errors
- 0 ESLint warnings

---

### 4. Verify Database Migration

```bash
# Check if migration file exists
ls -lh supabase/migrations/20260117_create_adapter_testing_tables.sql

# Apply to local database
supabase db reset

# Apply to remote database
supabase db push
```

**What it creates:**
- `inference_endpoints` table
- `adapter_test_results` table
- `base_models` table (with seed data)
- RLS policies on all tables

---

## Deployment Quick Start

### Staging Deployment

```bash
# 1. Verify everything passes
node scripts/test-adapter-integration.js

# 2. Commit changes
git add .
git commit -m "Complete Adapter Module - E06B verification"

# 3. Push to staging
git push staging main

# 4. Wait for deployment (check Vercel dashboard)

# 5. Test on staging
# Visit: https://staging.yourapp.com/pipeline/jobs/[test-job-id]/results
```

---

### Production Deployment

```bash
# 1. Ensure RUNPOD_API_KEY is set in production environment
# (Vercel: Project Settings → Environment Variables)

# 2. Verify all checks pass
node scripts/test-adapter-integration.js

# 3. Review deployment checklist
cat docs/ADAPTER_DEPLOYMENT_CHECKLIST.md

# 4. Merge to main
git checkout main
git merge staging
git push origin main

# 5. Monitor deployment
# Check logs, error rates, performance metrics
```

---

## Troubleshooting

### Integration Tests Fail

**Issue:** TypeScript compilation fails

**Solution:**
```bash
cd src
npx tsc --noEmit 2>&1 | head -20
# Fix errors shown
```

---

**Issue:** ESLint warnings

**Solution:**
```bash
cd src
npx eslint lib/services/*.ts --fix
npx eslint hooks/*.ts --fix
npx eslint components/pipeline/*.tsx --fix
```

---

**Issue:** Files missing

**Solution:**
- Check git status: `git status`
- Ensure all E01-E05B sections complete
- Review section completion docs in `docs/`

---

### Environment Variable Issues

**Issue:** RUNPOD_API_KEY not set

**Solution:**
```bash
# Development: Add to .env.local
echo "RUNPOD_API_KEY=your_key_here" >> .env.local

# Production: Add via Vercel dashboard
# Project Settings → Environment Variables → Add Variable
```

---

**Issue:** Anthropic API Key not set

**Solution:**
- Optional for development
- Feature will be disabled if not set
- Add to .env.local if you want Claude evaluation:
  ```bash
  echo "ANTHROPIC_API_KEY=your_key_here" >> .env.local
  ```

---

## Documentation Reference

### Quick Links

| Document | Purpose |
|----------|---------|
| `ADAPTER_E06B_COMPLETE.md` | Complete E06B documentation |
| `ADAPTER_DEPLOYMENT_CHECKLIST.md` | Deployment steps |
| `ADAPTER_PRODUCTION_README.md` | Production operations guide |
| `ADAPTER_MODULE_COMPLETE.md` | Complete module overview |

### All Section Docs

- E01: `docs/ADAPTER_E01_COMPLETE.md`
- E02: `docs/ADAPTER_E02_COMPLETE.md`
- E03: `docs/ADAPTER_E03_COMPLETE.md`
- E04B: `docs/ADAPTER_E04_COMPLETE.md`
- E05B: `docs/ADAPTER_E05B_COMPLETE.md`
- E06B: `docs/ADAPTER_E06B_COMPLETE.md`

---

## Quick Status Check

Run this to get a quick overview:

```bash
echo "=== Adapter Module Status ===" && \
echo "" && \
echo "Files:" && \
ls -1 src/lib/services/inference-service.ts \
      src/lib/services/test-service.ts \
      src/hooks/useAdapterTesting.ts \
      src/components/pipeline/DeployAdapterButton.tsx \
      src/components/pipeline/ABTestingPanel.tsx \
      2>/dev/null | wc -l | xargs -I{} echo "  Implementation files: {}/5" && \
echo "" && \
echo "Documentation:" && \
ls -1 docs/ADAPTER_E*_COMPLETE.md 2>/dev/null | wc -l | xargs -I{} echo "  Section docs: {}/6" && \
echo "" && \
echo "Code Quality:" && \
cd src && npx tsc --noEmit 2>&1 > /dev/null && echo "  TypeScript: ✓ Compiles" || echo "  TypeScript: ✗ Errors" && \
cd .. && \
echo "" && \
echo "Status: Ready for verification"
```

---

**Version:** 1.0  
**Last Updated:** January 17, 2026  
**Status:** Complete  
