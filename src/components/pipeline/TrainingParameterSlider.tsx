/**
 * Training Parameter Slider
 * 
 * Slider component with lay-person labels and rollover tooltips
 */

'use client';

import { Info } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface SliderOption {
  value: string | number;
  display: string;
}

interface TrainingParameterSliderProps {
  id: string;
  label: string;
  description: string;
  tooltipContent: {
    explanation: string;
    lowImpact: string;
    highImpact: string;
    technicalNote?: string;
  };
  options: SliderOption[];
  value: string | number;
  onChange: (value: string | number) => void;
}

export function TrainingParameterSlider({
  id,
  label,
  description,
  tooltipContent,
  options,
  value,
  onChange,
}: TrainingParameterSliderProps) {
  const currentIndex = options.findIndex((opt) => opt.value === value);
  const currentOption = options[currentIndex] || options[Math.floor(options.length / 2)];

  const handleSliderChange = (values: number[]) => {
    const newIndex = values[0];
    if (options[newIndex]) {
      onChange(options[newIndex].value);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Label htmlFor={id} className="text-base font-medium">
            {label}
          </Label>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <button className="text-muted-foreground hover:text-foreground transition-colors">
                  <Info className="h-4 w-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right" className="max-w-sm p-4">
                <div className="space-y-2">
                  <p className="font-medium">{label}</p>
                  <p className="text-sm">{tooltipContent.explanation}</p>
                  <div className="border-t pt-2 mt-2 space-y-1 text-sm">
                    <p><strong>Lower settings:</strong> {tooltipContent.lowImpact}</p>
                    <p><strong>Higher settings:</strong> {tooltipContent.highImpact}</p>
                  </div>
                  {tooltipContent.technicalNote && (
                    <p className="text-xs text-muted-foreground italic mt-2">
                      Technical: {tooltipContent.technicalNote}
                    </p>
                  )}
                </div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        <span className="text-sm font-medium text-primary">
          {currentOption.display}
        </span>
      </div>

      <p className="text-sm text-muted-foreground">{description}</p>

      <Slider
        id={id}
        min={0}
        max={options.length - 1}
        step={1}
        value={[currentIndex >= 0 ? currentIndex : Math.floor(options.length / 2)]}
        onValueChange={handleSliderChange}
        className="w-full"
      />

      <div className="flex justify-between text-xs text-muted-foreground">
        <span>{options[0]?.display}</span>
        <span>{options[options.length - 1]?.display}</span>
      </div>
    </div>
  );
}
