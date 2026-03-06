'use client';

import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { cn } from '@/lib/utils';
import type { RAGQueryMode } from '@/types/rag';

interface ModeSelectorProps {
  value: RAGQueryMode;
  onChange: (mode: RAGQueryMode) => void;
  disabledModes?: RAGQueryMode[];
}

const modeOptions: Array<{ value: RAGQueryMode; label: string; description: string }> = [
  { value: 'rag_only', label: 'RAG', description: 'Document knowledge only' },
  { value: 'lora_only', label: 'LoRA', description: 'Fine-tuned model only' },
  { value: 'rag_and_lora', label: 'RAG + LoRA', description: 'Combined approach' },
];

export function ModeSelector({ value, onChange, disabledModes = [] }: ModeSelectorProps) {
  return (
    <div className="space-y-1">
      <p className="text-xs font-medium text-muted-foreground">Query Mode</p>
      <ToggleGroup
        type="single"
        value={value}
        onValueChange={(v) => {
          if (v && !disabledModes.includes(v as RAGQueryMode)) {
            onChange(v as RAGQueryMode);
          }
        }}
        className="justify-start"
      >
        {modeOptions.map((opt) => {
          const isDisabled = disabledModes.includes(opt.value);
          return (
            <ToggleGroupItem
              key={opt.value}
              value={opt.value}
              disabled={isDisabled}
              className={cn(
                'text-xs px-3',
                isDisabled && 'opacity-40 cursor-not-allowed'
              )}
              title={
                isDisabled
                  ? 'Not available — missing adapter or documents'
                  : opt.description
              }
            >
              {opt.label}
            </ToggleGroupItem>
          );
        })}
      </ToggleGroup>
    </div>
  );
}
