# LoRA Training Routing Issues - Found & Fixed

**Date:** December 31, 2025  
**Status:** Partially Fixed

---

## ✅ Fixed Issues

### 1. Missing "Import from Training File" Button
**Location:** `/datasets` page  
**Issue:** Tutorial mentioned Import button, but it wasn't visible on the page  
**Fix:** Added Import button with proper routing to `/datasets/import`  
**Commit:** a5299f2

### 2. "Start Training" Button Broken Routing
**Location:** Dataset cards on `/datasets` page  
**Issue:** "Start Training" button used same handler as "View Details", navigating to non-existent `/datasets/[id]` page instead of training configuration  
**Fix:** 
- Separated handlers: `onSelect` for View Details, `onStartTraining` for training
- Start Training now navigates to `/training/configure?datasetId=[id]`  
**Commit:** a5299f2

### 3. Icon Import Error
**Location:** `/datasets` page  
**Issue:** Tried to import `FileImport` from lucide-react which doesn't exist  
**Fix:** Changed to use `Download` icon instead  
**Commit:** a5299f2

---

## ⚠️ Missing Pages (Need Creation)

### 1. Dataset Details Page
**Expected Route:** `/datasets/[id]`  
**Referenced By:** 
- "View Details" button on dataset cards
- Tutorial section on reviewing validation results

**What It Should Show:**
- Dataset metadata (name, description, file size)
- Validation status and results
- Statistics (training pairs, tokens, avg turns)
- Validation errors (if any)
- Sample data preview
- Actions: Start Training, Delete, Download

**Priority:** HIGH - Users can't view dataset details currently

---

### 2. Training Jobs List Page
**Expected Route:** `/training/jobs`  
**Referenced By:**
- Tutorial mentions browsing all training jobs
- Dashboard "Training Jobs" button (if it exists)

**What It Should Show:**
- List of all user's training jobs
- Filter by status: All, Queued, Running, Completed, Failed
- Job cards showing: name, status, progress, cost
- Click to view individual job details

**Priority:** MEDIUM - Job monitoring exists at `/training/jobs/[jobId]`, but no list view

---

### 3. Costs Analytics Page
**Expected Route:** `/costs`  
**Referenced By:**
- Dashboard "Costs" button (added in recent commit)
- Tutorial Part 6: Cost Management section

**What It Should Show:**
- Total spend dashboard
- Trend charts (daily, weekly, monthly)
- Date range filters
- Cost breakdown by job, GPU type, status
- Export CSV functionality

**Priority:** MEDIUM - Referenced by dashboard button

---

### 4. Models List Page  
**Expected Route:** `/models` ✅ **EXISTS**
**Status:** Already implemented  
**No action needed**

---

### 5. Training Configuration Page
**Expected Route:** `/training/configure` ✅ **EXISTS**  
**Status:** Already implemented  
**No action needed**

---

### 6. Individual Training Job Monitor
**Expected Route:** `/training/jobs/[jobId]` ✅ **EXISTS**  
**Status:** Already implemented  
**No action needed**

---

### 7. Dataset Import Page
**Expected Route:** `/datasets/import` ✅ **EXISTS**  
**Status:** Already implemented  
**No action needed**

---

## 📋 Implementation Priority

### Priority 1 (Critical - Blocks User Flow)
1. **Dataset Details Page** (`/datasets/[id]`)
   - User clicks "View Details" and gets 404
   - Needed to review validation results
   - Needed before starting training

### Priority 2 (Important - Referenced by UI)
2. **Costs Page** (`/costs`)
   - Dashboard button added but page doesn't exist
   - Tutorial section
 references it
3. **Training Jobs List** (`/training/jobs`)
   - Users can't see all their jobs at once
   - Currently only individual job view exists

### Priority 3 (Nice to Have)
- None currently

---

## 🔧 Recommended Actions

### For Dataset Details Page
**Create:** `src/app/(dashboard)/datasets/[id]/page.tsx`

**API Endpoint Needed:** `GET /api/datasets/[id]` - probably already exists

**Components to Reuse:**
- Badge for status
- Card for sections
- Button for actions

**Example Structure:**
```tsx
'use client';

import { useDataset } from '@/hooks/use-datasets';

export default function DatasetDetailsPage({ params }: { params: { id: string } }) {
  const { data, isLoading } = useDataset(params.id);
  
  // Show dataset info, validation results, stats, sample data
  // Actions: Start Training, Delete, Back to Datasets
}
```

---

### For Costs Page
**Create:** `src/app/(dashboard)/costs/page.tsx`

**API Endpoint:** `GET /api/costs` - already exists (referenced in tutorial)

**Components:**
- Chart library (recharts - already in dependencies)
- Date range picker
- Cost breakdown table
- Export button

---

### For Training Jobs List
**Create:** `src/app/(dashboard)/training/jobs/page.tsx`

**API Endpoint:** `GET /api/jobs` - already exists

**Components:**
- Job cards (similar to dataset cards)
- Status filters
- Search functionality

---

## 🎯 Quick Win Summary

**Fixed Today:**
- ✅ Import button added
- ✅ Start Training routing fixed
- ✅ Separated View Details vs Start Training actions

**Still Broken:**
- ❌ `/datasets/[id]` - 404 error
- ❌ `/costs` - 404 error (dashboard button added)
- ❌ `/training/jobs` - 404 error (no list view)

**Estimated Work:**
- Dataset Details: ~2 hours
- Costs Page: ~3 hours (charts + export)
- Training Jobs List: ~1.5 hours

**Total:** ~6.5 hours to complete all missing pages

---

**Last Updated:** December 31, 2025  
**Commit:** a5299f2
