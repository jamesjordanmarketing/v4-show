# Supabase Agent Ops Library (SAOL) Troubleshooting Guide

**Version:** 2.2
**Last Updated:** March 4, 2026

This guide addresses common issues agents and developers may encounter when using SAOL.

---

## 🔧 Prerequisites — Run After Clone or git clean

`node_modules/` and `dist/` are `.gitignored`. Before using SAOL, ensure dependencies are installed:

```bash
cd "c:/Users/james/Master/BrightHub/BRun/v4-show/supa-agent-ops"
npm install
# If dist/ folder is empty or missing:
npm run build
```

Without this step, all SAOL operations will fail with `Cannot find module` errors.

---

## 🚨 Connection / DNS Issues (Added March 2026)

### Error: `DDL execution failed: Unknown error` or `DNS resolution failed`
**Symptom:**
All `transport: 'pg'` operations fail — DDL, schema introspection, index management, raw SQL, and maintenance ops.

**Cause:**
Supabase has removed IPv4 A records for direct database hostnames (`db.<ref>.supabase.co`). Only IPv6 AAAA records remain. Systems without external IPv6 connectivity get `ENOTFOUND` from `dns.lookup()`.

**Solution — Use the Supabase Connection Pooler URL:**

Replace the `DATABASE_URL` in `.env.local`:

```bash
# OLD (broken — no IPv4 A record):
DATABASE_URL="postgresql://postgres:<password>@db.<ref>.supabase.co:5432/postgres"

# NEW (working — pooler has IPv4):
DATABASE_URL="postgresql://postgres.<ref>:<password>@aws-1-us-west-1.pooler.supabase.com:5432/postgres"
```

**Key points:**
- Port `5432` = Session Mode (supports DDL, transactions, prepared statements). **Use this.**
- Port `6543` = Transaction Mode (does NOT support DDL). **Do NOT use for SAOL.**
- The username changes from `postgres` to `postgres.<ref>` when using the pooler.

**Quick diagnosis:**
```bash
# Check if direct hostname resolves
nslookup db.<ref>.supabase.co
# If "Non-existent domain" → must use pooler URL

# Check if pooler resolves
nslookup aws-1-us-west-1.pooler.supabase.com
# Should return IPv4 addresses
```

### Error: `ECONNREFUSED` or `connection refused`
**Symptom:** SAOL can resolve the hostname but cannot connect.

**Cause:** Database host or port is wrong, or the database is not accepting connections.

**Solution:** Verify `DATABASE_URL` host and port. Check Supabase dashboard for project status (paused projects refuse connections).

### Error: `ETIMEDOUT` or `connection timed out`
**Symptom:** SAOL hangs for ~30 seconds then fails.

**Cause:** Network firewall, wrong host, or Supabase project is paused.

**Solution:** Check network connectivity. Verify Supabase project is active. Try the pooler URL.

---

## 🆕 Recently Fixed Issues (v2.1)

### Issue: `select.join is not a function`
**Status:** ✅ FIXED in v2.1

**Previous Behavior:**
```javascript
// This would cause an error
const result = await saol.agentQuery({
  table: 'conversations',
  select: '*'  // ← Error: string not supported
});
```

**Fix Applied:**
SAOL now accepts `select` parameter in multiple formats:
- String: `select: '*'` or `select: 'col1,col2,col3'`
- Array: `select: ['col1', 'col2', 'col3']`

**Action Required:** Rebuild SAOL after updating:
```bash
cd supa-agent-ops
npm run build
```

### Issue: `filters` vs `where` Parameter Confusion
**Status:** ✅ FIXED in v2.1

**Previous Behavior:**
Using `filters` instead of `where` would cause errors.

**Fix Applied:**
SAOL now supports backward compatibility:
- Recommended: `where: [{ column: 'status', operator: 'eq', value: 'active' }]`
- Also works: `filters: [{ field: 'status', operator: 'eq', value: 'active' }]`

Both `column`/`field` parameter names are now accepted in filters.

---

## 1. Environment Variable Errors

### Error: `Missing required environment variables: SUPABASE_URL`
**Symptom:**
Scripts fail immediately with this error message during the preflight check or initialization.

**Cause:**
The library cannot find `SUPABASE_URL` in `process.env`. This often happens because:
1.  The `.env` file is not being loaded correctly.
2.  The project uses `NEXT_PUBLIC_SUPABASE_URL` instead of `SUPABASE_URL`.

**Solution:**
SAOL v1.2+ automatically checks for `NEXT_PUBLIC_SUPABASE_URL` as a fallback.
1.  **Check Path:** Ensure you are loading the correct env file in your script:
    ```javascript
    require('dotenv').config({ path: '../.env.local' }); // Adjust path as needed
    ```
2.  **Check File Content:** Verify `.env.local` contains either `SUPABASE_URL` or `NEXT_PUBLIC_SUPABASE_URL`.

### Error: `Missing required environment variables: SUPABASE_SERVICE_ROLE_KEY`
**Symptom:**
Operations fail with authentication errors or specific missing variable errors.

**Cause:**
SAOL requires the **Service Role Key** (admin privileges) to bypass Row Level Security (RLS) and perform maintenance tasks. The anonymous key (`NEXT_PUBLIC_SUPABASE_ANON_KEY`) is insufficient.

**Solution:**
Add the service role key to your `.env.local` file:
```bash
SUPABASE_SERVICE_ROLE_KEY=eyJ...
```
*Warning: Never expose this key in client-side code.*

## 2. Preflight Failures

### Error: `Table existence check failed`
**Symptom:**
`agentPreflight` returns `ok: false` with an issue stating the table does not exist.

**Cause:**
1.  The table name is misspelled.
2.  The `SUPABASE_URL` points to a different project than expected.
3.  The table is in a schema other than `public` (SAOL defaults to `public`).

**Solution:**
1.  Verify the table name in Supabase Dashboard.
2.  Run `agentIntrospectSchema` to list available tables:
    ```javascript
    const schema = await saol.agentIntrospectSchema({ table: 'your_table', transport: 'pg' });
    ```

## 3. Import/Export Issues

### Error: `Violates foreign key constraint`
**Symptom:**
Import fails with a PostgreSQL error about foreign keys.

**Cause:**
You are trying to insert records that reference IDs not present in the related tables.

**Solution:**
1.  Import parent records first (e.g., `users` before `conversations`).
2.  Use `agentImportTool` with `mode: 'upsert'` to handle existing records gracefully.

### Error: `JSON parsing failed` during Import
**Symptom:**
The tool fails to read the source file.

**Cause:**
The source file is not valid JSON or NDJSON (newline-delimited JSON).

**Solution:**
1.  Validate the source file syntax.
2.  If using NDJSON, ensure each line is a valid JSON object.

## 4. General Debugging

If you are unsure why an operation is failing:
1.  **Enable Dry Run:** Use `dryRun: true` in options to see what *would* happen.
2.  **Check `nextActions`:** The result object always includes `nextActions` with specific recommendations.
3.  **Use `pg` Transport:** For schema-related issues, switch to `transport: 'pg'` for more detailed error messages from the database directly.
