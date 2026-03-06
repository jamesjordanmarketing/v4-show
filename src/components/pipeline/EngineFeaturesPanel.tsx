/**
 * Engine Features Panel
 * 
 * Display-only panel showing features of the currently loaded engine
 * No interactive elements - single engine architecture
 */

'use client';

import { Cpu, CheckCircle2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrainingEngine } from '@/types/pipeline';

interface EngineFeaturesPanelProps {
  engine: TrainingEngine;
}

export function EngineFeaturesPanel({ engine }: EngineFeaturesPanelProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Cpu className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">Training Engine Features</CardTitle>
          </div>
          <Badge variant="secondary">{engine.name}</Badge>
        </div>
        <p className="text-sm text-muted-foreground mt-1">
          {engine.description}
        </p>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {engine.features.map((feature) => (
            <div
              key={feature.id}
              className="flex items-start gap-3 p-3 rounded-lg bg-muted/50"
            >
              <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium text-sm">{feature.name}</p>
                <p className="text-sm text-muted-foreground">{feature.description}</p>
              </div>
            </div>
          ))}
        </div>
        
        <p className="text-xs text-muted-foreground mt-4 italic">
          These features are automatically applied during training. No configuration needed.
        </p>
      </CardContent>
    </Card>
  );
}
