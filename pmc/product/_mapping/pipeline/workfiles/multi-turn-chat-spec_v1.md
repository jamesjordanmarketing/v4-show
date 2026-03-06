# Multi-Turn Chat Implementation Analysis & Specification

**Version:** 1.0  
**Date:** January 26, 2026  
**Status:** Analysis + Specification  
**Purpose:** Assess difficulty, building blocks, and provide implementation path for multi-turn A/B testing chat

---

## Part 1: Difficulty Assessment

### 1.1 Overall Difficulty Rating

**Production-Ready Multi-Turn Chat: 7/10 Difficulty**

| Aspect | Difficulty | Rationale |
|--------|------------|-----------|
| **UI/UX** | 4/10 | Chat interfaces are well-understood patterns; many open-source components exist |
| **Context Continuity** | 6/10 | Must maintain separate conversation states for control vs adapted |
| **Backend State Management** | 7/10 | Need database schema for conversation threads, proper isolation |
| **RunPod Serverless** | 6/10 | Stateless endpoints require passing full context each call |
| **Fault Tolerance** | 8/10 | Partial failures (one endpoint fails mid-conversation) require graceful handling |
| **Performance at Scale** | 7/10 | Token counts grow linearly; context window limits become factor |

### 1.2 Core Technical Challenges

#### Challenge 1: Siloed Conversation Contexts
The control and adapter responses must NOT affect each other. Each endpoint must receive its own conversation history.

```
User: "I'm worried about retirement"
├─ Control: "You should review your 401k allocation..."
└─ Adapted: "I hear the worry in your words. Let's talk about what's behind that feeling..."

User Turn 2: "What if I lose my job?"
├─ Control context: User said "worried" → Control said "review 401k" → User asks about job loss
└─ Adapted context: User said "worried" → Adapted said "hear the worry" → User asks about job loss
```

**Solution:** Maintain two separate `conversation_history` arrays in database, pass correct history to each endpoint.

#### Challenge 2: RunPod Serverless Statelessness
RunPod serverless endpoints are stateless — they don't maintain conversation memory between requests.

**Implications:**
- Each request must include full conversation history
- Token usage grows with each turn
- Context window limits (typically 8K-128K tokens)

**Solution:** Pass conversation history as part of the request payload:
```json
{
  "messages": [
    { "role": "system", "content": "You are..." },
    { "role": "user", "content": "Turn 1..." },
    { "role": "assistant", "content": "Response 1..." },
    { "role": "user", "content": "Turn 2..." }
  ],
  "max_tokens": 2000
}
```

This is the standard OpenAI-compatible format that most RunPod endpoints support.

#### Challenge 3: Fault Tolerance
In multi-turn conversations, failures become complex:

| Failure Mode | Impact | Required Handling |
|--------------|--------|-------------------|
| Control fails on Turn 3 | User sees only adapted response | Allow retry; show partial results |
| Adapted fails on Turn 2 | Conversation history diverges | Sync mechanism needed |
| Network timeout | User waits indefinitely | Timeout + retry logic |
| Token limit exceeded | Truncation mid-thought | Summarization or sliding window |

**Solution:** Implement graceful degradation with clear UI feedback.

---

## Part 2: JSON Format Implications

### 2.1 Does Multi-Turn Require Different JSON?

**Answer: No, the collation format already supports multi-turn.**

The `conversations-evaluation-collation-dataset-JSON_v1.json` specification includes:

```json
{
  "conversation_type": "multi_turn",
  "turn_count": 3,
  "input": {
    "conversation_history": [
      { "turn": 1, "role": "user", "content": "..." },
      { "turn": 2, "role": "assistant", "content": "..." }
    ],
    "current_turn_input": "..."
  }
}
```

### 2.2 Multi-Turn Arc Tracking

For sophisticated arc progress, the format supports:

```json
{
  "arc_analysis": {
    "intended_arc": "anxiety_to_empowerment",
    "multi_turn_progression": [
      { "turn": 1, "emotion": "fear", "intensity": 0.9 },
      { "turn": 2, "emotion": "acknowledged", "intensity": 0.6 },
      { "turn": 3, "emotion": "hopeful", "intensity": 0.4 }
    ],
    "arc_achieved_control": false,
    "arc_achieved_adapted": true
  }
}
```

### 2.3 Additional Fields for Multi-Turn

Consider adding to the collation format:

```json
{
  "multi_turn_metadata": {
    "total_turns": 5,
    "control_history_tokens": 4500,
    "adapted_history_tokens": 5200,
    "context_window_usage_percent": 0.35,
    "conversation_duration_seconds": 420,
    "average_response_time_ms": 2800
  }
}
```

---

## Part 3: RunPod Serverless Considerations

### 3.1 Current Inference Service

Looking at your existing `inference-service.ts`:
- Uses OpenAI-compatible API format
- Sends single request with messages array
- Handles timeout and retry logic

**Good news:** This already supports multi-turn. The messages array can contain conversation history.

### 3.2 Required Backend Changes

**Minimal changes needed:**

1. **Add conversation_id tracking** - Group turns into conversations
2. **Store per-turn responses** - Each turn gets separate DB record linked to conversation
3. **Build history on each request** - Fetch previous turns, construct messages array

```typescript
// Build messages for multi-turn request
async function buildMessagesForTurn(
  conversationId: string, 
  endpointType: 'control' | 'adapted',
  newUserMessage: string
): Promise<Message[]> {
  // Fetch all previous turns for this conversation + endpoint type
  const history = await getConversationHistory(conversationId, endpointType);
  
  return [
    { role: 'system', content: systemPrompt },
    ...history.flatMap(turn => [
      { role: 'user', content: turn.userMessage },
      { role: 'assistant', content: turn.assistantResponse }
    ]),
    { role: 'user', content: newUserMessage }
  ];
}
```

### 3.3 Token Management

**Problem:** Conversation history grows with each turn.

**Solutions:**

1. **Hard limit** - Maximum 10 turns per conversation
2. **Token budget** - Stop when approaching model's context limit
3. **Sliding window** - Keep last N turns + summarize earlier turns
4. **Smart summarization** - Use Claude to summarize older turns

**Recommendation for V1:** Hard limit of 10 turns + token count warning at 80% capacity.

---

## Part 4: Open Source Chat Options

### 4.1 Evaluated Options

| Library | Pros | Cons | Fit for BrightRun |
|---------|------|------|-------------------|
| **Vercel AI SDK** | Native Next.js, streaming, React hooks | Designed for single-model, not A/B testing | ⭐⭐⭐ (Good base) |
| **LangChain.js** | Conversation memory, chains | Overkill, heavy abstraction | ⭐⭐ |
| **chatscope/chat-ui-kit-react** | Full chat UI components | Just UI, no state management | ⭐⭐⭐⭐ (Great for UI) |
| **React Chat Elements** | Customizable bubbles | Minimal, need to build most logic | ⭐⭐ |
| **Assistant UI** | Multi-agent support | New, limited docs | ⭐⭐⭐ |

### 4.2 Recommended Approach

**Hybrid Build:**

1. **UI:** Use `@chatscope/chat-ui-kit-react` for proven chat components
   - Message bubbles, input field, typing indicators
   - Highly customizable styling
   - Production-tested in enterprise chat apps
   
2. **State:** Custom React Context + Zustand store
   - Two parallel conversation states (control/adapted)
   - Optimistic updates
   - Sync with database on each turn

3. **Streaming:** Vercel AI SDK patterns
   - Use `useChat`-inspired patterns
   - Adapt for dual-stream (control + adapted simultaneously)

### 4.3 Why Not Full Vercel AI SDK?

The Vercel AI SDK assumes single-model interaction:
```typescript
// Vercel AI SDK - single model
const { messages, input, handleSubmit } = useChat();
```

We need dual-model with siloed histories:
```typescript
// BrightRun requirement - dual model
const { 
  controlMessages, 
  adaptedMessages, 
  input, 
  handleSubmit 
} = useDualChat();
```

**Verdict:** Use Vercel AI SDK as inspiration, but build custom hook.

---

## Part 5: Implementation Specification

### 5.1 New Page Route

```
Route: /pipeline/jobs/[jobId]/chat
File: src/app/(dashboard)/pipeline/jobs/[jobId]/chat/page.tsx
```

This is SEPARATE from the existing test page (`/pipeline/jobs/[jobId]/test`). The test page remains for single-turn A/B tests.

### 5.2 Database Schema

```sql
-- New table: multi_turn_conversations
CREATE TABLE multi_turn_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES pipeline_jobs(id),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  
  -- Conversation metadata
  name TEXT,                          -- Optional user-assigned name
  system_prompt TEXT,
  status TEXT DEFAULT 'active',       -- active, completed, abandoned
  
  -- Turn tracking
  turn_count INTEGER DEFAULT 0,
  
  -- Token tracking
  control_total_tokens INTEGER DEFAULT 0,
  adapted_total_tokens INTEGER DEFAULT 0,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- New table: conversation_turns
CREATE TABLE conversation_turns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES multi_turn_conversations(id) ON DELETE CASCADE,
  turn_number INTEGER NOT NULL,
  
  -- User input
  user_message TEXT NOT NULL,
  
  -- Control response
  control_response TEXT,
  control_generation_time_ms INTEGER,
  control_tokens_used INTEGER,
  control_error TEXT,
  
  -- Adapted response
  adapted_response TEXT,
  adapted_generation_time_ms INTEGER,
  adapted_tokens_used INTEGER,
  adapted_error TEXT,
  
  -- Claude evaluation (optional, can be run per-turn)
  evaluation_enabled BOOLEAN DEFAULT false,
  control_evaluation JSONB,
  adapted_evaluation JSONB,
  
  -- Status
  status TEXT DEFAULT 'pending', -- pending, generating, completed, failed
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  
  UNIQUE(conversation_id, turn_number)
);

CREATE INDEX idx_turns_conversation ON conversation_turns(conversation_id);
CREATE INDEX idx_conversations_job ON multi_turn_conversations(job_id);
```

### 5.3 API Endpoints

```typescript
// POST /api/pipeline/conversations
// Create new multi-turn conversation
interface CreateConversationRequest {
  jobId: string;
  name?: string;
  systemPrompt?: string;
}

// POST /api/pipeline/conversations/[id]/turn
// Add new turn to conversation
interface AddTurnRequest {
  userMessage: string;
  enableEvaluation?: boolean;
}

// GET /api/pipeline/conversations/[id]
// Get conversation with all turns

// GET /api/pipeline/conversations/[id]/stream
// SSE endpoint for real-time response streaming

// POST /api/pipeline/conversations/[id]/complete
// Mark conversation as completed

// DELETE /api/pipeline/conversations/[id]
// Delete conversation
```

### 5.4 UI Components

```
src/components/pipeline/
├── MultiTurnChat.tsx              # Main chat container
├── ChatMessageList.tsx            # Scrollable message area
├── ChatMessage.tsx                # Individual message bubble
│   ├── UserMessage variant
│   ├── ControlResponse variant
│   └── AdaptedResponse variant
├── ChatInput.tsx                  # Input field + send button
├── DualResponsePanel.tsx          # Side-by-side control/adapted view
├── ChatHeader.tsx                 # Conversation name, controls
├── TurnEvaluationInline.tsx       # In-chat evaluation display
└── ChatConversationList.tsx       # Sidebar list of conversations
```

### 5.5 Page Layout

```
┌────────────────────────────────────────────────────────────────────────┐
│ Multi-Turn Chat Testing                                     [← Back]  │
│ Job: Financial Planning Adapter v1                                     │
├──────────────────┬─────────────────────────────────────────────────────┤
│ Conversations    │                    Chat                             │
│ ──────────────── │ ──────────────────────────────────────────────────  │
│ □ New Chat       │ System: You are Elena Morales, CFP...    [Edit]    │
│ ○ Chat 1 (5 turns) ───────────────────────────────────────────────────│
│ ○ Chat 2 (3 turns) │                                                   │
│ ○ Chat 3 (8 turns) │      [USER] I'm worried about retirement         │
│                  │                                                      │
│                  │  ┌─────────────────┬─────────────────┐             │
│                  │  │ Control         │ Adapter         │             │
│                  │  │ You should...   │ I hear you...   │             │
│                  │  └─────────────────┴─────────────────┘             │
│                  │                                                      │
│                  │      [USER] What if I lose my job?                  │
│                  │                                                      │
│                  │  ┌─────────────────┬─────────────────┐             │
│                  │  │ Control         │ Adapter         │             │
│                  │  │ Emergency fund..│ That fear is... │             │
│                  │  └─────────────────┴─────────────────┘             │
│                  │                                                      │
│                  │ ────────────────────────────────────────────────── │
│                  │ [Type your message...                    ] [Send]   │
│                  │ ☐ Enable Claude-as-Judge for each turn             │
├──────────────────┴─────────────────────────────────────────────────────┤
│ Tokens: Control 2,450 / Adapted 3,120 │ Turn 5/10 │ [End Conversation] │
└────────────────────────────────────────────────────────────────────────┘
```

### 5.6 Custom Hook: useDualChat

```typescript
interface UseDualChatReturn {
  // State
  conversation: Conversation | null;
  turns: Turn[];
  isLoading: boolean;
  error: Error | null;
  
  // Input
  input: string;
  setInput: (value: string) => void;
  
  // Actions
  sendMessage: (message?: string) => Promise<void>;
  startNewConversation: () => Promise<void>;
  endConversation: () => Promise<void>;
  
  // Token tracking
  controlTokens: number;
  adaptedTokens: number;
  isNearTokenLimit: boolean;
}

function useDualChat(jobId: string, conversationId?: string): UseDualChatReturn {
  // Implementation details...
}
```

### 5.7 Response Display Modes

Three viewing modes:

1. **Side-by-Side** (default): Control and adapted responses shown in parallel columns
2. **Tabbed**: Tabs to switch between control and adapted views
3. **Diff View**: Highlight differences between responses

### 5.8 File Structure

```
src/
├── app/
│   └── (dashboard)/
│       └── pipeline/
│           └── jobs/
│               └── [jobId]/
│                   ├── test/           # Existing single-turn test
│                   │   └── page.tsx
│                   └── chat/           # NEW: Multi-turn chat
│                       └── page.tsx
│
├── components/
│   └── pipeline/
│       ├── MultiTurnChat.tsx
│       ├── ChatMessageList.tsx
│       ├── ChatMessage.tsx
│       ├── ChatInput.tsx
│       ├── DualResponsePanel.tsx
│       ├── ChatHeader.tsx
│       └── ChatConversationList.tsx
│
├── hooks/
│   └── useDualChat.ts              # NEW: Multi-turn chat hook
│
├── lib/
│   └── services/
│       └── conversation-service.ts  # NEW: Conversation business logic
│
├── types/
│   └── conversation.ts              # NEW: Conversation types
│
└── app/
    └── api/
        └── pipeline/
            └── conversations/
                ├── route.ts         # List/create conversations
                └── [id]/
                    ├── route.ts     # Get/delete conversation
                    ├── turn/
                    │   └── route.ts # Add turn
                    └── complete/
                        └── route.ts # Complete conversation
```

---

## Part 6: Implementation Phases

### Phase 1: Core Infrastructure (Week 1)
- Database schema for conversations and turns
- Basic API endpoints (create, add turn, list)
- Conversation service with history building

### Phase 2: Chat UI (Week 2)
- Install chatscope/chat-ui-kit-react
- Build MultiTurnChat container
- Implement useDualChat hook
- Side-by-side response display

### Phase 3: Integration (Week 3)
- Connect UI to API endpoints
- Add loading states and error handling
- Token counting and warnings
- Turn limit enforcement

### Phase 4: Polish (Week 4)
- Streaming responses (if RunPod supports)
- Conversation naming and management
- Per-turn Claude-as-Judge evaluation
- Export conversation to collation format

### Phase 5: Production Hardening
- Retry logic for failed turns
- Graceful degradation when one endpoint fails
- Rate limiting
- Performance optimization

---

## Part 7: Dependencies

### New NPM Packages

```json
{
  "@chatscope/chat-ui-kit-react": "^2.0.0",
  "@chatscope/chat-ui-kit-styles": "^1.4.0"
}
```

### Optional for Streaming

```json
{
  "eventsource-parser": "^1.1.0"  // For SSE parsing
}
```

---

## Part 8: Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Token limits hit quickly | Medium | High | Implement sliding window + warning |
| RunPod latency increases | Medium | Medium | Add timeout handling, retry logic |
| UI complexity overwhelms users | Low | Medium | Start with simple view, add features progressively |
| Conversation state desync | Low | High | Strong transaction handling, optimistic updates with rollback |

---

## Part 9: Success Criteria

1. **Functional:** User can have 10-turn conversation with both endpoints responding
2. **Performance:** Turn response time < 5 seconds for both endpoints
3. **Reliability:** Graceful handling of single-endpoint failures
4. **Data:** All conversations exportable to collation format
5. **UX:** Clear separation of control vs adapted responses at each turn

---

## Conclusion

**Difficulty Summary:**
- Building a basic multi-turn chat: **Medium** (4-5/10)
- Building production-ready with fault tolerance: **Hard** (7/10)
- Timeline estimate: 3-4 weeks for full implementation

**Key Decisions:**
1. Use `@chatscope/chat-ui-kit-react` for UI components
2. Custom `useDualChat` hook for dual-model state management
3. Full conversation history passed on each request (no server-side state)
4. 10-turn limit with token budget warnings
5. Separate page from existing test page

**JSON Format:** No changes needed — existing collation format already supports multi-turn.

**RunPod:** No backend coding differences required — same OpenAI-compatible message format.

---

**Document Control:**
| Field | Value |
|-------|-------|
| Document ID | SPEC-MULTITURN-CHAT-v1 |
| Author | Gemini Agent |
| Created | January 26, 2026 |
| Related | results-and-conversations-collation-spec_v1.md |
