import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '../ui/dialog';
import { Button } from '../ui/button';
import { Checkbox } from '../ui/checkbox';
import { Label } from '../ui/label';
import { Separator } from '../ui/separator';
import { Badge } from '../ui/badge';
import { AlertTriangle, Rocket, DollarSign, Clock, Database } from 'lucide-react';
import type { Dataset } from '../../data/datasetMockData';
import type { TrainingPreset, HyperparameterConfig, GPUConfig, CostBreakdown } from '../../data/trainingConfigMockData';

interface LaunchConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  dataset: Dataset;
  preset: TrainingPreset | null;
  config: HyperparameterConfig;
  gpuConfig: GPUConfig;
  costBreakdown: CostBreakdown;
  isCustom: boolean;
  isLaunching: boolean;
}

export function LaunchConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  dataset,
  preset,
  config,
  gpuConfig,
  costBreakdown,
  isCustom,
  isLaunching,
}: LaunchConfirmationModalProps) {
  const [acknowledged, setAcknowledged] = useState(false);

  const handleConfirm = () => {
    if (!acknowledged) return;
    onConfirm();
  };

  const handleClose = () => {
    setAcknowledged(false);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Rocket className="size-5 text-blue-600" />
            Confirm Training Launch
          </DialogTitle>
          <DialogDescription>
            Review your configuration before starting the training job
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Dataset Summary */}
          <div className="p-4 bg-muted rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Database className="size-4 text-muted-foreground" />
              <h4 className="font-semibold text-sm">Dataset</h4>
            </div>
            <p className="font-medium">{dataset.name}</p>
            <p className="text-sm text-muted-foreground">
              {dataset.totalTrainingPairs.toLocaleString()} training pairs • Quality: {dataset.qualityScore.toFixed(1)}/5.0
            </p>
          </div>

          {/* Configuration Summary */}
          <div className="p-4 bg-muted rounded-lg">
            <h4 className="font-semibold text-sm mb-3">Configuration</h4>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-xs text-muted-foreground">Preset</p>
                <div className="flex items-center gap-2">
                  <p className="font-medium">
                    {preset?.name || 'Custom'}
                  </p>
                  {isCustom && (
                    <Badge variant="outline" className="text-xs">
                      Custom
                    </Badge>
                  )}
                </div>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">GPU</p>
                <p className="font-medium">H100 PCIe (80GB)</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">LoRA Rank</p>
                <p className="font-medium">{config.loraRank}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Learning Rate</p>
                <p className="font-medium">{config.learningRate}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Epochs</p>
                <p className="font-medium">{config.numEpochs}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Batch Size</p>
                <p className="font-medium">{config.batchSize}</p>
              </div>
            </div>
          </div>

          <Separator />

          {/* Cost & Duration */}
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <DollarSign className="size-4 text-blue-600" />
                <p className="text-sm font-medium text-blue-900">Estimated Cost</p>
              </div>
              <p className="text-2xl font-bold text-blue-600">
                ${costBreakdown.total.min}-${costBreakdown.total.max}
              </p>
              <p className="text-xs text-blue-700 mt-1">
                ${costBreakdown.hourlyRate}/hr ({gpuConfig.instanceType === 'spot' ? 'Spot' : 'On-Demand'})
              </p>
            </div>

            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="size-4 text-green-600" />
                <p className="text-sm font-medium text-green-900">Estimated Duration</p>
              </div>
              <p className="text-2xl font-bold text-green-600">
                {costBreakdown.duration.min}-{costBreakdown.duration.max}h
              </p>
              <p className="text-xs text-green-700 mt-1">
                Includes preprocessing & validation
              </p>
            </div>
          </div>

          {/* Spot Instance Warning */}
          {gpuConfig.instanceType === 'spot' && (
            <div className="p-4 bg-yellow-50 border border-yellow-300 rounded-lg">
              <div className="flex items-start gap-3">
                <AlertTriangle className="size-5 text-yellow-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-sm text-yellow-900 mb-1">
                    Spot Instance Notice
                  </p>
                  <p className="text-xs text-yellow-800">
                    Spot instances may be interrupted if demand increases. Your training will
                    automatically resume from the last checkpoint with no data loss. This is
                    normal and expected for spot instances.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Acknowledgment */}
          <div className="flex items-start space-x-3 p-4 border-2 border-blue-200 rounded-lg bg-blue-50/50">
            <Checkbox
              id="acknowledge"
              checked={acknowledged}
              onCheckedChange={(checked) => setAcknowledged(checked === true)}
              className="mt-0.5"
            />
            <div className="flex-1">
              <Label
                htmlFor="acknowledge"
                className="text-sm font-medium cursor-pointer leading-tight"
              >
                I understand the costs and have approved the budget for this training job
              </Label>
              <p className="text-xs text-muted-foreground mt-1">
                You will be charged based on actual GPU time used
              </p>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={isLaunching}
          >
            Go Back
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!acknowledged || isLaunching}
            className="bg-green-600 hover:bg-green-700"
          >
            {isLaunching ? (
              <>
                <span className="animate-spin mr-2">⏳</span>
                Launching...
              </>
            ) : (
              <>
                <Rocket className="size-4 mr-2" />
                Confirm & Start Training
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
