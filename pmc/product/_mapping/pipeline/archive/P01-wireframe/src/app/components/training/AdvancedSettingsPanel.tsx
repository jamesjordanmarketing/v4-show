import React from 'react';
import { Card } from '../ui/card';
import { Label } from '../ui/label';
import { Input } from '../ui/input';
import { Slider } from '../ui/slider';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { RadioGroup, RadioGroupItem } from '../ui/radio-group';
import { Badge } from '../ui/badge';
import { HelpCircle } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '../ui/tooltip';
import type { HyperparameterConfig, GPUConfig } from '../../data/trainingConfigMockData';
import { BATCH_SIZE_OPTIONS, MAX_SEQ_LENGTH_OPTIONS, GPU_OPTIONS } from '../../data/trainingConfigMockData';

interface AdvancedSettingsPanelProps {
  config: HyperparameterConfig;
  gpuConfig: GPUConfig;
  onConfigChange: (config: HyperparameterConfig) => void;
  onGPUConfigChange: (gpuConfig: GPUConfig) => void;
}

export function AdvancedSettingsPanel({
  config,
  gpuConfig,
  onConfigChange,
  onGPUConfigChange,
}: AdvancedSettingsPanelProps) {
  const updateConfig = (field: keyof HyperparameterConfig, value: any) => {
    onConfigChange({ ...config, [field]: value });
  };

  const updateGPUConfig = (field: keyof GPUConfig, value: any) => {
    onGPUConfigChange({ ...gpuConfig, [field]: value });
  };

  return (
    <div className="space-y-6">
      {/* Hyperparameters Section */}
      <Card className="p-6">
        <h3 className="font-semibold text-lg mb-4">Hyperparameters</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* LoRA Rank */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-1">
                LoRA Rank (r)
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <HelpCircle className="size-3 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      <p className="text-xs">
                        Higher rank = more model capacity and better quality, but slower training
                        and higher memory usage. Start with 8-16 for most use cases.
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </Label>
              <Badge variant="outline">{config.loraRank}</Badge>
            </div>
            <Slider
              value={[config.loraRank]}
              onValueChange={([value]) => updateConfig('loraRank', value)}
              min={4}
              max={64}
              step={4}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>4 (faster)</span>
              <span>64 (more capacity)</span>
            </div>
          </div>

          {/* LoRA Alpha */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-1">
                LoRA Alpha
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <HelpCircle className="size-3 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      <p className="text-xs">
                        Scaling factor for LoRA updates. Typically set to 2× the rank value.
                        Higher values make LoRA updates more prominent.
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </Label>
              <Badge variant="outline">{config.loraAlpha}</Badge>
            </div>
            <Slider
              value={[config.loraAlpha]}
              onValueChange={([value]) => updateConfig('loraAlpha', value)}
              min={8}
              max={128}
              step={8}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>8</span>
              <span>128</span>
            </div>
          </div>

          {/* LoRA Dropout */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-1">
                LoRA Dropout
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <HelpCircle className="size-3 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      <p className="text-xs">
                        Dropout probability for LoRA layers. Helps prevent overfitting.
                        0.05 is a good default for most use cases.
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </Label>
              <Badge variant="outline">{config.loraDropout.toFixed(2)}</Badge>
            </div>
            <Slider
              value={[config.loraDropout * 100]}
              onValueChange={([value]) => updateConfig('loraDropout', value / 100)}
              min={0}
              max={20}
              step={1}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>0.00</span>
              <span>0.20</span>
            </div>
          </div>

          {/* Num Epochs */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-1">
                Number of Epochs
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <HelpCircle className="size-3 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      <p className="text-xs">
                        Number of complete passes through the training dataset.
                        More epochs = longer training and potentially better results.
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </Label>
              <Badge variant="outline">{config.numEpochs}</Badge>
            </div>
            <Slider
              value={[config.numEpochs]}
              onValueChange={([value]) => updateConfig('numEpochs', value)}
              min={1}
              max={10}
              step={1}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>1 epoch</span>
              <span>10 epochs</span>
            </div>
          </div>

          {/* Batch Size */}
          <div className="space-y-2">
            <Label className="flex items-center gap-1">
              Batch Size
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <HelpCircle className="size-3 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    <p className="text-xs">
                      Number of examples processed together. Larger batch sizes train faster
                      but require more memory.
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </Label>
            <Select
              value={config.batchSize.toString()}
              onValueChange={(value) => updateConfig('batchSize', parseInt(value))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {BATCH_SIZE_OPTIONS.map(size => (
                  <SelectItem key={size} value={size.toString()}>
                    {size}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Learning Rate */}
          <div className="space-y-2">
            <Label className="flex items-center gap-1">
              Learning Rate
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <HelpCircle className="size-3 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    <p className="text-xs">
                      Controls how quickly the model adapts. Use scientific notation (e.g., 2e-4).
                      Lower values = slower, more stable training.
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </Label>
            <Input
              type="text"
              value={config.learningRate}
              onChange={(e) => updateConfig('learningRate', e.target.value)}
              placeholder="e.g., 2e-4"
            />
          </div>

          {/* Warmup Ratio */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-1">
                Warmup Ratio
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <HelpCircle className="size-3 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      <p className="text-xs">
                        Fraction of training spent gradually increasing learning rate.
                        Helps stabilize early training.
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </Label>
              <Badge variant="outline">{config.warmupRatio.toFixed(2)}</Badge>
            </div>
            <Slider
              value={[config.warmupRatio * 100]}
              onValueChange={([value]) => updateConfig('warmupRatio', value / 100)}
              min={0}
              max={10}
              step={1}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>0.00</span>
              <span>0.10</span>
            </div>
          </div>

          {/* Max Sequence Length */}
          <div className="space-y-2">
            <Label className="flex items-center gap-1">
              Max Sequence Length
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <HelpCircle className="size-3 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    <p className="text-xs">
                      Maximum number of tokens per training example. Longer sequences
                      require more memory. 2048 is typical for conversation models.
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </Label>
            <Select
              value={config.maxSeqLength.toString()}
              onValueChange={(value) => updateConfig('maxSeqLength', parseInt(value))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MAX_SEQ_LENGTH_OPTIONS.map(length => (
                  <SelectItem key={length} value={length.toString()}>
                    {length} tokens
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </Card>

      {/* GPU Configuration Section */}
      <Card className="p-6">
        <h3 className="font-semibold text-lg mb-4">GPU Configuration</h3>
        <div className="space-y-6">
          {/* GPU Type */}
          <div className="space-y-3">
            <Label>GPU Type</Label>
            <RadioGroup
              value={gpuConfig.type}
              onValueChange={(value) => updateGPUConfig('type', value)}
            >
              {GPU_OPTIONS.map(gpu => (
                <div key={gpu.id} className="flex items-center space-x-2">
                  <RadioGroupItem value={gpu.id} id={gpu.id} />
                  <Label htmlFor={gpu.id} className="font-normal cursor-pointer flex items-center gap-2">
                    {gpu.name} ({gpu.vram})
                    {gpu.recommended && (
                      <Badge variant="default" className="bg-blue-500">
                        Recommended
                      </Badge>
                    )}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>

          {/* Instance Type */}
          <div className="space-y-3">
            <Label>Instance Type</Label>
            <RadioGroup
              value={gpuConfig.instanceType}
              onValueChange={(value: 'spot' | 'on-demand') => updateGPUConfig('instanceType', value)}
            >
              <div className="flex items-start space-x-2 p-3 border rounded-md">
                <RadioGroupItem value="spot" id="spot" />
                <div className="flex-1">
                  <Label htmlFor="spot" className="font-normal cursor-pointer flex items-center gap-2">
                    Spot Instance
                    <Badge variant="default" className="bg-green-500">
                      ~70% Savings
                    </Badge>
                  </Label>
                  <p className="text-xs text-muted-foreground mt-1">
                    ${gpuConfig.spotRate}/hr • May be interrupted • Auto-resume from checkpoints
                  </p>
                </div>
              </div>
              <div className="flex items-start space-x-2 p-3 border rounded-md">
                <RadioGroupItem value="on-demand" id="on-demand" />
                <div className="flex-1">
                  <Label htmlFor="on-demand" className="font-normal cursor-pointer">
                    On-Demand Instance
                  </Label>
                  <p className="text-xs text-muted-foreground mt-1">
                    ${gpuConfig.onDemandRate}/hr • Guaranteed availability • No interruptions
                  </p>
                </div>
              </div>
            </RadioGroup>
          </div>

          {/* Max Duration */}
          <div className="space-y-2">
            <Label className="flex items-center gap-1">
              Maximum Duration (hours)
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <HelpCircle className="size-3 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    <p className="text-xs">
                      Training will automatically stop after this duration if not completed.
                      Set higher than your estimated duration.
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </Label>
            <Input
              type="number"
              value={gpuConfig.maxDuration}
              onChange={(e) => updateGPUConfig('maxDuration', parseInt(e.target.value) || 24)}
              min={1}
              max={72}
            />
          </div>
        </div>
      </Card>
    </div>
  );
}
