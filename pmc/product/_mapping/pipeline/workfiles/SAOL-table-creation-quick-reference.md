# SAOL Table Creation - Quick Reference Card

**For AI Agents** | **Version:** 2.1 | **Updated:** Jan 27, 2026

---

## 🚀 Create a Table in 3 Steps

```javascript
const saol = require('supa-agent-ops');

// 1. DRY-RUN (validate SQL)
const dryRun = await saol.agentExecuteDDL({
  sql: 'CREATE TABLE IF NOT EXISTS my_table (id UUID PRIMARY KEY, name TEXT NOT NULL);',
  dryRun: true,
  transaction: true,
  transport: 'pg'
});

// 2. EXECUTE (if validation passed)
if (dryRun.success) {
  const result = await saol.agentExecuteDDL({
    sql: 'CREATE TABLE IF NOT EXISTS my_table (id UUID PRIMARY KEY, name TEXT NOT NULL);',
    transaction: true,
    transport: 'pg'
  });
}

// 3. VERIFY (confirm structure)
const verify = await saol.agentIntrospectSchema({
  table: 'my_table',
  transport: 'pg'
});
```

---

## 📋 Critical Parameters

| Parameter | Value | Required | Why |
|-----------|-------|----------|-----|
| `sql` | `string` | ✅ Yes | Your DDL statement |
| `transport` | `'pg'` | ✅ Yes | DDL requires PostgreSQL transport |
| `transaction` | `true` | ✅ Yes | Auto-rollback on errors |
| `dryRun` | `true` (first) | ⚠️ Recommended | Validates before executing |

---

## ✅ Best Practices Checklist

- [ ] Use `transport: 'pg'` for all DDL operations
- [ ] Always test with `dryRun: true` first
- [ ] Always use `transaction: true` for safety
- [ ] Use `CREATE TABLE IF NOT EXISTS` to prevent errors
- [ ] Verify with `agentIntrospectSchema()` after creation
- [ ] Check `result.success` and `result.summary` for errors

---

## 🔧 Common Operations

### Create Table
```javascript
await saol.agentExecuteDDL({
  sql: `
    CREATE TABLE IF NOT EXISTS products (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name TEXT NOT NULL,
      price NUMERIC(10,2),
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  `,
  transaction: true,
  transport: 'pg'
});
```

### Add Columns
```javascript
await saol.agentExecuteDDL({
  sql: 'ALTER TABLE products ADD COLUMN IF NOT EXISTS category TEXT;',
  transaction: true,
  transport: 'pg'
});
```

### Create Index
```javascript
await saol.agentManageIndex({
  table: 'products',
  action: 'create',
  indexName: 'idx_products_category',
  columns: ['category'],
  concurrent: true,
  transport: 'pg'
});
```

### Enable RLS
```javascript
await saol.agentExecuteDDL({
  sql: `
    ALTER TABLE products ENABLE ROW LEVEL SECURITY;
    CREATE POLICY "Users can view all" ON products FOR SELECT USING (true);
  `,
  transaction: true,
  transport: 'pg'
});
```

---

## 🐛 Troubleshooting

| Error | Solution |
|-------|----------|
| "permission denied for schema public" | Use `SUPABASE_SERVICE_ROLE_KEY` |
| "relation already exists" | Use `CREATE TABLE IF NOT EXISTS` |
| "syntax error at or near..." | Run with `dryRun: true` to validate |
| "transport 'supabase' not supported" | Use `transport: 'pg'` for DDL |

---

## 📦 One-Liners

**Create table:**
```bash
cd supa-agent-ops && node -e "require('dotenv').config({path:'../.env.local'});const s=require('.');(async()=>{const r=await s.agentExecuteDDL({sql:'CREATE TABLE IF NOT EXISTS test (id UUID PRIMARY KEY);',transaction:true,transport:'pg'});console.log('✓',r.success);})();"
```

**Check if table exists:**
```bash
cd supa-agent-ops && node -e "require('dotenv').config({path:'../.env.local'});const s=require('.');(async()=>{const r=await s.agentIntrospectSchema({table:'test',transport:'pg'});console.log('Exists:',r.tables[0]?.exists);})();"
```

**List all tables:**
```bash
cd supa-agent-ops && node -e "require('dotenv').config({path:'../.env.local'});const s=require('.');(async()=>{const r=await s.agentIntrospectSchema({transport:'pg'});console.log('Tables:',r.tables.map(t=>t.name).join(', '));})();"
```

---

## 🎯 Decision Tree: Which Method?

```
Need to create a table?
│
├─ Simple table, programmatic? 
│  → Use agentExecuteDDL()
│
├─ Complex migration with RLS + Storage?
│  → Write .sql file, paste in Supabase SQL Editor
│
├─ Need to validate SQL first?
│  → Use agentExecuteDDL() with dryRun: true
│
└─ Need to verify table structure?
   → Use agentIntrospectSchema()
```

---

## 📚 Full Documentation

**Complete Guide:** `supabase-agent-ops-library-use-instructions.md`  
**SAOL Manual:** `supa-agent-ops/saol-agent-manual_v2.md`  
**Schema Guide:** `supa-agent-ops/SCHEMA_OPERATIONS_GUIDE.md`

---

## 💡 Pro Tips

1. **Always check if table exists first** - Use `agentIntrospectSchema()` before creating
2. **Use IF NOT EXISTS** - Prevents errors if table already exists
3. **Create indexes immediately** - Include index creation in same DDL transaction
4. **Enable RLS from the start** - Add RLS policies during table creation
5. **Verify after creation** - Always confirm structure with `agentIntrospectSchema()`

---

**Remember:** SAOL handles ALL database operations safely. No need for raw SQL commands!
