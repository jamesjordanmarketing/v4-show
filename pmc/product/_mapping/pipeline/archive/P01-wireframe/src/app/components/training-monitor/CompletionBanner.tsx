import React from 'react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Sparkles, Download, ExternalLink, ArrowRight } from 'lucide-react';
import type { TrainingJob } from '../../data/trainingMonitorMockData';

interface CompletionBannerProps {
  job: TrainingJob;
  onViewModel: () => void;
  onDownloadArtifacts: () => void;
}

export function CompletionBanner({ job, onViewModel, onDownloadArtifacts }: CompletionBannerProps) {
  if (job.status !== 'completed' || !job.finalMetrics) {
    return null;
  }
  
  return (
    <Card className="p-6 bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-300">
      <div className="flex items-start gap-4">
        <div className="size-12 bg-green-500 rounded-full flex items-center justify-center shrink-0">
          <Sparkles className="size-6 text-white" />
        </div>
        
        <div className="flex-1">
          <h3 className="text-xl font-semibold text-green-900 mb-1">
            🎉 Training Complete!
          </h3>
          <p className="text-sm text-green-800 mb-4">
            Your LoRA model has been successfully trained and is ready to use.
          </p>
          
          {/* Final Metrics */}
          <div className="grid grid-cols-3 gap-4 mb-4 p-4 bg-white/50 rounded-lg">
            <div>
              <p className="text-xs text-green-700 mb-1">Final Training Loss</p>
              <p className="text-lg font-bold text-green-900">
                {job.finalMetrics.finalTrainingLoss.toFixed(4)}
              </p>
            </div>
            <div>
              <p className="text-xs text-green-700 mb-1">Final Validation Loss</p>
              <p className="text-lg font-bold text-green-900">
                {job.finalMetrics.finalValidationLoss.toFixed(4)}
              </p>
            </div>
            <div>
              <p className="text-xs text-green-700 mb-1">Final Perplexity</p>
              <p className="text-lg font-bold text-green-900">
                {job.finalMetrics.finalPerplexity.toFixed(2)}
              </p>
            </div>
          </div>
          
          {/* Action Buttons */}
          <div className="flex gap-3">
            <Button
              size="lg"
              className="bg-green-600 hover:bg-green-700"
              onClick={onViewModel}
            >
              <ExternalLink className="size-4 mr-2" />
              View LoRA Model
              <ArrowRight className="size-4 ml-2" />
            </Button>
            <Button
              variant="outline"
              size="lg"
              onClick={onDownloadArtifacts}
            >
              <Download className="size-4 mr-2" />
              Download Artifacts
            </Button>
          </div>
        </div>
      </div>
      
      {/* Additional Info */}
      <div className="mt-4 pt-4 border-t border-green-200">
        <p className="text-xs text-green-700">
          <span className="font-semibold">Note:</span> An email notification has been sent with training results.
          The LoRA adapter is stored at: <code className="bg-green-100 px-1 py-0.5 rounded text-xs">
            {job.loraArtifactPath}
          </code>
        </p>
      </div>
    </Card>
  );
}
