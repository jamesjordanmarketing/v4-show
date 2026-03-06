/**
 * Endpoint Status Banner
 *
 * Displays deployment status for Control and Adapted endpoints
 * with real-time updates via polling.
 */

'use client';

import { CheckCircle2, Loader2, XCircle, Server, Clock } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { type InferenceEndpoint, type EndpointStatus } from '@/hooks';

interface EndpointStatusBannerProps {
  controlEndpoint: InferenceEndpoint | null;
  adaptedEndpoint: InferenceEndpoint | null;
  bothReady: boolean;
}

function StatusIcon({ status }: { status: EndpointStatus | undefined }) {
  switch (status) {
    case 'ready':
      return <CheckCircle2 className="h-4 w-4 text-green-500" />;
    case 'deploying':
    case 'pending':
      return <Loader2 className="h-4 w-4 animate-spin text-yellow-500" />;
    case 'failed':
      return <XCircle className="h-4 w-4 text-red-500" />;
    case 'terminated':
      return <Server className="h-4 w-4 text-gray-400" />;
    default:
      return <Server className="h-4 w-4 text-muted-foreground" />;
  }
}

function StatusBadge({ status }: { status: EndpointStatus | undefined }) {
  const variants: Record<EndpointStatus, 'default' | 'secondary' | 'destructive' | 'outline'> = {
    ready: 'default',
    deploying: 'secondary',
    pending: 'outline',
    failed: 'destructive',
    terminated: 'outline',
  };

  return (
    <Badge variant={variants[status || 'pending']} className="capitalize">
      {status || 'Unknown'}
    </Badge>
  );
}

export function EndpointStatusBanner({
  controlEndpoint,
  adaptedEndpoint,
  bothReady,
}: EndpointStatusBannerProps) {
  const anyFailed = controlEndpoint?.status === 'failed' || adaptedEndpoint?.status === 'failed';
  const controlReady = controlEndpoint?.status === 'ready';
  const adaptedReady = adaptedEndpoint?.status === 'ready';
  
  // Calculate progress (0-100)
  const progress = bothReady ? 100 : 
                   (controlReady && adaptedReady ? 100 :
                    controlReady || adaptedReady ? 50 : 
                    25);

  // Both ready - success state
  if (bothReady) {
    return (
      <Alert className="bg-green-50 border-green-200 dark:bg-green-950 dark:border-green-800">
        <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
        <AlertTitle className="text-green-800 dark:text-green-300">
          Endpoints Ready
        </AlertTitle>
        <AlertDescription className="text-green-700 dark:text-green-400">
          Both inference endpoints are deployed and ready for testing.
        </AlertDescription>
      </Alert>
    );
  }

  // Any failed - error state
  if (anyFailed) {
    const errorMsg = controlEndpoint?.errorMessage || adaptedEndpoint?.errorMessage;
    
    return (
      <Alert variant="destructive">
        <XCircle className="h-4 w-4" />
        <AlertTitle>Deployment Failed</AlertTitle>
        <AlertDescription>
          <p className="mb-2">
            {errorMsg || 'One or more endpoints failed to deploy. Please try again.'}
          </p>
          <div className="mt-3 space-y-1 text-xs">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <StatusIcon status={controlEndpoint?.status} />
                Control Endpoint
              </span>
              <StatusBadge status={controlEndpoint?.status} />
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <StatusIcon status={adaptedEndpoint?.status} />
                Adapted Endpoint
              </span>
              <StatusBadge status={adaptedEndpoint?.status} />
            </div>
          </div>
        </AlertDescription>
      </Alert>
    );
  }

  // Deploying - progress state
  return (
    <Alert>
      <Loader2 className="h-4 w-4 animate-spin" />
      <AlertTitle>Deploying Endpoints</AlertTitle>
      <AlertDescription>
        <div className="space-y-3">
          {/* Progress bar */}
          <Progress value={progress} className="h-2" />
          
          {/* Endpoint statuses */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-sm">
                <StatusIcon status={controlEndpoint?.status} />
                Control Endpoint
              </span>
              <StatusBadge status={controlEndpoint?.status} />
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-sm">
                <StatusIcon status={adaptedEndpoint?.status} />
                Adapted Endpoint
              </span>
              <StatusBadge status={adaptedEndpoint?.status} />
            </div>
          </div>
          
          {/* Time estimate */}
          <div className="flex items-center gap-2 text-xs text-muted-foreground mt-3 pt-3 border-t">
            <Clock className="h-3 w-3" />
            <span>
              Cold start typically takes 30-60 seconds. 
              This page updates automatically every 5 seconds.
            </span>
          </div>
        </div>
      </AlertDescription>
    </Alert>
  );
}
