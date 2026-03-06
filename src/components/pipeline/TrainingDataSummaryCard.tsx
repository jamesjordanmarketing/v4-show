/**
 * Training Data Summary Card
 * 
 * Displays selected training file information at top of configuration
 */

'use client';

import { FileText, CheckCircle2, AlertCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface TrainingDataSummaryProps {
  fileName: string | null;
  conversationCount?: number;
  trainingPairsCount?: number;
  isReady: boolean;
  onSelectFile: () => void;
}

export function TrainingDataSummaryCard({
  fileName,
  conversationCount = 0,
  trainingPairsCount = 0,
  isReady,
  onSelectFile,
}: TrainingDataSummaryProps) {
  if (!fileName) {
    return (
      <Card className="border-dashed border-2 border-muted-foreground/25">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-lg bg-muted flex items-center justify-center">
                <FileText className="h-6 w-6 text-muted-foreground" />
              </div>
              <div>
                <h3 className="font-semibold text-lg">Your Training Data</h3>
                <p className="text-muted-foreground">
                  No training file selected. Select a file to begin configuration.
                </p>
              </div>
            </div>
            <Button onClick={onSelectFile}>
              Select Training File
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={isReady ? 'border-green-500/50 bg-green-50/50 dark:bg-green-950/20' : ''}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className={`h-12 w-12 rounded-lg flex items-center justify-center ${
              isReady ? 'bg-green-100 dark:bg-green-900' : 'bg-amber-100 dark:bg-amber-900'
            }`}>
              {isReady ? (
                <CheckCircle2 className="h-6 w-6 text-green-600 dark:text-green-400" />
              ) : (
                <AlertCircle className="h-6 w-6 text-amber-600 dark:text-amber-400" />
              )}
            </div>
            <div>
              <h3 className="font-semibold text-lg">Your Training Data</h3>
              <p className="text-muted-foreground">{fileName}</p>
              <div className="flex gap-4 mt-1 text-sm text-muted-foreground">
                <span>{conversationCount} conversations</span>
                <span>•</span>
                <span>{trainingPairsCount} training examples</span>
              </div>
            </div>
          </div>
          <Button variant="outline" onClick={onSelectFile}>
            Change File
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
