/**
 * Deploy Adapter Button
 *
 * Initiates adapter deployment and shows real-time deployment status.
 * Uses useAdapterDeployment hook for automatic status polling.
 */

'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Rocket, Loader2, CheckCircle2, XCircle, AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAdapterDeployment } from '@/hooks';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface DeployAdapterButtonProps {
  jobId: string;
  disabled?: boolean;
}

const DEPLOYMENT_TIMEOUT_MS = 3 * 60 * 1000; // 3 minutes

export function DeployAdapterButton({ jobId, disabled }: DeployAdapterButtonProps) {
  const router = useRouter();
  const {
    deploy,
    isDeploying,
    bothReady,
    isControlReady,
    isAdaptedReady,
    hasAnyFailed,
    status,
    deployError,
  } = useAdapterDeployment(jobId);

  const [deployStartTime, setDeployStartTime] = useState<number | null>(null);
  const [isTimedOut, setIsTimedOut] = useState(false);

  // Track deployment start time
  useEffect(() => {
    if (isDeploying && deployStartTime === null) {
      setDeployStartTime(Date.now());
    } else if (!isDeploying) {
      setDeployStartTime(null);
      setIsTimedOut(false);
    }
  }, [isDeploying, deployStartTime]);

  // Check for timeout
  useEffect(() => {
    if (deployStartTime && !isTimedOut) {
      const timer = setTimeout(() => {
        if (Date.now() - deployStartTime > DEPLOYMENT_TIMEOUT_MS) {
          setIsTimedOut(true);
        }
      }, DEPLOYMENT_TIMEOUT_MS);

      return () => clearTimeout(timer);
    }
  }, [deployStartTime, isTimedOut]);

  const handleDeploy = async (forceRedeploy = false) => {
    try {
      setIsTimedOut(false);
      await deploy({ forceRedeploy });
    } catch (error) {
      console.error('Deploy failed:', error);
      // Error is already exposed via deployError
    }
  };

  const handleGoToTest = () => {
    router.push(`/pipeline/jobs/${jobId}/test`);
  };

  // If endpoints are ready, show "Test Adapter" button
  if (bothReady) {
    return (
      <Button onClick={handleGoToTest} className="gap-2">
        <CheckCircle2 className="h-4 w-4" />
        Test Adapter
      </Button>
    );
  }

  // If deploying, show deployment status with tooltip
  if (isDeploying || (status && (status.controlEndpoint || status.adaptedEndpoint))) {
    const isAnyDeploying = !bothReady && !hasAnyFailed;
    
    if (isAnyDeploying) {
      // If timed out, show force redeploy button
      if (isTimedOut) {
        return (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  onClick={() => handleDeploy(true)}
                  variant="outline"
                  className="gap-2 border-orange-300 text-orange-700"
                  disabled={disabled}
                >
                  <RefreshCw className="h-4 w-4" />
                  Force Redeploy
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <div className="max-w-xs text-xs">
                  Deployment taking longer than expected (3+ min).
                  <br />
                  Click to cancel and redeploy.
                </div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        );
      }

      return (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button disabled className="gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Deploying Endpoints...
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <div className="space-y-1 text-xs">
                <div>Control: {isControlReady ? '✓ Ready' : '⏳ Deploying'}</div>
                <div>Adapted: {isAdaptedReady ? '✓ Ready' : '⏳ Deploying'}</div>
                <div className="text-muted-foreground mt-2">
                  Auto-updating every 5 seconds
                </div>
                {deployStartTime && (
                  <div className="text-muted-foreground">
                    Elapsed: {Math.floor((Date.now() - deployStartTime) / 1000)}s
                  </div>
                )}
              </div>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    }
  }

  // If failed, show retry with error info
  if (hasAnyFailed) {
    const errorMsg = status?.controlEndpoint?.errorMessage || 
                     status?.adaptedEndpoint?.errorMessage;
    
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              onClick={() => handleDeploy()}
              variant="destructive"
              className="gap-2"
              disabled={disabled}
            >
              <XCircle className="h-4 w-4" />
              Retry Deployment
            </Button>
          </TooltipTrigger>
          {errorMsg && (
            <TooltipContent>
              <div className="max-w-xs text-xs">
                {errorMsg}
              </div>
            </TooltipContent>
          )}
        </Tooltip>
      </TooltipProvider>
    );
  }

  // Show error state if deployment mutation failed
  if (deployError) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              onClick={() => handleDeploy()}
              variant="outline"
              className="gap-2 border-red-300 text-red-700"
              disabled={disabled}
            >
              <AlertCircle className="h-4 w-4" />
              Deploy Failed - Retry
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <div className="max-w-xs text-xs">
              {deployError.message}
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  // Default: show deploy button
  return (
    <Button
      onClick={() => handleDeploy()}
      className="gap-2"
      disabled={disabled}
    >
      <Rocket className="h-4 w-4" />
      Deploy & Test Adapter
    </Button>
  );
}
