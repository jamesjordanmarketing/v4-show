/**
 * DualArcProgressionDisplay Component
 * Shows separate arc progression for control and adapted conversations
 * with winner declaration
 */

'use client';

import { ConversationWinnerDeclaration, ArcProgression } from '@/types/conversation';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Trophy } from 'lucide-react';

interface DualArcProgressionDisplayProps {
  controlArcProgression: ArcProgression | null;
  adaptedArcProgression: ArcProgression | null;
  conversationWinner: ConversationWinnerDeclaration | null;
}

export function DualArcProgressionDisplay({
  controlArcProgression,
  adaptedArcProgression,
  conversationWinner,
}: DualArcProgressionDisplayProps) {
  if (!controlArcProgression && !adaptedArcProgression) {
    return (
      <div className="text-sm text-muted-foreground">
        No arc progression data available
      </div>
    );
  }
  
  // Format arc name for display
  const formatArcName = (arcName: string | null) => {
    if (!arcName || arcName === 'none') return 'No clear arc detected';
    return arcName
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' → ')
      .replace('To', '→');
  };
  
  const controlProgress = controlArcProgression?.progressionPercentage || 0;
  const adaptedProgress = adaptedArcProgression?.progressionPercentage || 0;
  const controlOnTrack = controlArcProgression?.onTrack || false;
  const adaptedOnTrack = adaptedArcProgression?.onTrack || false;
  
  return (
    <div className="space-y-4">
      {/* Control Progress Bar */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            <span className="font-medium">Control (Base)</span>
            <Badge variant={controlOnTrack ? 'default' : 'secondary'} className="text-xs">
              {controlArcProgression?.detectedArc === 'response_quality'
                ? (controlOnTrack ? 'Strong EI' : 'Baseline EI')
                : (controlOnTrack ? 'On Track' : 'Off Track')}
            </Badge>
          </div>
          <span className="text-muted-foreground">{controlProgress}%</span>
        </div>
        <Progress 
          value={controlProgress} 
          className={`h-2 ${controlOnTrack ? '[&>div]:bg-blue-500' : '[&>div]:bg-gray-400'}`}
        />
        <div className="text-xs text-muted-foreground">
          {controlArcProgression?.detectedArc === 'response_quality'
            ? `Predicted Impact: ${controlProgress}%`
            : `Arc: ${formatArcName(controlArcProgression?.detectedArc || null)}`}
        </div>
      </div>
      
      {/* Adapted Progress Bar */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            <span className="font-medium">Adapted (LoRA)</span>
            <Badge variant={adaptedOnTrack ? 'default' : 'secondary'} className="text-xs">
              {adaptedArcProgression?.detectedArc === 'response_quality'
                ? (adaptedOnTrack ? 'Strong EI' : 'Baseline EI')
                : (adaptedOnTrack ? 'On Track' : 'Off Track')}
            </Badge>
          </div>
          <span className="text-muted-foreground">{adaptedProgress}%</span>
        </div>
        <Progress 
          value={adaptedProgress} 
          className={`h-2 ${adaptedOnTrack ? '[&>div]:bg-green-500' : '[&>div]:bg-gray-400'}`}
        />
        <div className="text-xs text-muted-foreground">
          {adaptedArcProgression?.detectedArc === 'response_quality'
            ? `Predicted Impact: ${adaptedProgress}%`
            : `Arc: ${formatArcName(adaptedArcProgression?.detectedArc || null)}`}
        </div>
      </div>
      
      {/* Winner Declaration */}
      {conversationWinner && conversationWinner.winner !== 'tie' && (
        <div className="flex items-start gap-2 p-3 bg-green-50 dark:bg-green-950 rounded-lg border border-green-200 dark:border-green-800">
          <Trophy className="h-5 w-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <div className="font-medium text-green-700 dark:text-green-300 text-sm mb-1">
              Winner: {conversationWinner.winner === 'control' ? 'Control (Base)' : 'Adapted (LoRA)'}
            </div>
            <div className="text-xs text-green-600 dark:text-green-400">
              {conversationWinner.reason}
            </div>
          </div>
        </div>
      )}
      
      {conversationWinner && conversationWinner.winner === 'tie' && (
        <div className="p-3 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800">
          <div className="font-medium text-gray-700 dark:text-gray-300 text-sm mb-1">
            Tie
          </div>
          <div className="text-xs text-gray-600 dark:text-gray-400">
            {conversationWinner.reason}
          </div>
        </div>
      )}
    </div>
  );
}
