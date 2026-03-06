# SAOL Section for E01 Execution Prompts

This file contains the SAOL Quick Reference section to add to the E01 execution prompts file.

---

## PART 1: SAOL SECTION TO COPY

Copy everything below this line (starting from the `---` separator):

---

## 🔍 Supabase Agent Ops Library (SAOL) - Database Operations Tool

**Version:** 2.1 (Bug Fixes Applied - December 6, 2025)

### ⚠️ CRITICAL: Use SAOL for ALL Database Operations

**You MUST use the Supabase Agent Ops Library (SAOL) for ALL database operations in this prompt.**  
Do not use raw `supabase-js` or manual PostgreSQL scripts for database verification or testing. SAOL is safe, robust, and handles edge cases automatically.

### What is SAOL?

SAOL is a tested, production-ready library for database operations that:
- ✅ Handles special characters and edge cases automatically
- ✅ Provides consistent error handling
- ✅ Includes deep schema introspection
- ✅ Works with Service Role Key for admin operations
- ✅ No manual SQL escaping required

**Library Location:** `supa-agent-ops/`  
**Documentation:** `supa-agent-ops/QUICK_START.md` (READ THIS FIRST)  
**Troubleshooting:** `supa-agent-ops/TROUBLESHOOTING.md`

---

### Setup & Prerequisites

**Installation Status:** ✅ Already available in project

**Environment Required:**
```bash
# Ensure these are set in .env.local
NEXT_PUBLIC_SUPABASE_URL=your-project-url
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

**Key Rules:**
1. **Use Service Role Key:** SAOL operations require admin privileges
2. **Run Preflight:** Always run `agentPreflight({ table })` before modifying data
3. **No Manual Escaping:** SAOL handles special characters automatically
4. **Parameter Flexibility:** Accepts both `where`/`column` (recommended) and `filters`/`field` (backward compatible)

---

### Quick Reference: One-Liner Commands

**Note:** All examples updated for SAOL v2.1 with bug fixes applied.

#### Verify Tables Exist (After Migration)

```bash
# Check if datasets table exists
cd "c:/Users/james/Master/BrightHub/BRun/v4-show/supa-agent-ops" && node -e "require('dotenv').config({path:'../.env.local'});const saol=require('.');(async()=>{const r=await saol.agentIntrospectSchema({table:'datasets',transport:'pg'});console.log('Table exists:',r.success);if(r.success){console.log('Columns:',r.data.columns.map(c=>c.name).join(', '));}})();"

# Check all LoRA training tables
cd "c:/Users/james/Master/BrightHub/BRun/v4-show/supa-agent-ops" && node -e "require('dotenv').config({path:'../.env.local'});const saol=require('.');(async()=>{const tables=['datasets','training_jobs','metrics_points','model_artifacts','cost_records','notifications'];for(const t of tables){const r=await saol.agentIntrospectSchema({table:t,transport:'pg'});console.log(t+':',r.success?'✅':'❌');}})();"
```

#### Query Tables (Verify Data)

```bash
# Check datasets table (all columns)
cd "c:/Users/james/Master/BrightHub/BRun/v4-show/supa-agent-ops" && node -e "require('dotenv').config({path:'../.env.local'});const saol=require('.');(async()=>{const r=await saol.agentQuery({table:'datasets',limit:5});console.log('Success:',r.success);console.log('Count:',r.data.length);console.log(JSON.stringify(r.data,null,2));})();"

# Check datasets with specific columns and filtering
cd "c:/Users/james/Master/BrightHub/BRun/v4-show/supa-agent-ops" && node -e "require('dotenv').config({path:'../.env.local'});const saol=require('.');(async()=>{const r=await saol.agentQuery({table:'datasets',select:'id,name,status,training_ready,created_at',where:[{column:'status',operator:'eq',value:'ready'}],orderBy:[{column:'created_at',asc:false}],limit:10});console.log('Ready datasets:',r.data.length);r.data.forEach(d=>console.log('-',d.name,'/',d.status));})();"

# Check training_jobs table
cd "c:/Users/james/Master/BrightHub/BRun/v4-show/supa-agent-ops" && node -e "require('dotenv').config({path:'../.env.local'});const saol=require('.');(async()=>{const r=await saol.agentQuery({table:'training_jobs',select:'id,status,progress,current_epoch,total_epochs,created_at',orderBy:[{column:'created_at',asc:false}],limit:5});console.log('Training jobs:',r.data.length);r.data.forEach(j=>console.log('-',j.id.slice(0,8),'/',j.status,'/',j.progress+'%'));})();"
```

#### Deep Schema Introspection

```bash
# Get complete schema details for datasets table
cd "c:/Users/james/Master/BrightHub/BRun/v4-show/supa-agent-ops" && node -e "require('dotenv').config({path:'../.env.local'});const saol=require('.');(async()=>{const r=await saol.agentIntrospectSchema({table:'datasets',transport:'pg'});console.log(JSON.stringify(r,null,2));})();"

# Check RLS policies on datasets
cd "c:/Users/james/Master/BrightHub/BRun/v4-show/supa-agent-ops" && node -e "require('dotenv').config({path:'../.env.local'});const saol=require('.');(async()=>{const r=await saol.agentIntrospectSchema({table:'datasets',transport:'pg'});if(r.success){console.log('RLS Enabled:',r.data.rlsEnabled);console.log('Policies:',r.data.policies.length);}})();"
```

---

### SAOL API Reference (Quick)

#### agentQuery - Query Data

**Recommended Format** (clear intent):
```javascript
const result = await saol.agentQuery({
  table: 'datasets',
  select: ['id', 'name', 'status', 'created_at'],  // Array or comma-separated string
  where: [
    { column: 'status', operator: 'eq', value: 'ready' },
    { column: 'training_ready', operator: 'eq', value: true }
  ],
  orderBy: [{ column: 'created_at', asc: false }],
  limit: 10
});
```

**Backward Compatible Format:**
```javascript
const result = await saol.agentQuery({
  table: 'datasets',
  select: 'id,name,status,created_at',  // String
  filters: [  // 'filters' instead of 'where'
    { field: 'status', operator: 'eq', value: 'ready' }  // 'field' instead of 'column'
  ],
  orderBy: [{ column: 'created_at', asc: false }],
  limit: 10
});
```

#### agentIntrospectSchema - Deep Schema Analysis

```javascript
const result = await saol.agentIntrospectSchema({
  table: 'datasets',
  transport: 'pg'  // Use PostgreSQL introspection (more detailed)
});

// Returns:
// {
//   success: true,
//   data: {
//     tableName: 'datasets',
//     columns: [...],
//     primaryKey: [...],
//     foreignKeys: [...],
//     indexes: [...],
//     rlsEnabled: true,
//     policies: [...]
//   }
// }
```

#### agentPreflight - Pre-Operation Check

```javascript
// Always run before mutations
const preflight = await saol.agentPreflight({
  table: 'datasets'
});

if (!preflight.success) {
  console.error('Preflight failed:', preflight.error);
  return;
}

// Proceed with operation...
```

---

### Common Use Cases for This Section

#### 1. Verify Migration Applied Successfully

```bash
# After running migration, verify all tables exist
cd "c:/Users/james/Master/BrightHub/BRun/v4-show/supa-agent-ops" && node -e "require('dotenv').config({path:'../.env.local'});const saol=require('.');(async()=>{const tables=['datasets','training_jobs','metrics_points','model_artifacts','cost_records','notifications'];console.log('Verifying migration...');for(const t of tables){const r=await saol.agentIntrospectSchema({table:t,transport:'pg'});console.log('✓',t,'-',r.success?'EXISTS':'MISSING');}})();"
```

#### 2. Check Table Structure

```bash
# Verify datasets table has correct columns
cd "c:/Users/james/Master/BrightHub/BRun/v4-show/supa-agent-ops" && node -e "require('dotenv').config({path:'../.env.local'});const saol=require('.');(async()=>{const r=await saol.agentIntrospectSchema({table:'datasets',transport:'pg'});if(r.success){console.log('Columns:');r.data.columns.forEach(c=>console.log('-',c.name,':',c.type));}})();"
```

#### 3. Verify RLS Policies

```bash
# Check RLS is enabled and policies exist
cd "c:/Users/james/Master/BrightHub/BRun/v4-show/supa-agent-ops" && node -e "require('dotenv').config({path:'../.env.local'});const saol=require('.');(async()=>{const r=await saol.agentIntrospectSchema({table:'datasets',transport:'pg'});if(r.success){console.log('RLS Enabled:',r.data.rlsEnabled);console.log('Policies:');r.data.policies.forEach(p=>console.log('-',p.name,'(',p.command,')'));}})();"
```

#### 4. Test Data Insertion

```bash
# Query to verify test data (after manual insert)
cd "c:/Users/james/Master/BrightHub/BRun/v4-show/supa-agent-ops" && node -e "require('dotenv').config({path:'../.env.local'});const saol=require('.');(async()=>{const r=await saol.agentQuery({table:'datasets',limit:1});console.log('Sample dataset:',JSON.stringify(r.data[0],null,2));})();"
```

---

### When to Use SAOL in This Prompt

Use SAOL commands for:

1. ✅ **After Migration** - Verify tables exist and have correct structure
2. ✅ **Database Verification** - Check data was inserted correctly
3. ✅ **Schema Validation** - Confirm columns, indexes, foreign keys
4. ✅ **RLS Testing** - Verify policies are enabled and working
5. ✅ **Debugging** - Query tables to understand data state

**Do NOT use SAOL for:**
- ❌ Running migrations (use `supabase migration up` or Dashboard)
- ❌ Creating storage buckets (use Dashboard)
- ❌ Application code (use regular Supabase client)

---

### Important Notes

1. **Service Role Key Required:** SAOL uses `SUPABASE_SERVICE_ROLE_KEY` for admin access
2. **Read-Only Recommended:** Use SAOL primarily for verification, not mutations
3. **Path Matters:** Always `cd` to `supa-agent-ops/` directory before running commands
4. **Env File:** Ensure `.env.local` is in parent directory with correct variables
5. **Windows Paths:** Use forward slashes in paths: `c:/Users/james/...`

---

## PART 2: WHERE TO PLACE THIS SECTION

### File to Edit:
`pmc/product/_mapping/pipeline/full-build/04f-pipeline-build-section-E01-execution-prompts.md`

### Exact Location:

1. **Find this section heading:**
   ```
   ## 🔗 Integration with Previous Work
   ```

2. **Scroll down to the end of that section, you'll see:**
   ```
   ### From Previous Prompts (This Section)

   This is the first prompt in Section E01. No previous prompts in this section.
   ```

3. **Right after that line, add a horizontal separator:**
   ```
   ---
   ```

4. **Then paste the entire SAOL section from PART 1 above**

5. **Then add another horizontal separator:**
   ```
   ---
   ```

6. **The next section should be:**
   ```
   ## 🎯 Implementation Requirements
   ```

### Visual Structure:

```
... (end of Integration section)

### From Previous Prompts (This Section)

This is the first prompt in Section E01. No previous prompts in this section.

---

## 🔍 Supabase Agent Ops Library (SAOL) - Database Operations Tool

[ENTIRE SAOL SECTION GOES HERE - COPY FROM PART 1]

---

## 🎯 Implementation Requirements

... (rest of document continues)
```

### Why This Location?

This placement ensures:
- ✅ Agent sees SAOL info RIGHT BEFORE implementation starts
- ✅ Positioned after context/integration info (what exists)
- ✅ Positioned before implementation (what to build)
- ✅ Agent knows to use SAOL for all database verification throughout the prompt

---

**END OF INSTRUCTIONS**

