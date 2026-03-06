# Multi-Turn Chat - Execution Prompt E08: Database, Types, and Service Layer

**Version:** 1.0  
**Date:** January 31, 2026  
**Section:** E08 - Dual Input Foundation  
**Prerequisites:** E01-E07 complete (Multi-turn chat fully functional)  
**Status:** Ready for Execution

---

## Overview

This section implements the foundation for separate Control vs Adapted user messages. This enables true A/B testing by allowing different prompts to be sent to each endpoint.

**What This Section Creates:**
1. Database columns for separate user messages
2. Updated TypeScript types
3. Updated service layer functions
4. Helper functions for message access

**What This Section Does NOT Change:**
- API routes (E09)
- UI components (E09)  
- Scrolling issues (E10)

---

## Critical Instructions

### SAOL for Database Operations

Use SAOL for all database operations:

```bash
cd "c:/Users/james/Master/BrightHub/BRun/v4-show/supa-agent-ops" && node -e "require('dotenv').config({path:'../.env.local'});const saol=require('.');(async()=>{const r=await saol.agentQuery({table:'conversation_turns',limit:3});console.log(JSON.stringify(r.data,null,2));})();"
```

### Environment

**Codebase:** `C:\Users\james\Master\BrightHub\BRun\v4-show\src`  
**SAOL Path:** `C:\Users\james\Master\BrightHub\BRun\v4-show\supa-agent-ops`

---

## Reference Documents

- Full Spec: `C:\Users\james\Master\BrightHub\BRun\v4-show\pmc\product\_mapping\multi\workfiles\multi-input-and-scroll_v1.md`
- SAOL Guide: `C:\Users\james\Master\BrightHub\BRun\v4-show\pmc\product\_mapping\pipeline\workfiles\supabase-agent-ops-library-use-instructions.md`

---

========================


# EXECUTION PROMPT E08: Dual User Messages - Database, Types & Service Layer

## Your Mission

You are implementing the foundation for separate Control vs Adapted user inputs in the multi-turn chat feature. Currently, both endpoints receive the same user message, leading to similar responses and nearly identical evaluation scores. This defeats the purpose of A/B testing.

Your job is to:
1. Add database columns for separate messages
2. Update TypeScript types
3. Update service layer to use correct messages per endpoint
4. Maintain backward compatibility with existing conversations

---

## Context: Current State

The multi-turn chat system currently works like this:
- User enters ONE message
- SAME message sent to both Control and Adapted endpoints
- Both endpoints build siloed conversation history
- Responses are evaluated separately
- But scores are nearly identical because inputs are identical

**The Problem:**
When both endpoints receive identical messages, they produce similar responses. This means we can't see how the LoRA model differs from the base model.

**The Solution:**
Allow DIFFERENT user messages for Control vs Adapted. This enables testing:
- Different phrasings of the same question
- Different difficulty levels
- Edge cases vs standard cases
- How each model handles varied inputs

---

## Phase 1: Database Migration

### Task 1: Add Columns for Dual Messages

**Objective:** Add `control_user_message` and `adapted_user_message` columns to `conversation_turns` table.

**IMPORTANT:** Use SAOL for ALL database operations.

#### Step 1: Verify Current Schema

```bash
cd "c:/Users/james/Master/BrightHub/BRun/v4-show/supa-agent-ops" && node -e "require('dotenv').config({path:'../.env.local'});const saol=require('.');(async()=>{const r=await saol.agentIntrospectSchema({table:'conversation_turns',includeColumns:true,transport:'pg'});console.log('Table exists:',r.tables[0]?.exists);console.log('Columns:',r.tables[0]?.columns.length);r.tables[0]?.columns.forEach(c=>console.log('-',c.name,':',c.dataType));})();"
```

**Expected:** You should see `user_message` column but NOT `control_user_message` or `adapted_user_message`.

#### Step 2: Create Migration SQL

Create the following SQL for the migration:

```sql
-- Add columns for separate user messages per endpoint
ALTER TABLE conversation_turns
ADD COLUMN IF NOT EXISTS control_user_message TEXT,
ADD COLUMN IF NOT EXISTS adapted_user_message TEXT;

-- Backfill existing conversations with same message for both
UPDATE conversation_turns
SET control_user_message = user_message,
    adapted_user_message = user_message
WHERE control_user_message IS NULL;

-- Add comments for clarity
COMMENT ON COLUMN conversation_turns.control_user_message IS 'User message sent to Control endpoint (enables dual-input A/B testing)';
COMMENT ON COLUMN conversation_turns.adapted_user_message IS 'User message sent to Adapted endpoint (enables dual-input A/B testing)';
COMMENT ON COLUMN conversation_turns.user_message IS 'DEPRECATED: Legacy field for backward compatibility, use control_user_message/adapted_user_message';
```

#### Step 3: Execute Migration with SAOL

```bash
cd "c:/Users/james/Master/BrightHub/BRun/v4-show/supa-agent-ops" && node -e "
require('dotenv').config({path:'../.env.local'});
const saol=require('.');
(async()=>{
  // Step 1: Dry-run to validate
  const dryRun = await saol.agentExecuteDDL({
    sql: \`
      ALTER TABLE conversation_turns
      ADD COLUMN IF NOT EXISTS control_user_message TEXT,
      ADD COLUMN IF NOT EXISTS adapted_user_message TEXT;
      
      COMMENT ON COLUMN conversation_turns.control_user_message IS 'User message sent to Control endpoint';
      COMMENT ON COLUMN conversation_turns.adapted_user_message IS 'User message sent to Adapted endpoint';
      COMMENT ON COLUMN conversation_turns.user_message IS 'DEPRECATED: Legacy field, use control_user_message/adapted_user_message';
    \`,
    dryRun: true,
    transaction: true,
    transport: 'pg'
  });
  
  console.log('Dry-run result:', dryRun.success ? '✓ PASS' : '✗ FAIL');
  console.log('Summary:', dryRun.summary);
  
  if (!dryRun.success) {
    console.error('Validation failed!');
    return;
  }
  
  // Step 2: Execute migration
  const result = await saol.agentExecuteDDL({
    sql: \`
      ALTER TABLE conversation_turns
      ADD COLUMN IF NOT EXISTS control_user_message TEXT,
      ADD COLUMN IF NOT EXISTS adapted_user_message TEXT;
      
      COMMENT ON COLUMN conversation_turns.control_user_message IS 'User message sent to Control endpoint';
      COMMENT ON COLUMN conversation_turns.adapted_user_message IS 'User message sent to Adapted endpoint';
      COMMENT ON COLUMN conversation_turns.user_message IS 'DEPRECATED: Legacy field, use control_user_message/adapted_user_message';
    \`,
    dryRun: false,
    transaction: true,
    transport: 'pg'
  });
  
  console.log('Migration result:', result.success ? '✓ SUCCESS' : '✗ FAILED');
  console.log('Summary:', result.summary);
})();
"
```

#### Step 4: Backfill Existing Data

```bash
cd "c:/Users/james/Master/BrightHub/BRun/v4-show/supa-agent-ops" && node -e "
require('dotenv').config({path:'../.env.local'});
const saol=require('.');
(async()=>{
  const result = await saol.agentExecuteSQL({
    sql: \`
      UPDATE conversation_turns
      SET control_user_message = user_message,
          adapted_user_message = user_message
      WHERE control_user_message IS NULL;
    \`,
    transaction: true,
    transport: 'pg'
  });
  
  console.log('Backfill result:', result.success ? '✓ SUCCESS' : '✗ FAILED');
  console.log('Rows updated:', result.rowCount);
})();
"
```

#### Step 5: Verify Migration

```bash
cd "c:/Users/james/Master/BrightHub/BRun/v4-show/supa-agent-ops" && node -e "require('dotenv').config({path:'../.env.local'});const saol=require('.');(async()=>{const r=await saol.agentIntrospectSchema({table:'conversation_turns',includeColumns:true,transport:'pg'});console.log('✓ Table exists:',r.tables[0]?.exists);const cols=r.tables[0]?.columns||[];const userMsg=cols.find(c=>c.name==='user_message');const controlMsg=cols.find(c=>c.name==='control_user_message');const adaptedMsg=cols.find(c=>c.name==='adapted_user_message');console.log('✓ user_message:',!!userMsg);console.log('✓ control_user_message:',!!controlMsg);console.log('✓ adapted_user_message:',!!adaptedMsg);})();"
```

**Success Criteria:**
- All three columns exist: `user_message`, `control_user_message`, `adapted_user_message`
- Backfill completed successfully
- No errors in migration

---

## Phase 2: Type Definitions

### Task 2: Update TypeScript Types

**File:** `src/types/conversation.ts`

#### Step 1: Update ConversationTurn Interface

**Location:** Around line 43

**FIND THIS:**
```typescript
export interface ConversationTurn {
  id: string;
  conversationId: string;
  turnNumber: number;
  
  // User input
  userMessage: string;
  
  // Control response
  controlResponse: string | null;
```

**REPLACE WITH:**
```typescript
export interface ConversationTurn {
  id: string;
  conversationId: string;
  turnNumber: number;
  
  // User input (DEPRECATED: Legacy single message field)
  userMessage: string;
  
  // NEW: Separate messages per endpoint (enables dual-input A/B testing)
  controlUserMessage: string | null;
  adaptedUserMessage: string | null;
  
  // Control response
  controlResponse: string | null;
```

#### Step 2: Update AddTurnRequest Interface

**Location:** Around line 177

**FIND THIS:**
```typescript
export interface AddTurnRequest {
  userMessage: string;
  enableEvaluation?: boolean;
  evaluationPromptId?: string;
}
```

**REPLACE WITH:**
```typescript
// NEW: Dual-message request format (recommended)
export interface AddTurnRequest {
  controlUserMessage: string;
  adaptedUserMessage: string;
  enableEvaluation?: boolean;
  evaluationPromptId?: string;
}

// Legacy single-message format (still supported for backward compatibility)
export interface LegacyAddTurnRequest {
  userMessage: string;
  enableEvaluation?: boolean;
  evaluationPromptId?: string;
}
```

#### Step 3: Add Helper Functions

**Location:** Add at end of file (after line 239)

**ADD THIS:**
```typescript
// ============================================
// Helper Functions for Dual Messages
// ============================================

/**
 * Get the user message for a specific endpoint from a turn
 * Handles both new dual-message format and legacy single-message format
 */
export function getUserMessageForEndpoint(
  turn: ConversationTurn,
  endpointType: 'control' | 'adapted'
): string {
  if (endpointType === 'control') {
    return turn.controlUserMessage || turn.userMessage;
  } else {
    return turn.adaptedUserMessage || turn.userMessage;
  }
}

/**
 * Check if a turn uses dual messages (new format) or single message (legacy)
 */
export function turnUsesDualMessages(turn: ConversationTurn): boolean {
  return turn.controlUserMessage !== null || turn.adaptedUserMessage !== null;
}

/**
 * Check if control and adapted received the same message
 */
export function turnMessagesAreIdentical(turn: ConversationTurn): boolean {
  if (!turnUsesDualMessages(turn)) {
    return true; // Legacy turns always have same message
  }
  return turn.controlUserMessage === turn.adaptedUserMessage;
}
```

#### Step 4: Verify TypeScript Build

```bash
cd "c:/Users/james/Master/BrightHub/BRun/v4-show/src" && npm run build
```

**Expected:** Build should succeed with exit code 0.

---

## Phase 3: Service Layer Updates

### Task 3: Update Database Mapper

**File:** `src/lib/services/multi-turn-conversation-service.ts`

#### Step 1: Update mapDbRowToTurn Function

**Location:** Around line 50

**FIND THIS:**
```typescript
function mapDbRowToTurn(row: any): ConversationTurn {
  return {
    id: row.id,
    conversationId: row.conversation_id,
    turnNumber: row.turn_number,
    userMessage: row.user_message,
    controlResponse: row.control_response,
```

**REPLACE WITH:**
```typescript
function mapDbRowToTurn(row: any): ConversationTurn {
  return {
    id: row.id,
    conversationId: row.conversation_id,
    turnNumber: row.turn_number,
    
    // Legacy field (for backward compatibility)
    userMessage: row.user_message,
    
    // NEW: Dual messages
    controlUserMessage: row.control_user_message,
    adaptedUserMessage: row.adapted_user_message,
    
    controlResponse: row.control_response,
```

### Task 4: Update buildMessagesForEndpoint Function

**Location:** Around line 95

**FIND THIS:**
```typescript
  // Add historical turns (use the correct endpoint's response)
  for (const turn of turns || []) {
    messages.push({ role: 'user', content: turn.user_message });
    
    const response = endpointType === 'control' 
      ? turn.control_response 
      : turn.adapted_response;
```

**REPLACE WITH:**
```typescript
  // Add historical turns (use the CORRECT endpoint's user message!)
  for (const turn of turns || []) {
    // NEW: Get the user message that was sent to THIS endpoint
    const userMessage = endpointType === 'control'
      ? (turn.control_user_message || turn.user_message)
      : (turn.adapted_user_message || turn.user_message);
    
    messages.push({ role: 'user', content: userMessage });
    
    const response = endpointType === 'control' 
      ? turn.control_response 
      : turn.adapted_response;
```

### Task 5: Update buildConversationHistoryContext Function

**Location:** Around line 145

**FIND THIS:**
```typescript
  for (const turn of turns) {
    context += `Turn ${turn.turnNumber}:\n`;
    context += `Human: ${turn.userMessage}\n`;
    context += `Advisor: ${response || '[No response]'}\n\n`;
  }
```

**REPLACE WITH:**
```typescript
  for (const turn of turns) {
    // NEW: Get the user message for THIS endpoint
    const userMessage = endpointType === 'control'
      ? (turn.controlUserMessage || turn.userMessage)
      : (turn.adaptedUserMessage || turn.userMessage);
    
    const response = endpointType === 'control'
      ? turn.controlResponse
      : turn.adaptedResponse;
    
    context += `Turn ${turn.turnNumber}:\n`;
    context += `Human: ${userMessage}\n`;
    context += `Advisor: ${response || '[No response]'}\n\n`;
  }
```

### Task 6: Update addTurn Function (Part 1 - Validation & Insert)

**Location:** Around line 460

**FIND THIS:**
```typescript
    // Create turn record with generating status
    const { data: turn, error: turnError } = await supabase
      .from('conversation_turns')
      .insert({
        conversation_id: conversationId,
        turn_number: nextTurnNumber,
        user_message: request.userMessage,
        evaluation_enabled: request.enableEvaluation || false,
        evaluation_prompt_id: request.evaluationPromptId || null,
        status: 'generating',
      })
      .select()
      .single();
```

**REPLACE WITH:**
```typescript
    // Validate input (NEW: check both messages)
    if (!request.controlUserMessage || !request.controlUserMessage.trim()) {
      return { success: false, error: 'Control user message is required' };
    }
    if (!request.adaptedUserMessage || !request.adaptedUserMessage.trim()) {
      return { success: false, error: 'Adapted user message is required' };
    }
    
    // Create turn record with generating status
    const { data: turn, error: turnError } = await supabase
      .from('conversation_turns')
      .insert({
        conversation_id: conversationId,
        turn_number: nextTurnNumber,
        
        // NEW: Store both messages separately
        control_user_message: request.controlUserMessage.trim(),
        adapted_user_message: request.adaptedUserMessage.trim(),
        
        // DEPRECATED: Store in legacy field for backward compatibility
        // (Use control message as the "primary" message)
        user_message: request.controlUserMessage.trim(),
        
        evaluation_enabled: request.enableEvaluation || false,
        evaluation_prompt_id: request.evaluationPromptId || null,
        status: 'generating',
      })
      .select()
      .single();
```

### Task 7: Update addTurn Function (Part 2 - Message Building)

**Location:** Around line 494

**FIND THIS:**
```typescript
    // Build message histories for each endpoint (SILOED)
    const controlMessages = await buildMessagesForEndpoint(
      conversationId,
      'control',
      conversation.system_prompt,
      request.userMessage
    );
    
    const adaptedMessages = await buildMessagesForEndpoint(
      conversationId,
      'adapted',
      conversation.system_prompt,
      request.userMessage
    );
```

**REPLACE WITH:**
```typescript
    // Build message histories for each endpoint (SILOED, using their OWN user messages)
    const controlMessages = await buildMessagesForEndpoint(
      conversationId,
      'control',
      conversation.system_prompt,
      request.controlUserMessage.trim()  // NEW: Control gets its own message
    );
    
    const adaptedMessages = await buildMessagesForEndpoint(
      conversationId,
      'adapted',
      conversation.system_prompt,
      request.adaptedUserMessage.trim()  // NEW: Adapted gets its own message
    );
```

### Task 8: Update addTurn Function (Part 3 - Evaluation Calls)

**Location:** Around line 626

**FIND THIS:**
```typescript
          const controlEval = await evaluateMultiTurnConversation(
            request.userMessage,
            conversation.system_prompt,
            controlResult.value.response,
            mappedPreviousTurns,
            'control',
            request.evaluationPromptId
          );
          
          const adaptedEval = await evaluateMultiTurnConversation(
            request.userMessage,
            conversation.system_prompt,
            adaptedResult.value.response,
            mappedPreviousTurns,
            'adapted',
            request.evaluationPromptId
          );
```

**REPLACE WITH:**
```typescript
          // NOTE: evaluateMultiTurnConversation now uses the CORRECT user message
          // for each endpoint via buildConversationHistoryContext
          
          const controlEval = await evaluateMultiTurnConversation(
            request.controlUserMessage.trim(),  // NEW: Use control's message
            conversation.system_prompt,
            controlResult.value.response,
            mappedPreviousTurns,
            'control',
            request.evaluationPromptId
          );
          
          const adaptedEval = await evaluateMultiTurnConversation(
            request.adaptedUserMessage.trim(),  // NEW: Use adapted's message
            conversation.system_prompt,
            adaptedResult.value.response,
            mappedPreviousTurns,
            'adapted',
            request.evaluationPromptId
          );
```

---

## Phase 4: Verification

### Task 9: Build and Verify

#### Step 1: TypeScript Build

```bash
cd "c:/Users/james/Master/BrightHub/BRun/v4-show/src" && npm run build
```

**Expected:** Exit code 0, no TypeScript errors.

#### Step 2: Verify Database Schema

```bash
cd "c:/Users/james/Master/BrightHub/BRun/v4-show/supa-agent-ops" && node -e "require('dotenv').config({path:'../.env.local'});const saol=require('.');(async()=>{const r=await saol.agentIntrospectSchema({table:'conversation_turns',includeColumns:true,transport:'pg'});const cols=r.tables[0]?.columns||[];console.log('Total columns:',cols.length);const newCols=cols.filter(c=>['control_user_message','adapted_user_message'].includes(c.name));console.log('✓ New columns found:',newCols.length===2);newCols.forEach(c=>console.log('  -',c.name,':',c.dataType,c.isNullable?'(nullable)':'(required)'));})();"
```

**Expected:** Both `control_user_message` and `adapted_user_message` columns exist and are TEXT type.

#### Step 3: Query Sample Data

```bash
cd "c:/Users/james/Master/BrightHub/BRun/v4-show/supa-agent-ops" && node -e "require('dotenv').config({path:'../.env.local'});const saol=require('.');(async()=>{const r=await saol.agentQuery({table:'conversation_turns',select:'turn_number,user_message,control_user_message,adapted_user_message',limit:3});console.log('Sample data:');r.data.forEach(t=>{console.log('Turn',t.turn_number);console.log('  Legacy:',t.user_message?.substring(0,50)+'...');console.log('  Control:',t.control_user_message?.substring(0,50)+'...');console.log('  Adapted:',t.adapted_user_message?.substring(0,50)+'...');console.log('');});})();"
```

**Expected:** All three fields should have the same content (because of backfill).

---

## Success Criteria

After completing this section:

- [x] Database migration completed successfully
- [x] New columns exist: `control_user_message`, `adapted_user_message`
- [x] Existing data backfilled correctly
- [x] TypeScript types updated with new fields
- [x] Helper functions added to types file
- [x] Service layer functions updated to use correct messages
- [x] TypeScript build succeeds (exit code 0)
- [x] Backward compatibility maintained (legacy `userMessage` still works)

---

## What's Next

**E09** will:
- Update API route to accept dual messages
- Update React hook for dual input state
- Update UI components with two input fields

**E10** will:
- Fix scrolling issues
- Comprehensive testing
- Documentation

---

## If Something Goes Wrong

### TypeScript Errors

If you get type errors after updating types:
1. Check that you imported the new `LegacyAddTurnRequest` type
2. Verify helper functions were added to the types file
3. Run `npm run build` to see specific errors

### Database Migration Errors

If migration fails:
1. Check that SAOL is using service role key (not anon key)
2. Verify table name is `conversation_turns` (not `conversations_turns`)
3. Use dry-run first to validate SQL
4. Check if columns already exist with introspection

### Validation Errors

If data doesn't look right:
1. Query a few turns to verify backfill
2. Check that `control_user_message` and `adapted_user_message` match `user_message`
3. Verify no NULL values in backfilled data

---

## Notes for Agent

1. **Use SAOL for ALL database operations** - No raw SQL or supabase-js
2. **Test with dry-run first** - Always validate before executing
3. **Backward compatibility is critical** - Don't break existing conversations
4. **Helper functions are essential** - They handle both old and new formats
5. **Follow the order** - Database → Types → Service → Verify

---

**End of E08 Prompt**


+++++++++++++++++
