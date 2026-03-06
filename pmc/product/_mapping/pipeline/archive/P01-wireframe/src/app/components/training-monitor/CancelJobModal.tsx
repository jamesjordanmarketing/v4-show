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
import { Label } from '../ui/label';
import { RadioGroup, RadioGroupItem } from '../ui/radio-group';
import { AlertTriangle, DollarSign, Clock, TrendingDown } from 'lucide-react';
import type { TrainingJob } from '../../data/trainingMonitorMockData';

interface CancelJobModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void;
  job: TrainingJob;
  isCancelling: boolean;
}

export function CancelJobModal({
  isOpen,
  onClose,
  onConfirm,
  job,
  isCancelling,
}: CancelJobModalProps) {
  const [selectedReason, setSelectedReason] = useState<string>('');
  
  const reasons = [
    { id: 'cost_concern', label: 'Cost exceeding budget' },
    { id: 'poor_performance', label: 'Poor training performance/metrics' },
    { id: 'wrong_config', label: 'Incorrect configuration' },
    { id: 'no_longer_needed', label: 'No longer needed' },
    { id: 'other', label: 'Other reason' },
  ];
  
  const handleConfirm = () => {
    if (!selectedReason) return;
    onConfirm(selectedReason);
  };
  
  const handleClose = () => {
    setSelectedReason('');
    onClose();
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <AlertTriangle className="size-5 text-red-600" />
            Cancel Training Job
          </DialogTitle>
          <DialogDescription>
            Are you sure you want to cancel this training job? This action cannot be undone.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          {/* Job Summary */}
          <div className="p-4 bg-muted rounded-lg">
            <h4 className="font-semibold mb-3">Current Progress</h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-start gap-3">
                <Clock className="size-4 text-muted-foreground mt-1" />
                <div>
                  <p className="text-xs text-muted-foreground">Progress</p>
                  <p className="font-semibold">{job.progress}% Complete</p>
                  <p className="text-xs text-muted-foreground">
                    Step {job.currentMetrics.currentStep} of {job.currentMetrics.totalSteps}
                  </p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <DollarSign className="size-4 text-muted-foreground mt-1" />
                <div>
                  <p className="text-xs text-muted-foreground">Cost Incurred</p>
                  <p className="font-semibold">${job.cost.currentSpend.toFixed(2)} USD</p>
                  <p className="text-xs text-muted-foreground">
                    {job.cost.percentage}% of estimate
                  </p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <TrendingDown className="size-4 text-muted-foreground mt-1" />
                <div>
                  <p className="text-xs text-muted-foreground">Current Loss</p>
                  <p className="font-semibold">{job.currentMetrics.trainingLoss.toFixed(4)}</p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <Clock className="size-4 text-muted-foreground mt-1" />
                <div>
                  <p className="text-xs text-muted-foreground">Epoch</p>
                  <p className="font-semibold">
                    {job.currentMetrics.currentEpoch} of {job.currentMetrics.totalEpochs}
                  </p>
                </div>
              </div>
            </div>
          </div>
          
          {/* Warning */}
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-start gap-2">
              <AlertTriangle className="size-5 text-red-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-red-900 mb-1">
                  Cancellation Impact
                </p>
                <ul className="text-xs text-red-800 space-y-1">
                  <li>• Training will stop immediately and cannot be resumed</li>
                  <li>• All progress will be lost (no model checkpoint saved)</li>
                  <li>• You will still be charged for GPU time used (${job.cost.currentSpend.toFixed(2)})</li>
                  <li>• Dataset will not be affected and can be used for new training</li>
                </ul>
              </div>
            </div>
          </div>
          
          {/* Cancellation Reason */}
          <div className="space-y-3">
            <Label className="text-base font-semibold">
              Reason for Cancellation <span className="text-red-600">*</span>
            </Label>
            <RadioGroup value={selectedReason} onValueChange={setSelectedReason}>
              {reasons.map(reason => (
                <div key={reason.id} className="flex items-center space-x-3 p-3 rounded-md border hover:bg-muted/50 transition-colors">
                  <RadioGroupItem value={reason.id} id={reason.id} />
                  <Label htmlFor={reason.id} className="font-normal cursor-pointer flex-1">
                    {reason.label}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>
        </div>
        
        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={isCancelling}
          >
            Keep Training
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={!selectedReason || isCancelling}
          >
            {isCancelling ? (
              <>
                <span className="animate-spin mr-2">⏳</span>
                Cancelling...
              </>
            ) : (
              <>
                <AlertTriangle className="size-4 mr-2" />
                Confirm Cancellation
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
