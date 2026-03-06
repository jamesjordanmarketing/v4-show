import React from 'react';
import { Card } from '../ui/card';
import { Badge } from '../ui/badge';
import { Check } from 'lucide-react';
import type { TrainingPreset } from '../../data/trainingConfigMockData';

interface PresetSelectorProps {
  presets: TrainingPreset[];
  selectedPresetId: string;
  onSelectPreset: (presetId: string) => void;
  isCustom: boolean;
}

export function PresetSelector({
  presets,
  selectedPresetId,
  onSelectPreset,
  isCustom,
}: PresetSelectorProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-lg">Training Preset</h3>
          <p className="text-sm text-muted-foreground">
            Choose a preset or customize advanced settings below
          </p>
        </div>
        {isCustom && (
          <Badge variant="outline" className="bg-purple-50 border-purple-300 text-purple-700">
            Custom Configuration
          </Badge>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {presets.map(preset => {
          const isSelected = selectedPresetId === preset.id;

          return (
            <Card
              key={preset.id}
              className={`p-5 cursor-pointer transition-all hover:shadow-md ${
                isSelected
                  ? `${preset.borderColor} border-4 ${preset.bgColor}`
                  : 'border-2 hover:border-muted-foreground/30'
              }`}
              onClick={() => onSelectPreset(preset.id)}
            >
              <div className="space-y-3">
                {/* Header */}
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{preset.icon}</span>
                    <div>
                      <h4 className={`font-semibold ${preset.color}`}>
                        {preset.name}
                      </h4>
                    </div>
                  </div>
                  {isSelected && (
                    <div className={`size-6 rounded-full ${preset.bgColor} border-2 ${preset.borderColor} flex items-center justify-center`}>
                      <Check className={`size-4 ${preset.color}`} />
                    </div>
                  )}
                </div>

                {/* Description */}
                <p className="text-sm text-muted-foreground">
                  {preset.description}
                </p>

                {/* Estimates */}
                <div className="space-y-2 pt-2 border-t">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Cost:</span>
                    <span className="font-semibold">
                      ${preset.estimatedCost.min}-${preset.estimatedCost.max}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Duration:</span>
                    <span className="font-semibold">
                      {preset.estimatedDuration.min}-{preset.estimatedDuration.max}h
                    </span>
                  </div>
                </div>

                {/* Best For */}
                <div className="pt-2 border-t">
                  <p className="text-xs text-muted-foreground">
                    <span className="font-medium">Best for:</span> {preset.bestFor}
                  </p>
                </div>

                {/* Key Parameters */}
                {isSelected && (
                  <div className="pt-2 border-t space-y-1">
                    <p className="text-xs font-medium text-muted-foreground">
                      Configuration:
                    </p>
                    <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
                      <div>
                        <span className="text-muted-foreground">Rank:</span>{' '}
                        <span className="font-medium">{preset.config.loraRank}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">LR:</span>{' '}
                        <span className="font-medium">{preset.config.learningRate}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Epochs:</span>{' '}
                        <span className="font-medium">{preset.config.numEpochs}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Batch:</span>{' '}
                        <span className="font-medium">{preset.config.batchSize}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
