'use client';

import { useState } from 'react';
import { useModel, useDownloadModel } from '@/hooks/useModels';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Package, 
  Star, 
  Calendar, 
  Download, 
  DollarSign, 
  Zap, 
  TrendingDown,
  ArrowLeft,
  CheckCircle2
} from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function ModelDetailPage({ params }: { params: { modelId: string } }) {
  const router = useRouter();
  const { data, isLoading, error } = useModel(params.modelId);
  const downloadModel = useDownloadModel();
  const [downloadComplete, setDownloadComplete] = useState(false);

  const handleDownload = async () => {
    try {
      const result = await downloadModel.mutateAsync({ modelId: params.modelId });
      
      // Open each download URL in a new tab
      const urls = result.data.download_urls;
      for (const [fileName, url] of Object.entries(urls)) {
        window.open(url as string, '_blank');
      }
      
      setDownloadComplete(true);
      setTimeout(() => setDownloadComplete(false), 3000);
    } catch (error) {
      // Error handled by mutation
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto py-8 space-y-6">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (error || !data?.success) {
    return (
      <div className="container mx-auto py-8">
        <Alert variant="destructive">
          <AlertDescription>
            Failed to load model details. {error?.message || 'Unknown error'}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const model = data.data;
  const qualityScore = model.quality_metrics.overall_score;

  return (
    <div className="container mx-auto py-8 space-y-6 max-w-5xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.push('/models')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">{model.name}</h1>
            <p className="text-gray-600 mt-1">{model.dataset?.name}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1">
            {[...Array(5)].map((_, i) => (
              <Star
                key={i}
                className={`h-5 w-5 ${
                  i < qualityScore
                    ? 'fill-yellow-400 text-yellow-400'
                    : 'text-gray-300'
                }`}
              />
            ))}
          </div>
          <Badge className="bg-blue-500 text-white">
            {model.quality_metrics.convergence_quality}
          </Badge>
        </div>
      </div>

      {/* Download Success Alert */}
      {downloadComplete && (
        <Alert className="bg-green-50 border-green-200">
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">
            Download URLs generated successfully. Model files will open in new tabs.
          </AlertDescription>
        </Alert>
      )}

      {/* Quality Metrics */}
      <Card>
        <CardHeader>
          <CardTitle>Quality Metrics</CardTitle>
          <CardDescription>Model performance assessment</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <div className="text-sm text-gray-600">Overall Score</div>
            <div className="text-2xl font-bold">{qualityScore}/5</div>
          </div>
          <div>
            <div className="text-sm text-gray-600">Convergence</div>
            <div className="text-2xl font-bold capitalize">
              {model.quality_metrics.convergence_quality}
            </div>
          </div>
          <div>
            <div className="text-sm text-gray-600">Final Loss</div>
            <div className="text-2xl font-bold">
              {model.quality_metrics.final_training_loss?.toFixed(4) || 'N/A'}
            </div>
          </div>
          <div>
            <div className="text-sm text-gray-600">Perplexity</div>
            <div className="text-2xl font-bold">
              {model.quality_metrics.perplexity?.toFixed(2) || 'N/A'}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Training Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Training Summary</CardTitle>
          <CardDescription>Training job details and performance</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex justify-between">
            <span className="text-gray-600">Epochs Completed:</span>
            <span className="font-semibold">{model.training_summary.epochs_completed}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Total Steps:</span>
            <span className="font-semibold">{model.training_summary.total_steps?.toLocaleString()}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Training Duration:</span>
            <span className="font-semibold">
              {model.training_summary.training_duration_hours?.toFixed(2)} hours
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Total Cost:</span>
            <span className="font-semibold text-green-600">
              ${model.training_summary.total_cost?.toFixed(2)}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Configuration */}
      <Card>
        <CardHeader>
          <CardTitle>Configuration</CardTitle>
          <CardDescription>Hyperparameters and GPU setup</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h4 className="font-semibold mb-2">Hyperparameters</h4>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>Learning Rate: {model.configuration.hyperparameters.learning_rate}</div>
              <div>Batch Size: {model.configuration.hyperparameters.batch_size}</div>
              <div>Epochs: {model.configuration.hyperparameters.epochs}</div>
              <div>LoRA Rank: {model.configuration.hyperparameters.rank}</div>
            </div>
          </div>
          <div>
            <h4 className="font-semibold mb-2">GPU Configuration</h4>
            <div className="text-sm">
              {model.configuration.gpu_config.count}x {model.configuration.gpu_config.type}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Model Files */}
      <Card>
        <CardHeader>
          <CardTitle>Model Files</CardTitle>
          <CardDescription>Available artifacts for download</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {Object.keys(model.artifacts).map((fileName) => (
            <div key={fileName} className="flex items-center justify-between p-3 bg-gray-50 rounded">
              <div className="flex items-center gap-2">
                <Package className="h-4 w-4 text-gray-500" />
                <span className="font-mono text-sm">{fileName}</span>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Download Button */}
      <div className="flex gap-4 sticky bottom-0 bg-white py-4 border-t">
        <Button 
          variant="outline" 
          onClick={() => router.push('/models')}
          className="flex-1"
        >
          Back to Models
        </Button>
        <Button 
          onClick={handleDownload}
          disabled={downloadModel.isPending}
          className="flex-1"
        >
          {downloadModel.isPending ? (
            <>Generating URLs...</>
          ) : (
            <>
              <Download className="h-4 w-4 mr-2" />
              Download All Files
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

