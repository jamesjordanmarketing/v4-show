# Multi-Turn Chat - Execution Prompt E09: API, Hook, and UI Components

**Version:** 1.0  
**Date:** January 31, 2026  
**Section:** E09 - Dual Input UI Implementation  
**Prerequisites:** E08 complete (Database + Types + Service Layer)  
**Status:** Ready for Execution

---

## Overview

This section implements the user-facing dual input interface. Users will now see two separate input fields - one for Control and one for Adapted - enabling true A/B testing with different prompts.

**What This Section Creates:**
1. Updated API route to accept dual messages
2. Updated React hook with dual input state
3. New ChatInput component with two textareas
4. Updated display components to show both messages
5. Backward compatibility maintained

**What This Section Does NOT Change:**
- Database (already updated in E08)
- Service layer (already updated in E08)
- Scrolling issues (E10)

---

## Critical Instructions

### Build Context

**Codebase:** `C:\Users\james\Master\BrightHub\BRun\v4-show\src`

**Target Environment:**
- Next.js 14.2.x
- React 18.x
- TypeScript (strict mode)
- Radix UI components

---

## Reference Documents

- Full Spec: `C:\Users\james\Master\BrightHub\BRun\v4-show\pmc\product\_mapping\multi\workfiles\multi-input-and-scroll_v1.md`
- E08 Output: Database columns and types are ready to use

---

========================


# EXECUTION PROMPT E09: Dual User Inputs - API, Hook & UI

## Your Mission

You are implementing the user interface for separate Control vs Adapted inputs. Users will now be able to enter DIFFERENT prompts for each endpoint, enabling true A/B testing.

Your job is to:
1. Update API route to accept both messages
2. Update React hook to manage dual input state
3. Create new ChatInput component with two textareas
4. Update display components to show both messages
5. Maintain backward compatibility

---

## Context: What's Already Done (E08)

✅ Database has `control_user_message` and `adapted_user_message` columns  
✅ TypeScript types updated with `AddTurnRequest` interface  
✅ Service layer uses correct message per endpoint  
✅ Helper functions exist: `getUserMessageForEndpoint()`, `turnMessagesAreIdentical()`

**You are building on top of this foundation.**

---

## Phase 1: API Layer

### Task 1: Update Turn Creation API

**File:** `src/app/api/pipeline/conversations/[id]/turn/route.ts`

#### Step 1: Read Current File

Read the entire file first to understand the structure.

#### Step 2: Update POST Function

**FIND THIS** (around line 17-43):
```typescript
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { user, response } = await requireAuth(request);
    if (response) return response;
    
    const body: AddTurnRequest = await request.json();
    
    if (!body.userMessage || body.userMessage.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: 'userMessage is required' },
        { status: 400 }
      );
    }
    
    const result = await addTurn(user.id, params.id, body);
    return NextResponse.json(result, { status: result.success ? 200 : 400 });
  } catch (error) {
    console.error('POST /api/pipeline/conversations/[id]/turn error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

**REPLACE WITH:**
```typescript
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { user, response } = await requireAuth(request);
    if (response) return response;
    
    const body = await request.json();
    
    // NEW: Support both new dual-message format and legacy single-message format
    let turnRequest: AddTurnRequest;
    
    if ('controlUserMessage' in body && 'adaptedUserMessage' in body) {
      // New format: separate messages
      turnRequest = body as AddTurnRequest;
      
      if (!turnRequest.controlUserMessage || turnRequest.controlUserMessage.trim().length === 0) {
        return NextResponse.json(
          { success: false, error: 'controlUserMessage is required' },
          { status: 400 }
        );
      }
      
      if (!turnRequest.adaptedUserMessage || turnRequest.adaptedUserMessage.trim().length === 0) {
        return NextResponse.json(
          { success: false, error: 'adaptedUserMessage is required' },
          { status: 400 }
        );
      }
    } else if ('userMessage' in body) {
      // Legacy format: single message (send same to both)
      const legacyBody = body as LegacyAddTurnRequest;
      
      if (!legacyBody.userMessage || legacyBody.userMessage.trim().length === 0) {
        return NextResponse.json(
          { success: false, error: 'userMessage is required' },
          { status: 400 }
        );
      }
      
      // Convert to new format (same message for both endpoints)
      turnRequest = {
        controlUserMessage: legacyBody.userMessage,
        adaptedUserMessage: legacyBody.userMessage,
        enableEvaluation: legacyBody.enableEvaluation,
        evaluationPromptId: legacyBody.evaluationPromptId,
      };
    } else {
      return NextResponse.json(
        { success: false, error: 'Either userMessage (legacy) or controlUserMessage+adaptedUserMessage (new) are required' },
        { status: 400 }
      );
    }
    
    const result = await addTurn(user.id, params.id, turnRequest);
    return NextResponse.json(result, { status: result.success ? 200 : 400 });
  } catch (error) {
    console.error('POST /api/pipeline/conversations/[id]/turn error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

#### Step 3: Add Import for LegacyAddTurnRequest

**At top of file** (around line 14), update imports:

**FIND THIS:**
```typescript
import { AddTurnRequest } from '@/types/conversation';
```

**REPLACE WITH:**
```typescript
import { AddTurnRequest, LegacyAddTurnRequest } from '@/types/conversation';
```

---

## Phase 2: React Hook

### Task 2: Update useDualChat Hook

**File:** `src/hooks/useDualChat.ts`

#### Step 1: Update Interface (Lines 83-125)

**FIND THIS:**
```typescript
export interface UseDualChatReturn {
  // Conversation list
  conversations: Conversation[];
  isLoadingConversations: boolean;
  
  // Current conversation
  conversation: ConversationWithTurns | null;
  isLoadingConversation: boolean;
  
  // Turns
  turns: ConversationTurn[];
  
  // Input state
  input: string;
  setInput: (value: string) => void;
```

**REPLACE WITH:**
```typescript
export interface UseDualChatReturn {
  // Conversation list
  conversations: Conversation[];
  isLoadingConversations: boolean;
  
  // Current conversation
  conversation: ConversationWithTurns | null;
  isLoadingConversation: boolean;
  
  // Turns
  turns: ConversationTurn[];
  
  // NEW: Dual input state
  controlInput: string;
  setControlInput: (value: string) => void;
  adaptedInput: string;
  setAdaptedInput: (value: string) => void;
  
  // DEPRECATED: Legacy single input (kept for compatibility)
  input: string;
  setInput: (value: string) => void;
```

#### Step 2: Add State Variables (Around line 128)

**FIND THIS:**
```typescript
export function useDualChat(jobId: string, initialConversationId?: string): UseDualChatReturn {
  const [selectedId, setSelectedId] = useState<string | null>(initialConversationId || null);
  const [input, setInput] = useState('');
  const [enableEvaluation, setEnableEvaluation] = useState(false);
```

**REPLACE WITH:**
```typescript
export function useDualChat(jobId: string, initialConversationId?: string): UseDualChatReturn {
  const [selectedId, setSelectedId] = useState<string | null>(initialConversationId || null);
  
  // NEW: Dual input state
  const [controlInput, setControlInput] = useState('');
  const [adaptedInput, setAdaptedInput] = useState('');
  
  // DEPRECATED: Legacy single input (keep for backward compat)
  const [input, setInput] = useState('');
  
  const [enableEvaluation, setEnableEvaluation] = useState(false);
```

#### Step 3: Update Add Turn Mutation (Around line 164)

**FIND THIS:**
```typescript
  // Add turn mutation
  const addTurnMutation = useMutation({
    mutationFn: ({ conversationId, request }: { conversationId: string; request: AddTurnRequest }) =>
      addTurnApi(conversationId, request),
    onSuccess: () => {
      if (selectedId) {
        queryClient.invalidateQueries({ queryKey: conversationKeys.detail(selectedId) });
      }
      setInput('');
    },
  });
```

**REPLACE WITH:**
```typescript
  // Add turn mutation
  const addTurnMutation = useMutation({
    mutationFn: ({ conversationId, request }: { conversationId: string; request: AddTurnRequest }) =>
      addTurnApi(conversationId, request),
    onSuccess: () => {
      if (selectedId) {
        queryClient.invalidateQueries({ queryKey: conversationKeys.detail(selectedId) });
      }
      // NEW: Clear both inputs
      setControlInput('');
      setAdaptedInput('');
      setInput('');
    },
  });
```

#### Step 4: Update canSendMessage Computed Value (Around line 209)

**FIND THIS:**
```typescript
  const canSendMessage = 
    !!selectedId && 
    conversation?.status === 'active' && 
    !isAtMaxTurns &&
    !addTurnMutation.isPending &&
    input.trim().length > 0;
```

**REPLACE WITH:**
```typescript
  // NEW: Can send if BOTH inputs have content
  const canSendMessage = 
    !!selectedId && 
    conversation?.status === 'active' && 
    !isAtMaxTurns &&
    !addTurnMutation.isPending &&
    controlInput.trim().length > 0 &&
    adaptedInput.trim().length > 0;
```

#### Step 5: Update sendMessage Function (Around line 219)

**FIND THIS:**
```typescript
  const sendMessage = useCallback(async (message?: string) => {
    if (!selectedId) return;
    
    const messageToSend = message || input;
    if (!messageToSend.trim()) return;
    
    await addTurnMutation.mutateAsync({
      conversationId: selectedId,
      request: {
        userMessage: messageToSend.trim(),
        enableEvaluation,
        evaluationPromptId: enableEvaluation ? selectedEvaluatorId : undefined,
      },
    });
  }, [selectedId, input, enableEvaluation, selectedEvaluatorId, addTurnMutation]);
```

**REPLACE WITH:**
```typescript
  const sendMessage = useCallback(async (controlMessage?: string, adaptedMessage?: string) => {
    if (!selectedId) return;
    
    const controlToSend = controlMessage || controlInput;
    const adaptedToSend = adaptedMessage || adaptedInput;
    
    if (!controlToSend.trim() || !adaptedToSend.trim()) return;
    
    await addTurnMutation.mutateAsync({
      conversationId: selectedId,
      request: {
        controlUserMessage: controlToSend.trim(),
        adaptedUserMessage: adaptedToSend.trim(),
        enableEvaluation,
        evaluationPromptId: enableEvaluation ? selectedEvaluatorId : undefined,
      },
    });
  }, [selectedId, controlInput, adaptedInput, enableEvaluation, selectedEvaluatorId, addTurnMutation]);
```

#### Step 6: Update selectConversation Function (Around line 243)

**FIND THIS:**
```typescript
  const selectConversation = useCallback((conversationId: string) => {
    setSelectedId(conversationId);
    setInput('');
  }, []);
```

**REPLACE WITH:**
```typescript
  const selectConversation = useCallback((conversationId: string) => {
    setSelectedId(conversationId);
    setControlInput('');
    setAdaptedInput('');
    setInput('');
  }, []);
```

#### Step 7: Update Return Object (Around line 257)

**FIND THIS:**
```typescript
  return {
    conversations,
    isLoadingConversations,
    conversation: conversation || null,
    isLoadingConversation,
    turns,
    input,
    setInput,
    enableEvaluation,
```

**REPLACE WITH:**
```typescript
  return {
    conversations,
    isLoadingConversations,
    conversation: conversation || null,
    isLoadingConversation,
    turns,
    
    // NEW: Dual inputs
    controlInput,
    setControlInput,
    adaptedInput,
    setAdaptedInput,
    
    // DEPRECATED: Legacy input
    input,
    setInput,
    
    enableEvaluation,
```

---

## Phase 3: UI Components

### Task 3: Replace ChatInput Component

**File:** `src/components/pipeline/chat/ChatInput.tsx`

**REPLACE ENTIRE FILE WITH:**

```typescript
/**
 * ChatInput Component
 * Dual message input with send button and evaluation controls
 */

'use client';

import { KeyboardEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Send, Loader2 } from 'lucide-react';

interface ChatInputProps {
  // NEW: Dual inputs
  controlInput: string;
  onControlInputChange: (value: string) => void;
  adaptedInput: string;
  onAdaptedInputChange: (value: string) => void;
  
  onSend: (controlMessage?: string, adaptedMessage?: string) => Promise<void>;
  isSending: boolean;
  canSend: boolean;
  isAtMaxTurns: boolean;
  isCompleted: boolean;
  enableEvaluation: boolean;
  onEnableEvaluationChange: (value: boolean) => void;
  selectedEvaluatorId: string | undefined;
  onEvaluatorChange: (id: string | undefined) => void;
  evaluators: any[];
}

export function ChatInput({
  controlInput,
  onControlInputChange,
  adaptedInput,
  onAdaptedInputChange,
  onSend,
  isSending,
  canSend,
  isAtMaxTurns,
  isCompleted,
  enableEvaluation,
  onEnableEvaluationChange,
  selectedEvaluatorId,
  onEvaluatorChange,
  evaluators,
}: ChatInputProps) {
  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (canSend) {
        onSend();
      }
    }
  };
  
  const isDisabled = isCompleted || isAtMaxTurns;
  
  return (
    <div className="p-4 border-t space-y-3">
      {/* Evaluation Controls */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <Switch
            id="enableEvaluation"
            checked={enableEvaluation}
            onCheckedChange={onEnableEvaluationChange}
            disabled={isDisabled}
          />
          <Label htmlFor="enableEvaluation" className="text-sm">
            Enable Evaluation
          </Label>
        </div>
        
        {enableEvaluation && (
          <Select
            value={selectedEvaluatorId}
            onValueChange={onEvaluatorChange}
            disabled={isDisabled}
          >
            <SelectTrigger className="w-[280px]">
              <SelectValue placeholder="Select evaluator" />
            </SelectTrigger>
            <SelectContent>
              {evaluators.map((e) => (
                <SelectItem key={e.id} value={e.id}>
                  {e.displayName}
                  {e.name?.includes('multi_turn') && (
                    <span className="ml-2 text-xs text-green-600">(Multi-Turn)</span>
                  )}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>
      
      {/* Dual Input Areas */}
      <div className="space-y-3">
        {/* Control Input */}
        <div className="space-y-1.5">
          <Label htmlFor="controlInput" className="text-sm font-medium">
            Control Input <span className="text-muted-foreground font-normal">(Base Model)</span>
          </Label>
          <Textarea
            id="controlInput"
            value={controlInput}
            onChange={(e) => onControlInputChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              isCompleted 
                ? 'Conversation completed'
                : isAtMaxTurns 
                  ? 'Maximum turns reached'
                  : 'Type message for Control endpoint...'
            }
            disabled={isDisabled}
            className="min-h-[60px] resize-none"
          />
        </div>
        
        {/* Adapted Input */}
        <div className="space-y-1.5">
          <Label htmlFor="adaptedInput" className="text-sm font-medium">
            Adapted Input <span className="text-muted-foreground font-normal">(LoRA Model)</span>
          </Label>
          <Textarea
            id="adaptedInput"
            value={adaptedInput}
            onChange={(e) => onAdaptedInputChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              isCompleted 
                ? 'Conversation completed'
                : isAtMaxTurns 
                  ? 'Maximum turns reached'
                  : 'Type message for Adapted endpoint...'
            }
            disabled={isDisabled}
            className="min-h-[60px] resize-none"
          />
        </div>
      </div>
      
      {/* Send Button */}
      <div className="flex justify-end">
        <Button
          onClick={() => onSend()}
          disabled={!canSend || isSending}
          size="default"
        >
          {isSending ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Sending Both...
            </>
          ) : (
            <>
              <Send className="h-4 w-4 mr-2" />
              Send Both
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
```

### Task 4: Update ChatMain Component

**File:** `src/components/pipeline/chat/ChatMain.tsx`

#### Step 1: Update Props Interface (Lines 15-35)

**FIND THIS:**
```typescript
interface ChatMainProps {
  conversation: ConversationWithTurns | null;
  turns: ConversationTurn[];
  input: string;
  onInputChange: (value: string) => void;
  onSend: (message?: string) => Promise<void>;
```

**REPLACE WITH:**
```typescript
interface ChatMainProps {
  conversation: ConversationWithTurns | null;
  turns: ConversationTurn[];
  
  // NEW: Dual inputs
  controlInput: string;
  onControlInputChange: (value: string) => void;
  adaptedInput: string;
  onAdaptedInputChange: (value: string) => void;
  
  onSend: (controlMessage?: string, adaptedMessage?: string) => Promise<void>;
```

#### Step 2: Update Function Signature (Around line 37)

**FIND THIS:**
```typescript
export function ChatMain({
  conversation,
  turns,
  input,
  onInputChange,
  onSend,
```

**REPLACE WITH:**
```typescript
export function ChatMain({
  conversation,
  turns,
  controlInput,
  onControlInputChange,
  adaptedInput,
  onAdaptedInputChange,
  onSend,
```

#### Step 3: Update ChatInput Props (Around line 91)

**FIND THIS:**
```typescript
      <ChatInput
        input={input}
        onInputChange={onInputChange}
        onSend={onSend}
```

**REPLACE WITH:**
```typescript
      <ChatInput
        controlInput={controlInput}
        onControlInputChange={onControlInputChange}
        adaptedInput={adaptedInput}
        onAdaptedInputChange={onAdaptedInputChange}
        onSend={onSend}
```

### Task 5: Update MultiTurnChat Component

**File:** `src/components/pipeline/chat/MultiTurnChat.tsx`

#### Update ChatMain Props (Around line 42)

**FIND THIS:**
```typescript
        <ChatMain
          conversation={chat.conversation}
          turns={chat.turns}
          input={chat.input}
          onInputChange={chat.setInput}
          onSend={chat.sendMessage}
```

**REPLACE WITH:**
```typescript
        <ChatMain
          conversation={chat.conversation}
          turns={chat.turns}
          
          {/* NEW: Pass dual inputs */}
          controlInput={chat.controlInput}
          onControlInputChange={chat.setControlInput}
          adaptedInput={chat.adaptedInput}
          onAdaptedInputChange={chat.setAdaptedInput}
          
          onSend={chat.sendMessage}
```

### Task 6: Update ChatTurn Component

**File:** `src/components/pipeline/chat/ChatTurn.tsx`

**REPLACE ENTIRE FILE WITH:**

```typescript
/**
 * ChatTurn Component
 * Single turn with user message(s) and dual responses
 */

'use client';

import { ConversationTurn, getUserMessageForEndpoint, turnMessagesAreIdentical } from '@/types/conversation';
import { DualResponsePanel } from './DualResponsePanel';
import { DualArcProgressionDisplay } from './DualArcProgressionDisplay';
import { Badge } from '@/components/ui/badge';
import { User } from 'lucide-react';

interface ChatTurnProps {
  turn: ConversationTurn;
}

export function ChatTurn({ turn }: ChatTurnProps) {
  const showDualArcProgression = turn.controlArcProgression || turn.adaptedArcProgression;
  
  // NEW: Check if messages are different
  const messagesAreIdentical = turnMessagesAreIdentical(turn);
  const controlMessage = getUserMessageForEndpoint(turn, 'control');
  const adaptedMessage = getUserMessageForEndpoint(turn, 'adapted');
  
  return (
    <div className="space-y-3">
      {/* User Message(s) */}
      <div className="flex gap-3">
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary flex items-center justify-center">
          <User className="h-4 w-4 text-primary-foreground" />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-medium text-sm">You</span>
            <Badge variant="outline" className="text-xs">Turn {turn.turnNumber}</Badge>
          </div>
          
          {messagesAreIdentical ? (
            // Same message for both
            <p className="text-sm">{controlMessage}</p>
          ) : (
            // Different messages - show both
            <div className="space-y-2 text-sm">
              <div>
                <span className="font-medium text-blue-600">Control: </span>
                <span>{controlMessage}</span>
              </div>
              <div>
                <span className="font-medium text-purple-600">Adapted: </span>
                <span>{adaptedMessage}</span>
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* Dual Responses */}
      <DualResponsePanel turn={turn} />
      
      {/* Dual Arc Progression Display */}
      {showDualArcProgression && (
        <div className="ml-11 p-4 bg-slate-50 dark:bg-slate-900 rounded-lg border">
          <div className="font-medium text-sm mb-3">Conversation Arc Progression</div>
          <DualArcProgressionDisplay
            controlArcProgression={turn.controlArcProgression}
            adaptedArcProgression={turn.adaptedArcProgression}
            conversationWinner={turn.conversationWinner || null}
          />
        </div>
      )}
    </div>
  );
}
```

---

## Phase 4: Verification

### Task 7: Build and Test

#### Step 1: TypeScript Build

```bash
cd "c:/Users/james/Master/BrightHub/BRun/v4-show/src" && npm run build
```

**Expected:** Exit code 0, no TypeScript errors.

#### Step 2: Visual Verification

If you can run the dev server:

```bash
cd "c:/Users/james/Master/BrightHub/BRun/v4-show/src" && npm run dev
```

Navigate to `/pipeline/jobs/{jobId}/chat` and verify:
- Two input fields visible
- Labels: "Control Input (Base Model)" and "Adapted Input (LoRA Model)"
- Send button shows "Send Both"
- Send button only enabled when BOTH fields have text
- Old conversations still display correctly

#### Step 3: Code Review Checklist

- [ ] API route handles both new and legacy formats
- [ ] React hook has dual input state
- [ ] ChatInput has two separate textareas
- [ ] ChatMain passes dual inputs correctly
- [ ] MultiTurnChat passes dual inputs to ChatMain
- [ ] ChatTurn shows both messages when different
- [ ] Helper functions imported correctly

---

## Success Criteria

After completing this section:

- [x] API route accepts dual messages
- [x] API route supports legacy single-message format
- [x] React hook manages two separate input states
- [x] ChatInput component has two labeled textareas
- [x] Send button requires both fields to have content
- [x] ChatMain and MultiTurnChat updated to pass dual inputs
- [x] ChatTurn displays both messages when different
- [x] TypeScript build succeeds (exit code 0)
- [x] Backward compatibility maintained

---

## What's Next

**E10** will:
- Fix scrolling issues (CSS changes)
- Comprehensive testing with actual conversations
- Create final documentation

---

## If Something Goes Wrong

### TypeScript Errors

Common issues:
1. **"Property does not exist on type"** - Check imports of helper functions
2. **"Type mismatch"** - Verify `AddTurnRequest` vs `LegacyAddTurnRequest`
3. **"Cannot find name"** - Add missing imports

### UI Not Showing Dual Inputs

1. Check ChatInput props are being passed from ChatMain
2. Verify MultiTurnChat passes values from hook
3. Check that hook exports controlInput and adaptedInput

### Send Button Not Enabling

1. Verify `canSendMessage` checks both inputs
2. Check that both textareas update their respective state
3. Ensure no typos in prop names

---

## Notes for Agent

1. **Follow the order strictly** - API → Hook → Components
2. **Replace entire files when specified** - Don't try to merge changes
3. **Test after each phase** - Run build to catch errors early
4. **Use helper functions** - They're in the types file, import them
5. **Maintain backward compatibility** - Legacy format must still work

---

**End of E09 Prompt**


+++++++++++++++++
