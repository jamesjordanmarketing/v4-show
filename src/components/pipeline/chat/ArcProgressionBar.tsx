/**
 * ArcProgressionBar Component
 * Displays visual arc progression for multi-turn evaluation
 */

'use client';

import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';

interface ArcProgressionBarProps {
  arcName: string | null;
  progressionPercentage: number;
  onTrack: boolean;
}

export function ArcProgressionBar({ arcName, progressionPercentage, onTrack }: ArcProgressionBarProps) {
  if (!arcName || arcName === 'none') {
    return (
      <div className="text-sm text-muted-foreground">
        No clear arc trajectory detected
      </div>
    );
  }
  
  // Format arc name for display
  const displayName = arcName
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' → ')
    .replace('To', '→');
  
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium">{displayName}</span>
        <Badge variant={onTrack ? 'default' : 'secondary'}>
          {onTrack ? 'On Track' : 'Off Track'}
        </Badge>
      </div>
      <Progress 
        value={progressionPercentage} 
        className={`h-2 ${onTrack ? '[&>div]:bg-green-500' : '[&>div]:bg-yellow-500'}`}
      />
      <div className="text-xs text-muted-foreground text-right">
        {progressionPercentage}% complete
      </div>
    </div>
  );
}
