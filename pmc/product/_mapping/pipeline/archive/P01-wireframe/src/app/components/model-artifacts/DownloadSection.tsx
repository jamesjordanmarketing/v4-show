import React, { useState } from 'react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Progress } from '../ui/progress';
import { Download, FileText, Check } from 'lucide-react';
import type { ModelArtifact } from '../../data/modelArtifactsMockData';
import { formatFileSize, simulateDownload } from '../../data/modelArtifactsMockData';

interface DownloadSectionProps {
  model: ModelArtifact;
  onDownloadComplete: () => void;
}

export function DownloadSection({ model, onDownloadComplete }: DownloadSectionProps) {
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  
  const handleDownload = () => {
    setIsDownloading(true);
    setDownloadProgress(0);
    setIsComplete(false);
    
    simulateDownload(
      (progress) => setDownloadProgress(progress),
      () => {
        setIsDownloading(false);
        setIsComplete(true);
        onDownloadComplete();
        
        // Reset complete state after 3 seconds
        setTimeout(() => setIsComplete(false), 3000);
      }
    );
  };
  
  const handleDownloadLogs = () => {
    console.log('Downloading training logs from:', model.trainingLogsPath);
    // In real app: trigger actual download
  };
  
  return (
    <Card className="p-6 border-2 border-blue-200 bg-blue-50/30">
      <div className="flex items-start gap-4">
        <div className="size-12 bg-blue-500 rounded-lg flex items-center justify-center shrink-0">
          {isComplete ? (
            <Check className="size-6 text-white" />
          ) : (
            <Download className="size-6 text-white" />
          )}
        </div>
        
        <div className="flex-1">
          <h3 className="font-semibold text-lg mb-1">Download LoRA Adapter</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Ready-to-use LoRA adapter compatible with your base model
          </p>
          
          {/* Download Button */}
          {!isDownloading && !isComplete && (
            <Button
              size="lg"
              className="w-full bg-blue-600 hover:bg-blue-700 mb-3"
              onClick={handleDownload}
            >
              <Download className="size-5 mr-2" />
              Download LoRA Adapter ({formatFileSize(model.fileSize)})
            </Button>
          )}
          
          {/* Progress */}
          {isDownloading && (
            <div className="space-y-2 mb-3">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">Downloading...</span>
                <span className="text-muted-foreground">{Math.round(downloadProgress)}%</span>
              </div>
              <Progress value={downloadProgress} className="h-2" />
            </div>
          )}
          
          {/* Complete State */}
          {isComplete && (
            <div className="p-3 bg-green-50 border border-green-200 rounded-lg mb-3">
              <div className="flex items-center gap-2">
                <Check className="size-5 text-green-600" />
                <p className="text-sm text-green-800 font-medium">
                  Download complete! adapter_model.bin ({formatFileSize(model.fileSize)})
                </p>
              </div>
            </div>
          )}
          
          {/* Files Included */}
          <div className="p-3 bg-muted/50 rounded-lg mb-3">
            <p className="text-xs text-muted-foreground mb-2">Files included:</p>
            <ul className="text-sm space-y-1">
              <li className="flex items-center gap-2">
                <span className="size-1.5 bg-blue-600 rounded-full"></span>
                <code className="text-xs">adapter_model.bin</code>
                <span className="text-muted-foreground">({formatFileSize(model.fileSize)})</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="size-1.5 bg-blue-600 rounded-full"></span>
                <code className="text-xs">adapter_config.json</code>
                <span className="text-muted-foreground">(2 KB)</span>
              </li>
            </ul>
          </div>
          
          {/* Secondary Download */}
          <Button
            variant="ghost"
            size="sm"
            className="w-full"
            onClick={handleDownloadLogs}
          >
            <FileText className="size-4 mr-2" />
            Download Training Logs
          </Button>
        </div>
      </div>
    </Card>
  );
}
