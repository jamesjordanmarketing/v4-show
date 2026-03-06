/**
 * Post-Training Evaluation Info
 * 
 * Display-only panel showing automatic evaluations that will run after training
 */

'use client';

import { Beaker, Clock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AutomaticEvaluation } from '@/types/pipeline';

interface PostTrainingEvaluationInfoProps {
  evaluations: AutomaticEvaluation[];
}

export function PostTrainingEvaluationInfo({ evaluations }: PostTrainingEvaluationInfoProps) {
  const totalTime = evaluations.reduce((sum, e) => sum + e.estimatedMinutes, 0);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Beaker className="h-5 w-5 text-primary" />
          <CardTitle className="text-lg">Automatic Quality Evaluation</CardTitle>
        </div>
        <p className="text-sm text-muted-foreground mt-1">
          After training completes, these evaluations will run automatically to measure quality.
        </p>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {evaluations.map((evaluation) => (
            <div
              key={evaluation.id}
              className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
            >
              <div>
                <p className="font-medium text-sm">{evaluation.name}</p>
                <p className="text-sm text-muted-foreground">{evaluation.description}</p>
              </div>
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span>~{evaluation.estimatedMinutes}m</span>
              </div>
            </div>
          ))}
        </div>
        
        <div className="mt-4 pt-4 border-t flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Total evaluation time</span>
          <span className="font-medium">~{totalTime} minutes</span>
        </div>
      </CardContent>
    </Card>
  );
}
