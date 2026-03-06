# Testing Guide: Dataset Management View (P02)

## Quick Start

1. Navigate to the application
2. Click "📁 Datasets" in the left sidebar
3. You should see the Dataset Management page with 6 dataset cards

## Test Scenarios

### 1. Browse All Datasets
**Action**: View the default page load
**Expected**:
- See 6 dataset cards in a grid
- Stats bar shows: 6 total, 4 ready, 1,055 conversations, 6,466 pairs
- Cards sorted by "Newest First" by default
- Each card shows name, date, metrics, and action buttons

### 2. Search Functionality
**Test A**: Search by name
- Type "Elena" in search box
- Should show only "Financial Planning - Elena Morales" dataset

**Test B**: Search by consultant
- Type "Marcus" in search box
- Should show only "Career Transition Coaching - Marcus Chen" dataset

**Test C**: Search by vertical
- Type "Coach" in search box
- Should show 2 datasets (Career Coach and Executive Coach)

**Test D**: Clear search
- Click the × in the search pill or clear the input
- Should return to showing all 6 datasets

### 3. Sort Functionality
**Test all 8 sort options**:
1. **Newest First** (default): Elena Morales → James Rodriguez → ... → Lisa Anderson
2. **Oldest First**: Lisa Anderson → Dr. Sarah Williams → ... → Elena Morales
3. **Name (A-Z)**: Career... → Elena... → Executive... → Mental... → Nutritional... → Small Business...
4. **Name (Z-A)**: Reverse of above
5. **Highest Quality**: Dr. Sarah Williams (4.5) → Elena Morales (4.2) → ... → Lisa Anderson (2.8)
6. **Lowest Quality**: Lisa Anderson (2.8) → ... → Dr. Sarah Williams (4.5)
7. **Most Pairs**: Elena Morales (1,567) → Lisa Anderson (1,345) → ... → James Rodriguez (432)
8. **Fewest Pairs**: James Rodriguez (432) → ... → Elena Morales (1,567)

### 4. Filter by Format
**Test A**: Filter to v4 only
- Click "Filters" button
- Check "v4 Only"
- Should show 5 datasets (all except Lisa Anderson)
- See "Format: brightrun-lora-v4" pill below filters

**Test B**: Filter to v3 only
- Click "Filters" button
- Check "v3 Only (Legacy)"
- Should show 1 dataset (Lisa Anderson)
- See "Format: brightrun-lora-v3" pill

### 5. Filter by Training Readiness
**Test A**: Show only ready datasets
- Click "Filters" button
- Check "Ready Only"
- Should show 4 datasets (Elena, Marcus, Sarah, Amanda)
- All show green "Ready for Training" badge

**Test B**: Show only needs review
- Click "Filters" button
- Check "Needs Review"
- Should show 2 datasets (James Rodriguez, Lisa Anderson)
- Both show yellow "Review Recommended" badge with issues listed

### 6. Combined Filters
**Test**: Apply multiple filters
- Search: "Financial"
- Filter: "Ready Only"
- Sort: "Highest Quality"
- Should show only Elena Morales dataset
- See all 3 active filter pills

### 7. Clear Filters
**Test A**: Clear individual filter
- Apply format and readiness filters
- Click × on one filter pill
- That filter should clear, others remain

**Test B**: Clear all filters
- Apply multiple filters
- Click "Clear all" button or "Clear All Filters" in dropdown
- All filters should clear, showing all 6 datasets

### 8. Empty State
**Test A**: No search results
- Type "xyz123" in search box
- Should see empty state: "No datasets found"
- Message: "No datasets match your current filters..."
- "Clear Filters" button shown

**Test B**: No filter results
- Filter to v3 format AND Ready Only
- Should see empty state (Lisa Anderson is v3 but not ready)

### 9. View Dataset Details
**Test**: Open detail modal
1. Click "View Details" on any dataset card
2. Modal should open with 4 tabs
3. Default tab: "Overview"

**Tab 1: Overview**
- 4 metric cards (conversations, pairs, quality, file size)
- Training Readiness section with 4 criteria (checkmarks or X marks)
- Created and Last Modified dates

**Tab 2: Scaffolding**
- 3 persona sections (Anxious Planner, Overwhelmed Avoider, Pragmatic Optimist)
- Each persona shows 7 emotional arcs with progress bars
- Hover over bars to see exact counts

**Tab 3: Conversations**
- Shows 3 sample conversations
- Each has title, persona dot, arc name, turn count
- "View All Conversations" button at bottom

**Tab 4: Metadata**
- File Information section (storage path, size, format)
- Dataset Metadata JSON preview (scrollable)
- "Export Metadata" button

### 10. Start Training Flow
**Test A**: Start training from card
1. Find a "Ready for Training" dataset (green badge)
2. Click "Start Training" button
3. Should see alert with dataset name and ID
4. Alert explains this would navigate to P03

**Test B**: Start training from modal
1. Click "View Details" on ready dataset
2. View any tab
3. Click "Start Training" button in modal footer
4. Should see same alert as Test A
5. Modal should close

**Test C**: Disabled button
1. Find a "Needs Review" dataset (yellow badge)
2. "Start Training" button should be disabled (grayed out)
3. Hovering shows cursor: not-allowed

### 11. Visual Design Elements
**Test hover effects**:
- Hover over dataset card → subtle shadow + scale 1.02
- Hover over persona bar in scaffolding preview → tooltip with name and count
- Hover over buttons → background color change

**Test color coding**:
- Quality 4.2 → Blue text
- Quality 4.5 → Green text
- Quality 2.8 → Red text
- Quality 3.2 → Yellow text

**Test badges**:
- v4 format → Green badge
- v3 format → Gray badge
- Vertical → Outlined badge

### 12. Responsive Layout
**Test breakpoints**:
1. **Desktop (≥1024px)**: 3-column grid
2. **Tablet (768-1023px)**: 2-column grid
3. **Mobile (<768px)**: 1-column grid

### 13. Stats Dashboard
**Verify numbers**:
- Total Datasets: 6
- Ready for Training: 4 (green text)
- Total Conversations: 1,055
- Total Training Pairs: 6,466

### 14. Date and Size Formatting
**Check formatting**:
- Dates: "Dec 1, 2024" format
- File sizes: "4.5 MB" format
- Numbers: "1,567" with commas

### 15. Integration with P01 Shell
**Verify shell elements**:
- Breadcrumb shows: "Home > Datasets"
- Sidebar "Datasets" item is highlighted/active
- Header shows active training jobs (from P01)
- Cost tracker visible in header (from P01)
- Notifications accessible (from P01)

## Edge Cases to Test

### Data Variations
- ✅ Dataset with 0% human review (acceptable)
- ✅ Dataset with low quality score (shown in red)
- ✅ Dataset with insufficient pairs (warning shown)
- ✅ Legacy v3 format (warning shown)
- ✅ Multiple readiness issues (both listed in card)

### UI Edge Cases
- Long dataset names → truncated with ellipsis at 40 chars
- No datasets → empty state with "Create Your First Dataset" CTA
- Modal scroll → content area scrollable, header/footer fixed

## Expected Mock Data

### All 6 Datasets
1. **Elena Morales** - Financial Planning (Ready, 1567 pairs, 4.2 quality)
2. **Marcus Chen** - Career Coaching (Ready, 1243 pairs, 3.8 quality)
3. **Dr. Sarah Williams** - Executive Leadership (Ready, 987 pairs, 4.5 quality)
4. **James Rodriguez** - Tax Advisory (Not Ready, 432 pairs, 3.2 quality)
5. **Lisa Anderson** - Mental Health (Not Ready, v3, 1345 pairs, 2.8 quality)
6. **Amanda Foster** - Nutritional Coaching (Ready, 892 pairs, 3.9 quality)

## Pass Criteria

All tests should:
- ✅ Load without errors
- ✅ Display correct data
- ✅ Respond to user interactions
- ✅ Show appropriate visual feedback
- ✅ Maintain responsive layout
- ✅ Navigate correctly (alert shows for P03 navigation)

## Reporting Issues

If any test fails, note:
1. Which test scenario
2. Expected behavior
3. Actual behavior
4. Browser/device
5. Console errors (if any)

---

**Testing Time Estimate**: 15-20 minutes for complete coverage
**Priority Tests**: Scenarios 1, 2, 3, 6, 9, 10 (core functionality)
