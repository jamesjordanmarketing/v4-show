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
