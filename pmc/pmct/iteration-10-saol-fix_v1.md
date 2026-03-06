# SAOL Fix — Iteration 10: Direct Connection DNS Failure

**Date:** 2026-03-04  
**Status:** Diagnosed — Fix Required  
**Severity:** Blocking — all SAOL `transport: 'pg'` operations fail  
**Affects:** All agents using SAOL for DDL, schema introspection, index management, SQL execution, and maintenance operations  

---

## 1. Root Cause

**Supabase has removed the IPv4 A record for the direct database hostname.**

| Hostname | IPv4 (A Record) | IPv6 (AAAA Record) | Status |
|----------|-----------------|-------------------|--------|
| `db.hqhtbxlgzysfbekexwku.supabase.co` | **NONE** | `2600:1f1c:f9:4d09:4fcf:bf94:165e:24ed` | **BROKEN** |
| `hqhtbxlgzysfbekexwku.supabase.co` (REST) | `104.18.38.10` | — | Working |
| `aws-1-us-west-1.pooler.supabase.com` (Pooler) | `3.101.5.153`, `54.241.91.151` | — | Working |

**What happens:**
1. SAOL's `getPgClient()` reads `DATABASE_URL` from `.env.local`
2. The current value is: `postgresql://postgres:Fx4BTNR2mNKsN27Z@db.hqhtbxlgzysfbekexwku.supabase.co:5432/postgres`
3. Node.js `dns.lookup()` tries IPv4 first → **ENOTFOUND** (no A record)
4. System has no external IPv6 connectivity → IPv6 fallback also fails
5. `pg` Client throws a connection error
6. SAOL's `mapDatabaseError()` doesn't match any known pattern for DNS errors → returns generic `ERR_FATAL` / `"Unknown error"`
7. Agent sees only: `DDL execution failed: Unknown error`

**Why it worked yesterday:**
Supabase likely had an IPv4 A record for `db.hqhtbxlgzysfbekexwku.supabase.co` until recently. This is consistent with Supabase's [IPv4 deprecation initiative](https://supabase.com/docs/guides/platform/ipv4-address) which removes dedicated IPv4 for direct connections on certain plans, routing users to the connection pooler instead.

---

## 2. Impact Assessment

### What's broken
All SAOL operations that use `transport: 'pg'` (which is **every schema/DDL operation**):
- `agentExecuteDDL()` — DDL migrations
- `agentIntrospectSchema()` — schema introspection  
- `agentManageIndex()` — index management
- `agentExecuteSQL({ transport: 'pg' })` — raw SQL via pg
- `agentVacuum()`, `agentAnalyze()`, `agentReindex()` — maintenance ops (these all call `agentExecuteSQL` with `transport: 'pg'`)

### What still works
- Supabase REST API (`@supabase/supabase-js`) — all app code, all `transport: 'supabase'` operations
- `agentImportTool()`, `agentQuery()`, `agentExportData()`, `agentCount()` — these use REST transport
- `agentExecuteRPC()` — uses REST transport

### Secondary issue: Missing `node_modules`
The `supa-agent-ops/node_modules/` is `.gitignored` and was missing. On a fresh clone or after `git clean`, agents must run `npm install` before SAOL works. The `dist/` folder is also `.gitignored` but was present (likely built manually). If `dist/` is ever lost, `npm run build` is required too.

---

## 3. Fix Strategy

### Fix A: Update `DATABASE_URL` in `.env.local` (Quick Fix — Recommended First)

Replace the direct connection URL with the **Supabase Connection Pooler (Session Mode, port 5432)**:

**Current (broken):**
```
DATABASE_URL="postgresql://postgres:Fx4BTNR2mNKsN27Z@db.hqhtbxlgzysfbekexwku.supabase.co:5432/postgres"
```

**New (working):**
```
DATABASE_URL="postgresql://postgres.hqhtbxlgzysfbekexwku:Fx4BTNR2mNKsN27Z@aws-1-us-west-1.pooler.supabase.com:5432/postgres"
```

**Key differences:**
| | Direct (old) | Pooler Session Mode (new) |
|---|---|---|
| Host | `db.<ref>.supabase.co` | `aws-1-us-west-1.pooler.supabase.com` |
| User | `postgres` | `postgres.<ref>` |
| Port | `5432` | `5432` (session mode — required for DDL/transactions) |
| IPv4 | **NONE** | ✅ `3.101.5.153` |
| DDL Support | Yes | Yes (session mode supports transactions) |

> **IMPORTANT:** Port `5432` = Session Mode (supports transactions, prepared statements, DDL). Port `6543` = Transaction Mode (does NOT support DDL). **Must use port 5432.**

**Verification (already tested and confirmed working):**
```bash
cd "c:/Users/james/Master/BrightHub/BRun/v4-show/supa-agent-ops" && node -e "
require('dotenv').config({path:'../.env.local'});
const saol = require('.');
(async () => {
  const r = await saol.agentIntrospectSchema({ table: 'training_sets', transport: 'pg' });
  if (r.success) {
    console.log('SUCCESS — columns:', r.tables[0].columns.map(c => c.name).join(', '));
  } else {
    console.log('FAILED:', r.summary);
  }
})();
"
```

---

### Fix B: Harden SAOL `client.ts` SSL Handling (Code Fix — Recommended)

The current `getPgClient()` in `src/core/client.ts` only enables SSL if the connection string contains `sslmode=require`:

```typescript
// CURRENT (fragile)
pgClientInstance = new PgClient({
  connectionString: env.databaseUrl,
  ssl: env.databaseUrl.includes('sslmode=require') 
    ? { rejectUnauthorized: false }
    : undefined
});
```

The Supabase pooler requires SSL but the pooler URL does not include `sslmode=require` by default. The pg module happens to negotiate SSL anyway via SCRAM, but this is not guaranteed. **Fix: always enable SSL for Supabase hosts.**

```typescript
// FIXED (robust)
const isSupabaseHost = env.databaseUrl.includes('supabase.com') || 
                       env.databaseUrl.includes('supabase.co');
pgClientInstance = new PgClient({
  connectionString: env.databaseUrl,
  ssl: (isSupabaseHost || env.databaseUrl.includes('sslmode=require'))
    ? { rejectUnauthorized: false }
    : undefined
});
```

**File:** `supa-agent-ops/src/core/client.ts` → rebuild with `npm run build`

---

### Fix C: Improve SAOL Error Reporting for Connection Failures (Code Fix — Recommended)

The `mapDatabaseError()` function in `src/errors/codes.ts` has no mapping for DNS/connection errors. When `getPgClient()` throws `ENOTFOUND`, the error falls through to the catch-all `ERR_FATAL` / `"Unknown error"`, which gives agents zero diagnostic information.

**Add these mappings to `ERROR_MAPPINGS` array in `src/errors/codes.ts`:**

```typescript
// Connection/Network errors
{
  code: 'ERR_CONNECTION_DNS',
  patterns: ['enotfound', 'getaddrinfo'],
  category: 'CONNECTION',
  description: 'DNS resolution failed — cannot resolve database hostname',
  remediation: 'Check DATABASE_URL hostname. If using Supabase, switch to the connection pooler URL (aws-*.pooler.supabase.com:5432). Supabase may have removed IPv4 for direct connections.',
  example: 'DATABASE_URL="postgresql://postgres.<ref>:<password>@aws-1-us-west-1.pooler.supabase.com:5432/postgres"',
  automatable: false
},
{
  code: 'ERR_CONNECTION_REFUSED',
  patterns: ['econnrefused', 'connection refused'],
  category: 'CONNECTION',
  description: 'Database connection refused',
  remediation: 'Verify the database host and port are correct, and the database is accepting connections.',
  automatable: false
},
{
  code: 'ERR_CONNECTION_TIMEOUT',
  patterns: ['etimedout', 'econnreset', 'connection timed out'],
  category: 'CONNECTION',
  description: 'Database connection timed out or was reset',
  remediation: 'Check network connectivity. If using Supabase, verify the project is not paused.',
  automatable: false
},
```

This ensures agents see actionable diagnostics like:
```
DDL execution failed: DNS resolution failed — cannot resolve database hostname
Remediation: Check DATABASE_URL hostname. Switch to the connection pooler URL...
```

Instead of the current: `DDL execution failed: Unknown error`

---

### Fix D: Add SAOL Setup Guard / `npm install` Check (Documentation Fix)

The `node_modules/` and `dist/` directories are `.gitignored`. On fresh clones, agents must:

1. `cd supa-agent-ops && npm install` (installs pg, supabase-js, etc.)
2. `npm run build` (if `dist/` is missing — compiles TypeScript)

**Add to the SAOL usage instructions doc** (`pmc/product/_mapping/v2-mods/supabase-agent-ops-library-use-instructions.md`):

```markdown
## Prerequisites — Run Once After Clone

Before using SAOL, ensure dependencies are installed:

```bash
cd "c:/Users/james/Master/BrightHub/BRun/v4-show/supa-agent-ops"
npm install
# If dist/ folder is empty or missing:
npm run build
```

This is required because `node_modules/` and `dist/` are .gitignored.
```

---

## 4. Execution Order

| Step | Fix | Effort | Impact |
|------|-----|--------|--------|
| 1 | **Fix A** — Update `DATABASE_URL` in `.env.local` | 30 seconds | Immediately unblocks all SAOL pg operations |
| 2 | **Fix B** — Harden SSL in `client.ts` + rebuild | 5 min | Prevents future SSL negotiation failures |
| 3 | **Fix C** — Add connection error mappings to `codes.ts` + rebuild | 10 min | Gives agents actionable error messages instead of "Unknown error" |
| 4 | **Fix D** — Update SAOL usage instructions | 5 min | Prevents `node_modules` missing issue on future clones |

---

## 5. Files to Modify

| File | Fix | Change |
|------|-----|--------|
| `.env.local` | A | Replace `DATABASE_URL` value |
| `supa-agent-ops/src/core/client.ts` | B | Harden SSL detection in `getPgClient()` |
| `supa-agent-ops/src/errors/codes.ts` | C | Add 3 connection error mappings to `ERROR_MAPPINGS` |
| `pmc/product/_mapping/v2-mods/supabase-agent-ops-library-use-instructions.md` | D | Add prerequisites section |
| `supa-agent-ops/TROUBLESHOOTING.md` | D | Add DNS/IPv4 troubleshooting section |

After code changes (B, C): `cd supa-agent-ops && npm run build`

---

## 6. Diagnostic Evidence (Collected 2026-03-04)

### DNS Resolution
```
db.hqhtbxlgzysfbekexwku.supabase.co  →  IPv4: NONE  |  IPv6: 2600:1f1c:f9:4d09:4fcf:bf94:165e:24ed
hqhtbxlgzysfbekexwku.supabase.co     →  IPv4: 104.18.38.10 (REST API — working)
aws-1-us-west-1.pooler.supabase.com  →  IPv4: 3.101.5.153, 54.241.91.151 (Pooler — working)
```

### Node.js Connectivity
```
dns.lookup('db.*.supabase.co', family: 4)  →  ENOTFOUND
dns.lookup('db.*.supabase.co', family: 6)  →  ENOENT (no system IPv6)
dns.resolve6('db.*.supabase.co')           →  ['2600:1f1c:...'] (record exists, just can't reach it)
```

### SAOL with Direct URL
```
agentExecuteDDL({ transport: 'pg' })     →  FAIL: "DDL execution failed: Unknown error"
agentIntrospectSchema({ transport: 'pg' }) →  FAIL: "Schema introspection failed: Unknown error"
```

### SAOL with Pooler URL (DATABASE_URL override)
```
agentExecuteDDL({ transport: 'pg' })     →  SUCCESS
agentIntrospectSchema({ transport: 'pg' }) →  SUCCESS (columns: 15, including new ones)
```

### Direct pg Client with Pooler URL
```
DDL ALTER TABLE ... ADD COLUMN IF NOT EXISTS  →  SUCCESS
Columns verified: [last_build_error, failed_conversation_ids]
```

### Supabase REST API
```
supabase.from('training_sets').select('id').limit(1)  →  SUCCESS (1 row)
```

---

## 7. Agent Instructions Update

After applying Fix A, update the SAOL DDL pattern in execution prompts to include the `npm install` guard and note about the pooler URL:

```markdown
## SAOL — Mandatory for Database Schema Changes

**Prerequisites (run once per clone):**
```bash
cd "c:/Users/james/Master/BrightHub/BRun/v4-show/supa-agent-ops" && npm install
```

**SAOL DDL Pattern:** (unchanged — works after Fix A)
```javascript
require('dotenv').config({ path: '../.env.local' });
const saol = require('.');
// ... same pattern as before
```

**If SAOL fails with "Unknown error":**
1. Check: `ls supa-agent-ops/node_modules/pg` — if missing, run `npm install`
2. Check: DNS resolution — if `db.*.supabase.co` fails, switch DATABASE_URL to pooler
3. The pooler URL format is: `postgresql://postgres.<ref>:<password>@aws-1-us-west-1.pooler.supabase.com:5432/postgres`
```

---

## 8. Verification After Fix

Run this single command to verify everything works:

```bash
cd "c:/Users/james/Master/BrightHub/BRun/v4-show/supa-agent-ops" && node -e "
require('dotenv').config({path:'../.env.local'});
const saol = require('.');
(async () => {
  // Test 1: Schema introspection
  const schema = await saol.agentIntrospectSchema({ table: 'training_sets', transport: 'pg' });
  console.log('1. Introspection:', schema.success ? 'PASS' : 'FAIL');
  
  // Test 2: DDL execution  
  const ddl = await saol.agentExecuteDDL({ 
    sql: 'SELECT 1;', 
    transaction: true, 
    transport: 'pg' 
  });
  console.log('2. DDL execution:', ddl.success ? 'PASS' : 'FAIL');
  
  // Test 3: Verify columns exist
  if (schema.success) {
    const cols = schema.tables[0].columns.map(c => c.name);
    console.log('3. Has last_build_error:', cols.includes('last_build_error'));
    console.log('4. Has failed_conversation_ids:', cols.includes('failed_conversation_ids'));
  }
  
  console.log('---');
  console.log(schema.success && ddl.success ? 'ALL TESTS PASSED' : 'SOME TESTS FAILED');
})();
"
```

---

**END OF SAOL FIX DOCUMENT**
