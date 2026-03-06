/**
 * DualResponsePanel Component
 * Side-by-side control and adapted responses
 */

'use client';

import { ConversationTurn } from '@/types/conversation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AlertCircle, Clock } from 'lucide-react';

interface DualResponsePanelProps {
  turn: ConversationTurn;
}

export function DualResponsePanel({ turn }: DualResponsePanelProps) {
  const winner = turn.evaluationComparison?.winner;
  
  return (
    <div className="ml-11 grid grid-cols-2 gap-4">
      {/* Control Response */}
      <Card className={winner === 'control' ? 'ring-2 ring-green-500' : ''}>
        <CardHeader className="py-2 px-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium">
              Control (Base)
              {winner === 'control' && (
                <Badge variant="default" className="ml-2 bg-green-500">Winner</Badge>
              )}
            </CardTitle>
            {turn.controlGenerationTimeMs && (
              <div className="flex items-center text-xs text-muted-foreground">
                <Clock className="h-3 w-3 mr-1" />
                {(turn.controlGenerationTimeMs / 1000).toFixed(1)}s
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent className="py-2 px-4 text-sm">
          {turn.controlError ? (
            <div className="flex items-center text-destructive">
              <AlertCircle className="h-4 w-4 mr-2" />
              {turn.controlError}
            </div>
          ) : turn.controlResponse ? (
            <ScrollArea className="h-[300px] w-full">
              <p className="whitespace-pre-wrap pr-4">{turn.controlResponse}</p>
            </ScrollArea>
          ) : (
            <span className="text-muted-foreground">Generating...</span>
          )}
        </CardContent>
      </Card>
      
      {/* Adapted Response */}
      <Card className={winner === 'adapted' ? 'ring-2 ring-green-500' : ''}>
        <CardHeader className="py-2 px-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium">
              Adapted (LoRA)
              {winner === 'adapted' && (
                <Badge variant="default" className="ml-2 bg-green-500">Winner</Badge>
              )}
            </CardTitle>
            {turn.adaptedGenerationTimeMs && (
              <div className="flex items-center text-xs text-muted-foreground">
                <Clock className="h-3 w-3 mr-1" />
                {(turn.adaptedGenerationTimeMs / 1000).toFixed(1)}s
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent className="py-2 px-4 text-sm">
          {turn.adaptedError ? (
            <div className="flex items-center text-destructive">
              <AlertCircle className="h-4 w-4 mr-2" />
              {turn.adaptedError}
            </div>
          ) : turn.adaptedResponse ? (
            <ScrollArea className="h-[300px] w-full">
              <p className="whitespace-pre-wrap pr-4">{turn.adaptedResponse}</p>
            </ScrollArea>
          ) : (
            <span className="text-muted-foreground">Generating...</span>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
