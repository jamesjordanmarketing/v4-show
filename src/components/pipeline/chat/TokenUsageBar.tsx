/**
 * TokenUsageBar Component
 * Token usage indicator
 */

'use client';

import { TokenUsage } from '@/types/conversation';
import { Progress } from '@/components/ui/progress';

interface TokenUsageBarProps {
  tokenUsage: TokenUsage;
}

export function TokenUsageBar({ tokenUsage }: TokenUsageBarProps) {
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>Token Usage</span>
        <span>{tokenUsage.totalTokens.toLocaleString()} tokens</span>
      </div>
      <Progress 
        value={tokenUsage.percentageUsed * 100} 
        className={tokenUsage.isNearLimit ? '[&>div]:bg-yellow-500' : ''}
      />
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>Control: {tokenUsage.controlTokens.toLocaleString()}</span>
        <span>Adapted: {tokenUsage.adaptedTokens.toLocaleString()}</span>
      </div>
    </div>
  );
}
